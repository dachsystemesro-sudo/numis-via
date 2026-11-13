import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {digest,sourceURL,validateReview,assessCell,matrixFor,privateVault,verifyArchive,probeSource,validateHistory,appendEvent} from '../scripts/reference-source-audit.mjs';
import {reviewPilotReference} from '../api/pilot-reference.js';
import {valuationAllowed} from '../api/valuation-policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const review=read('data/pilot/evidence-audit/source-review-2026-11-13.json');
const pilot=read('data/pilot/sk-eurocents.json');
const candidate=pilot.records[0];
const serialized=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const baseline=Object.fromEntries(['gaps-2026-11-12.json','observations-2026-11-12.json'].map(name=>[name,digest(fs.readFileSync(path.join(root,'data/pilot/evidence-audit',name)))]));
function vault(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'numis-source-audit-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
// SYNTHETIC ONLY: these metadata reviews and bytes are not actual documents,
// expert identities, signatures, source permissions or approved references.
function exactFixture(){
  const r=structuredClone(review);r.sources=r.sources.slice(0,2);r.claims=[];
  for(const [i,s] of r.sources.entries()){
    s.lineage='SYNTHETIC-INDEPENDENT-'+i;s.lineage_review={status:'approved',reviewer:'SYNTHETIC',reviewed_at:'2026-11-13T00:00:00Z',evidence_sha256:digest('SYNTHETIC independence dossier '+i)};
    s.snapshot_sha256=digest('SYNTHETIC document '+i);
    r.claims.push({id:'SYNTHETIC-'+i,source_id:s.id,scope:'specimen',fields:['country_text'],values:{country_text:'SLOVENSKO'},applies_to:{date:candidate.date,denomination:candidate.denomination},specimen_id:'SYNTHETIC-SPECIMEN',snapshot_sha256:s.snapshot_sha256,locator:'SYNTHETIC',limitation:'SYNTHETIC',review:{status:'approved',reviewer:'SYNTHETIC',reviewed_at:'2026-11-13T00:00:00Z'}});
  }return r;
}
const receipts=r=>r.sources.map(s=>({source_id:s.id,state:'available',archive_sha256:s.snapshot_sha256}));
function eventFixture(){
  return {schema_version:'1.0',checked_at:review.obtained_at,parent_sha256:digest(serialized(baseline)),review_sha256:digest(serialized(review)),review:structuredClone(review),probes:review.sources.map(s=>({source_id:s.id,state:'transport_failure',http_status:0,archive_sha256:null,automatic_public_release:false}))};
}
test('committed dossier preserves the original audit and classifies all 153 cells without promotion',()=>{
  assert.equal(validateReview(review,baseline).valid,true);
  const m=matrixFor(review,pilot);assert.equal(m.variants.length,9);
  assert.deepEqual(m.counts,{'VERIFIED EVIDENCE':0,'PARTIALLY VERIFIED':138,'UNVERIFIED':9,'CONFLICT':6});
  for(const row of m.variants){assert.equal(Object.keys(row.fields).length,17);for(const cell of Object.values(row.fields))assert.equal(cell.exact_variant_status,'UNVERIFIED');}
  assert.equal(m.identity,null);assert.equal(m.valuation_allowed,false);assert.equal(m.ready_for_physical_pilot,false);assert.equal(m.production_promotions,0);
});
test('indexed mass differences are provisional conflicts and are never resolved by averaging',()=>{
  const m=matrixFor(review,pilot);
  for(const row of m.variants){const cell=row.fields['physical.mass_g'];if(row.catalogue_id.includes('-001-'))assert.equal(cell.status,'PARTIALLY VERIFIED');else{assert.equal(cell.status,'CONFLICT');assert.equal(cell.provisional_conflict,true);}}
});
test('two official sites repeating a normative design do not establish specimen evidence',()=>{
  const r=exactFixture();for(const c of r.claims)c.scope='prescribed_design';
  assert.equal(assessCell('country_text',candidate,r,receipts(r)).status,'PARTIALLY VERIFIED');
});
test('two approved synthetic independent trails classify evidence only, never authorize identity or valuation',()=>{
  const r=exactFixture();assert.equal(validateReview(r,baseline).valid,true);
  assert.equal(assessCell('country_text',candidate,r,receipts(r)).status,'VERIFIED EVIDENCE');
  const matrix=matrixFor(r,pilot,receipts(r));assert.equal(matrix.identity,null);assert.equal(matrix.valuation_allowed,false);assert.equal(matrix.ready_for_physical_pilot,false);
  assert.equal(reviewPilotReference(candidate,{sources:r.sources}).valid,false);assert.equal(valuationAllowed(matrix),false);
});
for(const [name,mutate] of Object.entries({
  same_lineage:r=>{r.sources[1].lineage=r.sources[0].lineage;},
  copied_document:r=>{r.sources[1].snapshot_sha256=r.sources[0].snapshot_sha256;r.claims[1].snapshot_sha256=r.claims[0].snapshot_sha256;},
  missing_expert:r=>{r.claims[1].review.status='pending';},
  missing_independence_review:r=>{r.sources[1].lineage_review.status='conservative';},
  mismatched_specimens:r=>{r.claims[1].specimen_id='SYNTHETIC-OTHER';},
  wrong_year:r=>{r.claims[1].applies_to.date='2021';},
  mismatched_snapshot:r=>{r.claims[1].snapshot_sha256=digest('SYNTHETIC unmatched bytes');}
}))test('evidence quorum refuses '+name,()=>{const r=exactFixture();mutate(r);assert.notEqual(assessCell('country_text',candidate,r,receipts(r)).status,'VERIFIED EVIDENCE');});
test('two sources agreeing on the wrong target country produce conflict',()=>{
  const r=exactFixture();for(const c of r.claims)c.values.country_text='SLOVENIJA';assert.equal(assessCell('country_text',candidate,r,receipts(r)).status,'CONFLICT');
});
test('claimed document hashes without retrieval receipts cannot establish verified evidence',()=>{
  const r=exactFixture();assert.equal(assessCell('country_text',candidate,r).status,'PARTIALLY VERIFIED');
});
test('a changed or unavailable current source prevents stale verified evidence',()=>{
  const r=exactFixture(),probes=receipts(r);
  probes[1].archive_sha256=digest('SYNTHETIC changed remote content');assert.equal(assessCell('country_text',candidate,r,probes).status,'PARTIALLY VERIFIED');
  probes[1].state='transport_failure';probes[1].archive_sha256=null;assert.equal(assessCell('country_text',candidate,r,probes).status,'PARTIALLY VERIFIED');
});
for(const [name,mutate] of Object.entries({
  promote_reference:r=>{r.production_promotions=1;},
  assert_ready:r=>{r.ready_for_physical_pilot=true;},
  change_old_audit:r=>{r.baseline['gaps-2026-11-12.json']='a'.repeat(64);},
  duplicate_url:r=>{r.sources[1].url=r.sources[0].url;},
  wrong_year_value:r=>{r.claims.find(c=>c.id==='nbs-issue-1-2019').values.date='2021';},
  string_measurement:r=>{r.claims.find(c=>c.id==='ecb-spec-1').values['physical.mass_g']='2.30';},
  fake_original_of_excerpt:r=>{r.sources.find(s=>s.id==='eurlex-729-index').snapshot_sha256='a'.repeat(64);},
  unread_source:r=>{r.sources.find(s=>s.id==='nbs-national').access='blocked_challenge';},
  invented_review:r=>{r.claims[0].review={status:'approved'};}
}))test('review validation refuses '+name,()=>{const r=structuredClone(review);mutate(r);assert.equal(validateReview(r,baseline).valid,false);});
for(const url of ['http://nbs.sk/a','https://nbs.sk.evil.invalid/a','https://user:password@nbs.sk/a','https://nbs.sk:444/a','https://nbs.sk/a#fragment'])test('source URL rejects '+url,()=>assert.throws(()=>sourceURL(url)));
test('private retrieval archives exact bytes, detects changes and never publishes content',async t=>{
  const dir=vault(t),s={...review.sources[0],markers:['SYNTHETIC document']};
  const body=Buffer.from('<html>SYNTHETIC document one</html>');let calls=0;
  const p=await probeSource(s,{vault:dir,transport:async()=>{calls++;return {status:200,type:'text/html',body};}});
  assert.equal(calls,1);assert.equal(p.state,'available');assert.equal(p.archive_sha256,digest(body));assert.equal(p.automatic_public_release,false);assert.equal(verifyArchive(dir,p.archive_sha256),true);
  const raw=fs.readFileSync(path.join(dir,p.archive_sha256+'.bin'));assert.deepEqual(raw,body);assert.equal(JSON.stringify(p).includes('SYNTHETIC document'),false);
  const changed=await probeSource(s,{vault:dir,previous:p,transport:async()=>({status:200,type:'text/html',body:Buffer.from('<html>SYNTHETIC document two</html>')})});assert.equal(changed.content_changed,true);assert.equal(fs.readdirSync(dir).length,2);
  fs.writeFileSync(path.join(dir,p.archive_sha256+'.bin'),'SYNTHETIC tampering');assert.equal(verifyArchive(dir,p.archive_sha256),false);
});
for(const [state,response] of [
  ['invalid_link',{status:404}],['invalid_link',{status:410}],['redirect_review_required',{status:302}],['access_restricted',{status:403}],['access_restricted',{status:429}],
  ['transport_failure',{status:0,exit_code:56,connect_status:403}],['challenge_or_login',{status:200,type:'text/html',body:'Verify that you are not a robot; CAPTCHA'}],
  ['content_review_required',{status:200,type:'text/html',body:'SYNTHETIC soft 404'}],['unsupported_content',{status:200,type:'image/jpeg',body:'SYNTHETIC'}],
  ['content_review_required',{status:200,type:'application/pdf',body:'SYNTHETIC not a PDF'}],['invalid_size',{status:200,type:'text/html',body:''}],['http_failure',{status:503}]
])test('source probe reports '+state+' without archiving or retrying',async t=>{
  const dir=vault(t);let calls=0;
  const p=await probeSource(review.sources[0],{vault:dir,transport:async()=>{calls++;return response;}});
  assert.equal(p.state,state);assert.equal(p.archive_sha256,null);assert.equal(calls,1);assert.equal(fs.readdirSync(dir).length,0);
});
test('archives inside the repository are forbidden',()=>assert.throws(()=>privateVault(path.join(root,'source-private'))));
test('public permissions and symlink vaults are forbidden',t=>{
  const dir=vault(t),publicDir=path.join(dir,'public');fs.mkdirSync(publicDir,{mode:0o755});fs.chmodSync(publicDir,0o755);assert.throws(()=>privateVault(publicDir));
  const link=path.join(dir,'link');fs.symlinkSync(dir,link);assert.throws(()=>privateVault(link));
});
test('archive symlinks and relaxed file permissions fail integrity checks',async t=>{
  const dir=vault(t),body=Buffer.from('SYNTHETIC bytes'),sha=digest(body),file=path.join(dir,sha+'.bin');
  fs.writeFileSync(file,body,{mode:0o644});fs.chmodSync(file,0o644);assert.equal(verifyArchive(dir,sha),false);fs.unlinkSync(file);
  const target=path.join(dir,'other');fs.writeFileSync(target,body,{mode:0o600});fs.symlinkSync(target,file);assert.equal(verifyArchive(dir,sha),false);
});
test('history is chained, append-only and cannot overwrite an earlier acquisition',t=>{
  const dir=vault(t),first=eventFixture(),name=appendEvent(dir,first),raw=fs.readFileSync(path.join(dir,name));
  assert.throws(()=>appendEvent(dir,first));assert.deepEqual(fs.readFileSync(path.join(dir,name)),raw);
  const second={...first,checked_at:'2099-01-01T00:00:00Z',parent_sha256:digest(raw)};
  assert.equal(validateHistory([{raw,event:first},{raw:serialized(second),event:second}],baseline).valid,true);
  second.parent_sha256='0'.repeat(64);assert.equal(validateHistory([{raw,event:first},{raw:serialized(second),event:second}],baseline).valid,false);
});
for(const [name,mutate] of Object.entries({
  changed_notes:e=>{e.review.claims[0].values.main_motif='SYNTHETIC changed';},
  missing_probe:e=>{e.probes.pop();},
  fake_archive:e=>{e.probes[0].archive_sha256='a'.repeat(64);},
  original_published:e=>{e.probes[0].automatic_public_release=true;},
  out_of_order:e=>{e.checked_at='1900-01-01T00:00:00Z';}
}))test('history rejects '+name,()=>{const e=eventFixture();mutate(e);assert.equal(validateHistory([{raw:serialized(e),event:e}],baseline).valid,false);});
test('offline CLI validates history but strict completion remains denied without modifying production data',()=>{
  const paths=['api/analyze.js','api/catalogue.js','api/valuation-policy.js','data/catalogue.json','data/pilot/sk-eurocents.json','data/pilot/sources.json'];
  const before=paths.map(p=>digest(fs.readFileSync(path.join(root,p))));
  const cli=path.join(root,'scripts/reference-source-audit.mjs');
  const checked=spawnSync(process.execPath,[cli],{encoding:'utf8'});assert.equal(checked.status,0,checked.stdout);
  const report=JSON.parse(checked.stdout);assert.equal(report.identity,null);assert.equal(report.valuation_allowed,false);assert.equal(report.ready_for_physical_pilot,false);
  const strict=spawnSync(process.execPath,[cli,'--require-complete'],{encoding:'utf8'});assert.equal(strict.status,1);assert.equal(JSON.parse(strict.stdout).ready_for_physical_pilot,false);
  assert.deepEqual(paths.map(p=>digest(fs.readFileSync(path.join(root,p)))),before);
});
