import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {decodePhoto} from './specimen-intake.mjs';
import {sha256,checkPrivate,createRoot,outsideCode,inside,readPrivate,writeNew,mkdirNew,checkSource} from './collection-storage.mjs';

const json=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const now=()=>new Date().toISOString();
const idOK=x=>typeof x==='string'&&/^NVC-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(x);
const hashOK=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const bounded=(x,n=4000)=>typeof x==='string'&&x.length<=n;
export const PHOTO_ROLES=['national_full','common_full','obverse_full','reverse_full','year_detail','symbols_detail','mint_mark_detail','engraver_mark_detail','edge','additional_detail'];
export const PROCESSING_VERSION='oriented-srgb-rgba-lossless-png-no-metadata-v1';
const flags={identity:null,valuation_allowed:false};
export function cardTemplate(collection_id,coin_id='NVC-'+randomUUID()){
 const t=now();return {schema_version:'private-collection-card/1',collection_id,coin_id,revision:1,previous_card_sha256:null,created_at:t,updated_at:t,
  title:'',notes:'',archive_status:'archived',identification_status:'unidentified',...flags,valuation_status:'valuation_blocked',identity_proposal:null,
  provenance:{owner_ref:null,obtained_at:null,source_ref:null,same_specimen_attested:false},
  rights:{local_processing_authorized:null,photographer_ref:null,retention_until:null},
  measurements:{mass_g:{readings:[],uncertainty:null},diameter_mm:{readings:[],uncertainty:null},thickness_mm:{readings:[],uncertainty:null}},
  evidence_documents:[],images:[],technical_report:null,passport:{status:'not_ready',ready_for_issue:false,blockers:['identity_review_not_performed','capture_review_missing','provenance_missing','rights_missing','measurements_missing','evidence_missing']}};
}
function assertPrivateCard(card){
 if(card?.schema_version!=='private-collection-card/1'||!idOK(card.coin_id)||!Number.isSafeInteger(card.revision)||card.revision<1||card.archive_status!=='archived'||card.identity!==null||card.valuation_allowed!==false||card.valuation_status!=='valuation_blocked'||!['unidentified','provisional_identity'].includes(card.identification_status)||card.passport?.ready_for_issue!==false)throw Error('card_security_state_invalid');
 if(!bounded(card.title,200)||!bounded(card.notes)||!Array.isArray(card.images)||card.images.length>300||!Array.isArray(card.evidence_documents))throw Error('card_structure_invalid');
 if(card.identification_status!==(card.identity_proposal?'provisional_identity':'unidentified'))throw Error('card_identity_state_invalid');
 if(card.images.some(p=>!/^IMG-[0-9a-f]{64}$/.test(p.id)||!hashOK(p.original_sha256)||!hashOK(p.pixel_sha256)||!hashOK(p.working_sha256)||p.processing_version!==PROCESSING_VERSION||!Array.isArray(p.roles)||p.roles.some(r=>!PHOTO_ROLES.includes(r))))throw Error('card_photo_invalid');
 if(new Set(card.images.map(p=>p.id)).size!==card.images.length)throw Error('card_duplicate_photo');
 if(!['not_ready','ready_for_pass_review'].includes(card.passport.status))throw Error('card_passport_state_invalid');
}
function readJSON(root,rel){return JSON.parse(readPrivate(root,rel).toString('utf8'));}
export function openCollection(value){const root=outsideCode(value);checkPrivate(root,{root:true});const header=readJSON(root,'collection.json');if(header.schema_version!=='private-collection/1'||!/^NVCOL-[0-9a-f-]{36}$/.test(header.collection_id)||header.public_upload!==false)throw Error('collection_header_invalid');for(const n of ['coins','indexes'])checkPrivate(path.join(root,n),{root:true});return {root,header};}
export function initCollection(value){const root=createRoot(value);for(const n of ['coins','indexes'])mkdirNew(root,n);const header={schema_version:'private-collection/1',collection_id:'NVCOL-'+randomUUID(),created_at:now(),public_upload:false,confirmed_identity_import_supported:false,valuation_allowed:false};writeNew(root,'collection.json',json(header));return {root,collection_id:header.collection_id};}
function coinRel(id,tail=''){if(!idOK(id))throw Error('coin_id_invalid');return 'coins/'+id+(tail?'/'+tail:'');}
export function readCoin(value,id,{verifyAssets=true}={}){
 const {root,header}=openCollection(value);const rel=coinRel(id),dir=path.join(root,rel);checkPrivate(dir,{root:true});checkPrivate(path.join(dir,'cards'),{root:true});
 const files=fs.readdirSync(path.join(dir,'cards')).sort();if(!files.length)throw Error('coin_commit_missing');let previous=null,current;
 for(const [i,name] of files.entries()){
  if(!/^\d{6}-[0-9a-f]{64}\.json$/.test(name))throw Error('card_filename_invalid');
  const raw=readPrivate(root,rel+'/cards/'+name),digest=sha256(raw),card=JSON.parse(raw);
  if(name!==String(i+1).padStart(6,'0')+'-'+digest+'.json'||card.revision!==i+1||card.previous_card_sha256!==previous||card.coin_id!==id||card.collection_id!==header.collection_id)throw Error('card_history_fork_or_tampering');
  assertPrivateCard(card);previous=digest;current=card;
  if(!card.technical_report||sha256(readPrivate(root,card.technical_report.path))!==card.technical_report.sha256)throw Error('technical_report_integrity_failed');
  if(JSON.stringify(card.passport)!==JSON.stringify(readiness(card)))throw Error('passport_readiness_tampered');
 }
 if(verifyAssets){
  for(const p of current.images){for(const [file,digest] of [[p.original,p.original_sha256],[p.working,p.working_sha256]]){if(!file.startsWith(rel+'/originals/')&&!file.startsWith(rel+'/working/'))throw Error('asset_coin_binding_invalid');if(sha256(readPrivate(root,file,12*1024*1024))!==digest)throw Error('asset_integrity_failed');}}
  for(const d of current.evidence_documents){if(!d.path.startsWith(rel+'/documents/')||sha256(readPrivate(root,d.path,10*1024*1024))!==d.sha256)throw Error('document_integrity_failed');}
 }
 if(!current.technical_report||sha256(readPrivate(root,current.technical_report.path))!==current.technical_report.sha256)throw Error('technical_report_integrity_failed');
 return {card:current,card_sha256:previous};
}
export function listCollection(value,{verifyAssets=false}={}){
 const {root}=openCollection(value);const coins=[],incomplete=[];
 for(const id of fs.readdirSync(path.join(root,'coins')).sort()){
  if(!idOK(id))throw Error('unexpected_collection_entry');
  const cards=path.join(root,coinRel(id,'cards'));if(!fs.existsSync(cards)||!fs.readdirSync(cards).length){incomplete.push(id);continue;}
  coins.push(readCoin(root,id,{verifyAssets}));
 }
 return {coins,incomplete};
}
function readiness(card){
 const roles=new Set(card.images.flatMap(p=>p.roles)),blockers=[];
 if(!card.identity_proposal)blockers.push('identity_proposal_missing');
 if(!((roles.has('national_full')&&roles.has('common_full'))||(roles.has('obverse_full')&&roles.has('reverse_full')))||!roles.has('edge')||card.images.some(p=>p.roles.length&&!p.captured_at))blockers.push('capture_review_missing');
 if(card.identity_proposal?.year&&!roles.has('year_detail'))blockers.push('year_detail_missing');
 if(!card.provenance?.owner_ref||!card.provenance?.source_ref||card.provenance?.same_specimen_attested!==true)blockers.push('provenance_missing');
 if(card.rights?.local_processing_authorized!==true||!card.rights?.photographer_ref)blockers.push('rights_missing');
 for(const key of ['mass_g','diameter_mm']){const m=card.measurements?.[key];if(!Array.isArray(m?.readings)||m.readings.length<3||m.readings.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<=0)||typeof m.uncertainty!=='number'||!Number.isFinite(m.uncertainty)||m.uncertainty<0)blockers.push('measurements_missing');}
 if(['rights','calibration','provenance'].some(kind=>!card.evidence_documents.some(d=>d.kind===kind)))blockers.push('evidence_missing');
 return {status:blockers.length?'not_ready':'ready_for_pass_review',ready_for_issue:false,blockers:[...new Set(blockers)]};
}
function safePatch(card,patch){
 if(!plain(patch)||Object.keys(patch).some(k=>!['title','notes','identity_proposal','photo_annotations','provenance','rights','measurements'].includes(k)))throw Error('metadata_field_forbidden');
 const next=structuredClone(card);
 for(const key of ['title','notes'])if(Object.hasOwn(patch,key)){if(!bounded(patch[key],key==='title'?200:4000))throw Error('metadata_text_invalid');next[key]=patch[key];}
 if(Object.hasOwn(patch,'identity_proposal')){
  const p=patch.identity_proposal;
  if(p!==null&&(!plain(p)||!Object.keys(p).length||Object.keys(p).some(k=>!['country','denomination','year','motif','notes'].includes(k))||Object.values(p).some(v=>!bounded(v,500)||!v.trim())))throw Error('identity_proposal_invalid');next.identity_proposal=p;
 }
 for(const key of ['provenance','rights','measurements'])if(Object.hasOwn(patch,key)){
  if(!plain(patch[key])||Object.keys(patch[key]).some(k=>!Object.hasOwn(card[key],k)))throw Error('metadata_field_forbidden');
  if(key!=='measurements'&&Object.values(patch[key]).some(v=>v!==null&&typeof v!=='boolean'&&!bounded(v,500)))throw Error('metadata_value_invalid');
  next[key]={...next[key],...patch[key]};
 }
 if(patch.photo_annotations){if(!Array.isArray(patch.photo_annotations))throw Error('photo_annotations_invalid');
  for(const a of patch.photo_annotations){const p=next.images.find(p=>p.id===a.id);if(!p||Object.keys(a).some(k=>!['id','roles','captured_at'].includes(k))||!Array.isArray(a.roles)||new Set(a.roles).size!==a.roles.length||a.roles.some(r=>!PHOTO_ROLES.includes(r)))throw Error('photo_annotations_invalid');
   const full=a.roles.some(r=>['national_full','common_full','obverse_full','reverse_full'].includes(r));if(full&&a.roles.length!==1)throw Error('whole_side_is_not_macro');
   if(a.captured_at!==null&&(!/^\d{4}-\d{2}-\d{2}T/.test(a.captured_at)||!Number.isFinite(Date.parse(a.captured_at))||Date.parse(a.captured_at)>Date.now()))throw Error('capture_time_invalid');p.roles=a.roles;p.captured_at=a.captured_at;
  }
 }
 next.identification_status=next.identity_proposal?'provisional_identity':'unidentified';next.passport=readiness(next);return next;
}
function commitCard(root,card,previous,report){
 const id=card.coin_id,rel=coinRel(id);
 if(previous&&readCoin(root,id).card_sha256!==previous)throw Error('concurrent_revision_detected');
 const reportPath=rel+'/reports/'+randomUUID()+'.json',rawReport=json(report);writeNew(root,reportPath,rawReport);card.technical_report={path:reportPath,sha256:sha256(rawReport)};
 card.updated_at=now();card.passport=readiness(card);assertPrivateCard(card);
 const bytes=json(card),digest=sha256(bytes);writeNew(root,rel+'/cards/'+String(card.revision).padStart(6,'0')+'-'+digest+'.json',bytes);
 return {coin_id:id,revision:card.revision,card_sha256:digest,images:card.images.length,identification_status:card.identification_status,passport_status:card.passport.status,...flags};
}
export async function addPhotos(value,filenames,{coin_id=null,decode=decodePhoto}={}){
 const {root,header}=openCollection(value);if(!Array.isArray(filenames)||filenames.length<1||filenames.length>30)throw Error('select_one_to_thirty_photos');
 const current=coin_id?readCoin(root,coin_id):null,card=current?structuredClone(current.card):cardTemplate(header.collection_id),all=listCollection(root),other=new Set(all.coins.filter(c=>c.card.coin_id!==coin_id).flatMap(c=>c.card.images.map(p=>p.original_sha256)));
 const existing=new Map(card.images.map(p=>[p.original_sha256,p])),pixels=new Set(card.images.map(p=>p.pixel_sha256)),staged=[],seen=new Set();let reused=0,totalBytes=0;
 for(const filename of filenames){
  const source=checkSource(filename),hash=sha256(source.bytes);if(other.has(hash))throw Error('photo_attached_to_other_coin');if(seen.has(hash)){reused++;continue;}seen.add(hash);
  if(existing.has(hash)){reused++;continue;}
  const ext=path.extname(filename).toLowerCase();if(!['.jpg','.jpeg','.png','.webp'].includes(ext))throw Error('photo_format_invalid');
  const p=await decode(source.bytes,'source'+ext);if(pixels.has(p.pixel_sha256))throw Error('duplicate_pixels_different_file');pixels.add(p.pixel_sha256);
  if(p.working.length>12*1024*1024)throw Error('working_copy_resource_limit');totalBytes+=source.bytes.length+p.working.length;if(totalBytes>128*1024*1024)throw Error('batch_resource_limit');
  staged.push({filename,source,decoded:p,ext});
 }
 if(!staged.length&&current)return {coin_id,revision:card.revision,images:card.images.length,new_images:0,reused,decoded:0,unchanged:true,...flags};
 if(!staged.length)throw Error('no_new_photos');
 const id=card.coin_id,rel=coinRel(id);
 if(!current){mkdirNew(root,rel);for(const n of ['originals','working','cards','reports','documents','passport-review'])mkdirNew(root,rel+'/'+n);}
 for(const item of staged){
  const {decoded:p,source,filename,ext}=item,original=rel+'/originals/'+p.original_sha256+ext,working=rel+'/working/'+p.pixel_sha256+'.png';
  writeNew(root,original,source.bytes);writeNew(root,working,p.working);
  const after=checkSource(filename);if(sha256(after.bytes)!==p.original_sha256||after.mtime!==source.mtime||after.ctime!==source.ctime)throw Error('source_changed_after_copy');
  if(sha256(readPrivate(root,original,10*1024*1024))!==p.original_sha256||sha256(readPrivate(root,working,12*1024*1024))!==p.working_sha256)throw Error('copied_image_hash_mismatch');
  card.images.push({id:'IMG-'+p.original_sha256,source_filename:path.basename(filename),original,original_sha256:p.original_sha256,working,working_sha256:p.working_sha256,pixel_sha256:p.pixel_sha256,width:p.width,height:p.height,bytes:source.bytes.length,captured_at:null,roles:[],processing_version:PROCESSING_VERSION,processing:{decoder_sha256:sha256(Buffer.from(decodePhoto.toString())),sharp_version:sharp.versions.sharp,vips_version:sharp.versions.vips}});
 }
 if(current){card.revision++;card.previous_card_sha256=current.card_sha256;}
 const result=commitCard(root,card,current?.card_sha256,{schema_version:'collection-technical/1',operation:'archive_photos',recorded_at:now(),new_images:staged.length,reused,decoded:staged.length,source_sha256_mtime_ctime_preserved:true,originals_byte_identical:true,working_metadata_removed:true,photos:card.images.map(p=>({id:p.id,original_sha256:p.original_sha256,pixel_sha256:p.pixel_sha256,working_sha256:p.working_sha256,width:p.width,height:p.height})),...flags});
 return {...result,new_images:staged.length,reused,decoded:staged.length};
}
export function reviseCoin(value,id,patch){const {root}=openCollection(value),old=readCoin(root,id),card=safePatch(old.card,patch);card.revision++;card.previous_card_sha256=old.card_sha256;return commitCard(root,card,old.card_sha256,{schema_version:'collection-technical/1',operation:'metadata_revision',recorded_at:now(),previous_report:old.card.technical_report,photos_redecoded:0,asset_integrity_verified:true,...flags});}
export function addDocument(value,id,filename,{kind='supporting_document'}={}){
 if(!['supporting_document','calibration','rights','expert_report','provenance'].includes(kind))throw Error('document_kind_invalid');const {root}=openCollection(value),old=readCoin(root,id),source=checkSource(filename),hash=sha256(source.bytes);
 if(old.card.evidence_documents.some(d=>d.sha256===hash))return {coin_id:id,unchanged:true,...flags};
 const rel=coinRel(id,'documents/'+hash+'.bin');writeNew(root,rel,source.bytes);const after=checkSource(filename);if(sha256(after.bytes)!==hash||after.mtime!==source.mtime||after.ctime!==source.ctime)throw Error('document_source_changed');
 const card=structuredClone(old.card);card.evidence_documents.push({id:'DOC-'+hash,path:rel,sha256:hash,kind,source_filename:path.basename(filename),expert_approval_verified:false});card.revision++;card.previous_card_sha256=old.card_sha256;
 return commitCard(root,card,old.card_sha256,{operation:'attach_document_only',recorded_at:now(),document_sha256:hash,document_semantics_verified:false,...flags});
}
export function collectionIndex(value){const data=listCollection(value,{verifyAssets:true});return {schema_version:'private-collection-index/1',generated_at:now(),counts:{archived:data.coins.length,provisional_identity:data.coins.filter(c=>c.card.identification_status==='provisional_identity').length,confirmed_identity:0,valuation_blocked:data.coins.length,ready_for_pass_review:data.coins.filter(c=>c.card.passport.status==='ready_for_pass_review').length,incomplete:data.incomplete.length},coins:data.coins.map(({card,card_sha256})=>({coin_id:card.coin_id,title:card.title,revision:card.revision,card_sha256,photos:card.images.length,identification_status:card.identification_status,passport_status:card.passport.status,...flags})),...flags};}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function saveIndex(value){const {root}=openCollection(value),index=collectionIndex(root),name='indexes/'+now().replaceAll(':','-')+'-'+randomUUID(),rows=index.coins.map(c=>'<tr><td>'+escape(c.coin_id)+'</td><td>'+escape(c.title)+'</td><td>'+c.photos+'</td><td>'+escape(c.identification_status)+'</td><td>'+escape(c.passport_status)+'</td></tr>').join('');
 writeNew(root,name+'.json',json(index));writeNew(root,name+'.html','<!doctype html><html lang="sk"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'"><title>NUMIS VIA – súkromná zbierka</title><style>body{font:16px system-ui;margin:32px}td,th{padding:10px;border:1px solid #ccc}table{border-collapse:collapse}</style><h1>Súkromná zbierka NUMIS VIA</h1><p>Lokálny index. Identita nie je potvrdená; ocenenie je blokované.</p><pre>'+escape(JSON.stringify(index.counts,null,2))+'</pre><table><tr><th>ID</th><th>Názov</th><th>Fotografie</th><th>Identifikácia</th><th>Pas</th></tr>'+rows+'</table></html>');return {index,json_file:name+'.json',html_file:name+'.html'};
}
export function preparePassReview(value,id){const {root}=openCollection(value),{card,card_sha256}=readCoin(root,id),draft={schema_version:'private-pass-review/1',kind:'DRAFT_NOT_A_PASSPORT',coin_id:id,collection_id:card.collection_id,card_sha256,created_at:now(),identity_proposal:card.identity_proposal,images:card.images.map(p=>({id:p.id,original_sha256:p.original_sha256,working_sha256:p.working_sha256,roles:p.roles})),evidence_documents:card.evidence_documents.map(d=>({id:d.id,sha256:d.sha256,kind:d.kind})),review_readiness:readiness(card),identity:null,valuation_allowed:false,passport_issued:false,public_profile_allowed:false};
 const file=coinRel(id,'passport-review/'+randomUUID()+'.json');writeNew(root,file,json(draft));return {file,draft};
}
export async function main(args){const {values,positionals}=parseArgs({args,allowPositionals:true,options:{root:{type:'string'},coin:{type:'string'},metadata:{type:'string'},kind:{type:'string'}}});if(!values.root)throw Error('collection_root_required');const [action,...files]=positionals;
 if(action==='init')return initCollection(values.root);
 if(action==='add')return addPhotos(values.root,files,{coin_id:values.coin});
 if(action==='revise'){if(!values.coin||!values.metadata)throw Error('coin_and_metadata_required');return reviseCoin(values.root,values.coin,JSON.parse(checkSource(path.resolve(values.metadata)).bytes));}
 if(action==='document')return addDocument(values.root,values.coin,files[0],{kind:values.kind});
 if(action==='index')return saveIndex(values.root).index;
 if(action==='audit')return {coins:listCollection(values.root,{verifyAssets:true}).coins.length,valid:true,...flags};
 if(action==='pass-review')return preparePassReview(values.root,values.coin).draft;
 throw Error('collection_action_invalid');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const r=await main(process.argv.slice(2));console.log(JSON.stringify(r,null,2));}catch(e){console.log(JSON.stringify({valid:false,error:/^[a-z_]+$/.test(e.message)?e.message:'collection_operation_failed',automatic_cleanup:false,partial_files_may_remain:true,...flags}));process.exitCode=1;}}
