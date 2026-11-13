import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {AUDIT_FIELDS} from './audit-reference-evidence.mjs';
import {TARGET_IDS,timestamp} from './pilot-contract.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const REVIEW='data/pilot/evidence-audit/source-review-2026-11-13.json';
const HISTORY='data/pilot/evidence-audit/source-history';
const MATRIX='docs/evidence-audit/TASK_24_MATRIX.md';
const HOSTS=new Set(['nbs.sk','www.nbs.sk','www.mint.sk','www.ecb.europa.eu','eur-lex.europa.eu','economy-finance.ec.europa.eu','static.slov-lex.sk','www.bundesbank.de']);
export const digest=x=>createHash('sha256').update(x).digest('hex');
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const text=x=>typeof x==='string'&&x.trim().length>0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bytes=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const values=x=>JSON.stringify(x).normalize('NFC');
const sourceDate=x=>timestamp(x)||(typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&timestamp(x+'T00:00:00Z'));
const escape=x=>String(x??'—').replaceAll('|','\\|').replaceAll('\n',' ');
export function sourceURL(value){
  const u=new URL(value);
  if(u.protocol!=='https:'||!HOSTS.has(u.hostname)||u.username||u.password||u.port||u.hash)throw Error('source_url_forbidden');
  return u.href;
}

export function validateReview(review,baseline){
  const errors=[];
  if(review?.schema_version!=='1.0'||!timestamp(review?.obtained_at)||review?.production_promotions!==0||review?.ready_for_physical_pilot!==false)errors.push('review_metadata');
  if(!same(review?.baseline,baseline))errors.push('baseline_integrity');
  const sources=Array.isArray(review?.sources)?review.sources:[],claims=Array.isArray(review?.claims)?review.claims:[];
  const ids=new Set(),urls=new Set(),claimIDs=new Set();
  for(const s of sources){
    try{sourceURL(s.url);}catch{errors.push('source_url_forbidden');}
    if(!text(s.id)||ids.has(s.id)||urls.has(s.url))errors.push('source_duplicate');ids.add(s.id);urls.add(s.url);
    if(!text(s.title)||!text(s.publisher)||!sourceDate(s.obtained_at)||Date.parse(s.obtained_at)>Date.parse(review.obtained_at)||!text(s.lineage)||!text(s.lineage_basis)||!['conservative','approved'].includes(s.lineage_review?.status)||!['web_text_reviewed','web_pdf_text_reviewed','metadata_only','index_excerpt_only','blocked_challenge','inherited_audit'].includes(s.access))errors.push('source_metadata');
    if(s.lineage_review?.status==='approved'&&(!text(s.lineage_review.reviewer)||!timestamp(s.lineage_review.reviewed_at)||!hash(s.lineage_review.evidence_sha256)))errors.push('independence_dossier_missing');
    if(!text(s.rights?.status)||!text(s.rights?.restrictions)||s.rights?.public_original_release!==false)errors.push('source_rights');
    if(s.snapshot_sha256!==null&&!hash(s.snapshot_sha256))errors.push('source_snapshot');
    if(s.snapshot_sha256!==null&&['index_excerpt_only','blocked_challenge'].includes(s.access))errors.push('snippet_is_not_original');
    if(!Array.isArray(s.markers)||!s.markers.length||s.markers.some(x=>!text(x)))errors.push('source_markers');
  }
  for(const c of claims){
    const s=sources.find(s=>s.id===c?.source_id);
    if(!text(c?.id)||claimIDs.has(c.id))errors.push('claim_duplicate');claimIDs.add(c?.id);
    if(!s||!['prescribed_design','nominal_specification','issue_population','set_context','specimen','common_side'].includes(c?.scope)||!text(c?.locator)||!text(c?.limitation)||!Array.isArray(c?.fields)||!c.fields.length||c.fields.some(f=>![...AUDIT_FIELDS,'common_motif'].includes(f)||!Object.hasOwn(c.values??{},f))||!object(c?.applies_to)||Object.keys(c.applies_to).some(k=>!['date','denomination'].includes(k)))errors.push('claim_metadata');
    if(Object.entries(c?.applies_to??{}).some(([k,v])=>Object.hasOwn(c?.values??{},k)&&c.values[k]!==v))errors.push('claim_scope_mismatch');
    if(c?.fields?.some(f=>f.startsWith('physical.')&&(typeof c.values[f]!=='number'||!Number.isFinite(c.values[f])||c.values[f]<=0)))errors.push('numeric_claim_required');
    if(c?.scope==='specimen'&&(!text(c.specimen_id)||!hash(c.snapshot_sha256)||!['2019','2020','2021'].includes(c.applies_to?.date)||!['1 cent','2 cent','5 cent'].includes(c.applies_to?.denomination)))errors.push('specimen_proof_missing');
    if(s&&['blocked_challenge','metadata_only'].includes(s.access))errors.push('unread_source_claim');
    if(c?.review?.status==='approved'&&(!text(c.review.reviewer)||!timestamp(c.review.reviewed_at)))errors.push('invented_approval');
  }
  return {valid:errors.length===0,errors:[...new Set(errors)]};
}

// These classifications apply to evidence only. This module has no catalogue,
// production-reference, identification or valuation write operation.
export function assessCell(field,candidate,review,probes=[]){
  const claims=review.claims.filter(c=>c.fields.includes(field)&&Object.entries(c.applies_to).every(([k,v])=>candidate[k]===v));
  const conflicts=[];
  for(const scope of new Set(claims.map(c=>c.scope))){
    const group=claims.filter(c=>c.scope===scope);
    if(new Set(group.map(c=>values(c.values[field]))).size>1)conflicts.push(scope);
  }
  const exact=claims.filter(c=>{
    const s=review.sources.find(s=>s.id===c.source_id);
    return c.scope==='specimen'&&c.review?.status==='approved'&&s?.lineage_review?.status==='approved'&&hash(c.snapshot_sha256)&&s.snapshot_sha256===c.snapshot_sha256&&probes.some(p=>p.source_id===s.id&&p.state==='available'&&p.archive_sha256===c.snapshot_sha256);
  });
  const expected=field.split('.').reduce((v,k)=>v?.[k],candidate);
  if(expected!=null&&exact.some(c=>!same(c.values[field],expected)))conflicts.push('specimen_target_mismatch');
  const lineages=[...new Set(exact.map(c=>review.sources.find(s=>s.id===c.source_id).lineage))];
  const quorum=lineages.length>=2&&new Set(exact.map(c=>c.snapshot_sha256)).size>=2&&exact.every(c=>c.specimen_id===exact[0].specimen_id);
  return {status:conflicts.length?'CONFLICT':quorum?'VERIFIED EVIDENCE':claims.length?'PARTIALLY VERIFIED':'UNVERIFIED',exact_variant_status:'UNVERIFIED',claim_ids:claims.map(c=>c.id),independent_specimen_lineages:lineages,conflict_scopes:conflicts,provisional_conflict:conflicts.length>0&&claims.some(c=>review.sources.find(s=>s.id===c.source_id)?.access==='index_excerpt_only')};
}

export function matrixFor(review,pilot,probes=[]){
  const counts=Object.fromEntries(['VERIFIED EVIDENCE','PARTIALLY VERIFIED','UNVERIFIED','CONFLICT'].map(k=>[k,0]));
  const variants=TARGET_IDS.map(id=>{
    const candidate=pilot.records.find(r=>r.catalogue_id===id);
    if(!candidate)throw Error('pilot_variant_missing');
    const fields=Object.fromEntries(AUDIT_FIELDS.map(field=>{const cell=assessCell(field,candidate,review,probes);counts[cell.status]++;return [field,cell];}));
    return {catalogue_id:id,verification_state:'needs_reference_review',fields};
  });
  return {schema_version:'1.0',obtained_at:review.obtained_at,counts,variants,production_promotions:0,identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
}

export function privateVault(dir,repo=ROOT){
  const target=path.resolve(dir),relative=path.relative(path.resolve(repo),target);
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('archive_must_be_outside_repository');
  fs.mkdirSync(target,{recursive:true,mode:0o700});
  if(process.platform==='win32'||fs.realpathSync(target)!==target||(fs.statSync(target).mode&0o077)!==0)throw Error('private_vault_required');
  return target;
}
function privateObject(vault,sha){
  if(!hash(sha))throw Error('invalid_archive_digest');
  const file=path.join(vault,sha+'.bin');
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw Error('unsafe_archive_file');
  return file;
}
export function verifyArchive(vault,sha){
  try{return digest(fs.readFileSync(privateObject(privateVault(vault),sha)))===sha;}catch{return false;}
}
function saveArchive(vault,body){
  const sha=digest(body),file=path.join(vault,sha+'.bin');
  try{fs.writeFileSync(file,body,{flag:'wx',mode:0o600});}
  catch(e){if(e.code!=='EEXIST'||!verifyArchive(vault,sha))throw Error('archive_integrity_failure');}
  return sha;
}

// curl preserves the managed environment's proxy and CA settings. No redirect,
// retry, credentials, cookies, JS execution or challenge solver is enabled.
export function curlTransport(url){
  sourceURL(url);
  const r=spawnSync('curl',['--globoff','--silent','--show-error','--max-time','20','--max-filesize','8388608','--proto','=https','--dump-header','-','--write-out','\n%{http_code}',url],{encoding:null,maxBuffer:9*1024*1024});
  const output=r.stdout??Buffer.alloc(0),last=output.lastIndexOf(10);
  const status=Number(output.subarray(last+1).toString()),packet=output.subarray(0,last);
  let offset=0,header='',connect_status=null;
  while(packet.subarray(offset,offset+5).toString()==='HTTP/'){
    const end=packet.indexOf('\r\n\r\n',offset);if(end<0)break;
    header=packet.subarray(offset,end).toString();offset=end+4;
    if(/connection established/i.test(header))continue;
    if(!status&&/403/.test(header.split('\n')[0]))connect_status=403;
    break;
  }
  return {status:Number.isFinite(status)?status:0,connect_status,exit_code:r.status??1,type:/^content-type:\s*([^;\r\n]+)/im.exec(header)?.[1]?.toLowerCase()??null,body:packet.subarray(offset),redirect:status>=300&&status<400};
}
export async function probeSource(source,{vault,transport=curlTransport,previous=null}={}){
  sourceURL(source.url);const root=privateVault(vault);
  let response;try{response=await transport(source.url);}catch{return {source_id:source.id,state:'transport_failure',http_status:0,archive_sha256:null};}
  const {status,type,exit_code=0,connect_status=null}=response;
  const body=Buffer.isBuffer(response.body)?response.body:Buffer.from(response.body??'');
  let state;
  if(exit_code||!status)state='transport_failure';
  else if(status===404||status===410)state='invalid_link';
  else if(status>=300&&status<400)state='redirect_review_required';
  else if([401,403,429].includes(status))state='access_restricted';
  else if(status<200||status>=300)state='http_failure';
  else if(body.length===0||body.length>8388608)state='invalid_size';
  else if(!['text/html','text/plain','application/pdf'].includes(type))state='unsupported_content';
  else if(/verify that you.?re not a robot|captcha|access denied|just a moment|sign in to continue/i.test(body.subarray(0,65536).toString()))state='challenge_or_login';
  else if(type==='application/pdf'?!body.subarray(0,5).equals(Buffer.from('%PDF-')):!source.markers.every(m=>body.toString().normalize('NFC').toLowerCase().includes(m.normalize('NFC').toLowerCase())))state='content_review_required';
  else state='available';
  const archive_sha256=state==='available'?saveArchive(root,body):null;
  return {source_id:source.id,state,http_status:status,connect_status,exit_code,content_type:type,archive_sha256,content_changed:archive_sha256!==null&&previous?.archive_sha256!=null&&previous.archive_sha256!==archive_sha256,automatic_public_release:false};
}

export function validateHistory(entries,baseline){
  let previous=digest(bytes(baseline));const errors=[];let date='';
  for(const {raw,event} of entries){
    if(event.schema_version!=='1.0'||event.parent_sha256!==previous||!timestamp(event.checked_at)||event.checked_at<date||Date.parse(event.checked_at)<Date.parse(event.review?.obtained_at)||event.review_sha256!==digest(bytes(event.review))||!validateReview(event.review,baseline).valid)errors.push('history_integrity');
    const sources=event.review?.sources??[],probes=event.probes??[];
    if(probes.length!==sources.length||new Set(probes.map(p=>p.source_id)).size!==sources.length||probes.some(p=>!sources.some(s=>s.id===p.source_id)||!['available','transport_failure','invalid_link','redirect_review_required','access_restricted','http_failure','invalid_size','unsupported_content','challenge_or_login','content_review_required'].includes(p.state)||((p.state==='available')!==hash(p.archive_sha256))||p.automatic_public_release===true))errors.push('history_probe_invalid');
    previous=digest(raw);date=event.checked_at;
  }
  return {valid:errors.length===0,errors:[...new Set(errors)]};
}
export function appendEvent(dir,event){
  fs.mkdirSync(dir,{recursive:true});
  const name=event.checked_at.replaceAll(':','-')+'.json';
  fs.writeFileSync(path.join(dir,name),bytes(event),{flag:'wx'});
  return name;
}
export function renderMatrix(review,matrix,probes=[]){
  const lines=['# Úloha #24 – aktualizácia dôkazov 9 × 17','',`Získanie poznámok: ${review.obtained_at} (UTC). Dátum používateľského reportu: 13. 11. 2026, Europe/Bratislava.`,'','**NOT READY / 0 schválených referencií.** Statusy patria dôkazom, nie identite mince. PARTIALLY VERIFIED znamená iba kontext, nie overený exemplár. CONFLICT zahŕňa aj predbežný rozpor z indexu; treba originál a odborné vyriešenie. Každý exact_variant_status zostáva UNVERIFIED.','',`Počty buniek: ${Object.entries(matrix.counts).map(([k,v])=>`${k}: ${v}`).join('; ')}.`, '', 'Historický audit #21 sa nemení. Tento doplnok je generovaný `npm run sources:check -- --write` z metadát a histórie; originály sa nikdy nevkladajú do Git repozitára.','', '## Aktuálna matica','', '| Variant | '+AUDIT_FIELDS.join(' | ')+' |','| --- | '+AUDIT_FIELDS.map(()=>'---').join(' | ')+' |'];
  const labels={'VERIFIED EVIDENCE':'V','PARTIALLY VERIFIED':'P','UNVERIFIED':'U','CONFLICT':'C'};
  for(const row of matrix.variants)lines.push(`| ${row.catalogue_id} | ${AUDIT_FIELDS.map(f=>labels[row.fields[f].status]).join(' | ')} |`);
  lines.push('','Legenda: V = VERIFIED EVIDENCE; P = PARTIALLY VERIFIED; U = UNVERIFIED; C = CONFLICT. Pole country_code nemá samostatne doložené priradenie ISO k exempláru.','', '## Konkrétne tvrdenia a rozsah','', '| ID | Zdroj | Rozsah / použiteľnosť | Doložené hodnoty | Lokátor a medzera |','| --- | --- | --- | --- | --- |');
  for(const c of review.claims)lines.push(`| ${c.id} | ${c.source_id} | ${c.scope}; ${escape(JSON.stringify(c.applies_to))} | ${escape(JSON.stringify(c.values))} | ${escape(c.locator)}; ${escape(c.limitation)} |`);
  lines.push('','## Register získaných a zdedených podkladov','');
  for(const s of review.sources){const p=probes.find(p=>p.source_id===s.id);lines.push(`### ${s.id}`,'',`- [${s.title}](${s.url}); vydavateľ: ${s.publisher}; získanie: ${s.obtained_at}; prístup: ${s.access}.`, `- Pôvod: ${s.lineage}; ${s.lineage_basis}.`, `- Práva: ${s.rights.status}; ${s.rights.restrictions}${s.rights.url?` [Podmienky](${s.rights.url}).`:''}`, `- Priamy probe: ${p?.state??'not_recorded'}; HTTP ${p?.http_status??'—'}; proxy CONNECT ${p?.connect_status??'—'}; originálny SHA-256: ${p?.archive_sha256??'NEZÍSKANÝ'}.`,'');}
  lines.push('## Medzery každého variantu','');
  for(const row of matrix.variants){lines.push(`### ${row.catalogue_id}`,'','| Pole | Stav dôkazu | Tvrdenia | Otvorený problém |','| --- | --- | --- | --- |');for(const f of AUDIT_FIELDS){const c=row.fields[f];lines.push(`| ${f} | ${c.status} | ${c.claim_ids.join(', ')||'—'} | ${c.provisional_conflict?'Predbežný rozdiel indexu a čítaného zdroja; originál a odborné vyriešenie.':c.status==='CONFLICT'?'Rozporné tvrdenia; žiadny automatický výber hodnoty.':'Chýba nezávislé posúdenie konkrétneho exemplára a dostupné originálne podklady.'} |`);}lines.push('');}
  return lines.join('\n');
}

function loadState(){
  const read=p=>fs.readFileSync(path.join(ROOT,p));
  const baseline=Object.fromEntries(['gaps-2026-11-12.json','observations-2026-11-12.json'].map(name=>[name,digest(read('data/pilot/evidence-audit/'+name))]));
  const review=JSON.parse(read(REVIEW)),pilot=JSON.parse(read('data/pilot/sk-eurocents.json'));
  const dir=path.join(ROOT,HISTORY);const entries=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort().map(n=>{const raw=fs.readFileSync(path.join(dir,n));return {raw,event:JSON.parse(raw)};}):[];
  return {baseline,review,pilot,entries,dir};
}
export async function main(args){
  const {values:opts}=parseArgs({args,options:{write:{type:'boolean'},probe:{type:'boolean'},vault:{type:'string'},'require-complete':{type:'boolean'}}});
  const {baseline,review,pilot,entries,dir}=loadState();
  const checked=validateReview(review,baseline),history=validateHistory(entries,baseline);
  if(!checked.valid||!history.valid)throw Error([...checked.errors,...history.errors].join(','));
  if(opts.probe){
    if(!opts.vault)throw Error('private_vault_required');
    const probes=[];for(const source of review.sources){
      const previous=entries.flatMap(e=>e.event.probes).findLast(p=>p.source_id===source.id&&p.archive_sha256);
      probes.push(await probeSource(source,{vault:opts.vault,previous}));
    }
    const event={schema_version:'1.0',checked_at:new Date().toISOString(),parent_sha256:entries.length?digest(entries.at(-1).raw):digest(bytes(baseline)),review_sha256:digest(bytes(review)),review,probes};
    const name=appendEvent(dir,event);entries.push({raw:fs.readFileSync(path.join(dir,name)),event});
  }
  const latest=entries.at(-1)?.event;
  if(!latest||latest.review_sha256!==digest(bytes(review)))throw Error('current_review_requires_history_event');
  const probes=latest.probes,matrix=matrixFor(review,pilot,probes),expected=renderMatrix(review,matrix,probes),file=path.join(ROOT,MATRIX);
  if(opts.write)fs.writeFileSync(file,expected);
  else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==expected)throw Error('matrix_out_of_date');
  const archives=[...new Set(entries.flatMap(e=>e.event.probes).map(p=>p.archive_sha256).filter(Boolean))];
  const badArchives=opts.vault?archives.filter(sha=>!verifyArchive(opts.vault,sha)):[];
  const summary={valid:badArchives.length===0,availability_passed:probes.every(p=>p.state==='available'),counts:matrix.counts,sources:review.sources.length,probe_states:Object.fromEntries([...new Set(probes.map(p=>p.state))].map(s=>[s,probes.filter(p=>p.state===s).length])),changed_sources:probes.filter(p=>p.content_changed).map(p=>p.source_id),change_detection:probes.some(p=>p.state==='available')?'COMPARE_AVAILABLE_RESPONSES_ONLY':'NOT_MEASURABLE_NO_SUCCESSFUL_RESPONSES',archive_integrity:opts.vault?(badArchives.length?'FAIL':archives.length?'CHECKED_EXISTING_OBJECTS':'NO_ORIGINALS_AVAILABLE'):'NOT_CHECKED_WITHOUT_PRIVATE_VAULT',archived_originals:archives.length,invalid_archives:badArchives,history_entries:entries.length,production_promotions:0,identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
  console.log(JSON.stringify(summary,null,2));
  return !summary.valid||(opts['require-complete']&&matrix.counts['VERIFIED EVIDENCE']!==153)?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{process.exitCode=await main(process.argv.slice(2));}catch(e){console.log(JSON.stringify({valid:false,error:/^[a-z_]+(?:,[a-z_]+)*$/.test(e.message)?e.message:'source_audit_failed',production_promotions:0,identity:null,valuation_allowed:false,ready_for_physical_pilot:false}));process.exitCode=1;}}
