import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {templates,initIntake,prepareCapture,validateCapture,decodePhoto,importPhotos,inspectIntake,auditIntake,auditDossier,dossierContentHash,ROLES} from '../scripts/specimen-intake.mjs';
import {checkVault,checkStorage,privateWrite,privateRead,windowsStorage} from '../scripts/intake-storage.mjs';

// All pixels are abstract synthetic colours/noise. No coin, real measured data,
// ownership permission, expert identity or authentic signature is represented.
const hash=b=>createHash('sha256').update(b).digest('hex');
const root=fileURLToPath(new URL('../',import.meta.url));
const early='2026-01-01T00:00:00Z';
const later='2026-01-01T00:01:00Z';
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'numis-intake-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
function save(root,name,value){fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2)+'\n',{mode:0o600});}
function capture(t){
  const state=templates();
  const groups=[['national_full'],['common_full'],['year_detail'],['mint_mark_detail','engraver_mark_detail','symbols_detail'],['edge']];
  const plan=state.capture;
  plan.images=groups.map((roles,i)=>({id:'SYNTHETIC-'+i,filename:i+'.png',specimen_id:state.specimen.specimen_id,session_id:state.specimen.session_id,captured_at:early,roles}));
  Object.assign(plan.capture_check,{reviewer_ref:'SYNTHETIC-OPERATOR',reviewed_at:later,same_specimen_confirmed:true,year_legibility:'readable',year_transcription:'2020',whole_sides_visible:true,decisive_details_visible:true,local_processing_authorized:true});
  return {state,plan};
}
async function fixture(t,{mutate=()=>{},exif=false}={}){
  const parent=temp(t),vault=path.join(parent,'archive');initIntake(vault);
  const state={specimen:JSON.parse(privateRead(vault,'specimen.json')),capture:JSON.parse(privateRead(vault,'capture.json')),dossier:JSON.parse(privateRead(vault,'dossier.json'))};
  const base=capture(t).plan;
  base.specimen_id=state.specimen.specimen_id;base.session_id=state.specimen.session_id;
  for(const i of base.images){i.specimen_id=base.specimen_id;i.session_id=base.session_id;}
  for(const [i,p] of base.images.entries()){
    let encoder=sharp({create:{width:512,height:512,channels:3,background:{r:10+i*37,g:25+i,b:90}}});
    if(exif)encoder=encoder.withExif({IFD0:{Artist:'SYNTHETIC PRIVATE',ImageDescription:'SYNTHETIC GPS stand-in'}});
    privateWrite(vault,'incoming/'+p.filename,await encoder.png().toBuffer());
  }
  mutate(base,vault);save(vault,'capture.json',base);
  return {vault,plan:base,state};
}
test('initialization makes a private fresh vault with empty measurements and pending reviews',t=>{
  const vault=path.join(temp(t),'archive');const r=initIntake(vault);assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);
  const d=JSON.parse(privateRead(vault,'dossier.json'));for(const m of Object.values(d.measurements)){assert.deepEqual(m.readings,[null,null,null]);assert.equal(m.uncertainty,null);}assert.equal(d.reviews.length,2);assert.equal(d.final_decision.status,'pending');assert.equal(checkVault(vault),vault);
});
test('init cannot alter or reuse an existing user directory',t=>{
  const p=temp(t),before=fs.statSync(p).mode;assert.throws(()=>initIntake(p));assert.equal(fs.statSync(p).mode,before);assert.equal(fs.readdirSync(p).length,0);
});
test('an archive in the repository is denied before creating it',()=>assert.throws(()=>initIntake(path.join(root,'private-test-should-not-exist'))));
for(const [name,mutate] of Object.entries({
  missing_common:p=>{p.images=p.images.filter(i=>!i.roles.includes('common_full'));},
  missing_edge:p=>{p.images=p.images.filter(i=>!i.roles.includes('edge'));},
  unreadable_year:p=>{p.capture_check.year_legibility='unreadable';},
  wrong_year:p=>{p.capture_check.year_transcription='2021';},
  ambiguous_year:p=>{p.capture_check.year_transcription='2020?';},
  different_specimen:p=>{p.images[1].specimen_id='OTHER';},
  different_session:p=>{p.images[1].session_id='OTHER';},
  no_same_specimen_review:p=>{p.capture_check.same_specimen_confirmed=false;},
  file_path_escape:p=>{p.images[0].filename='../other.png';},
  duplicate_filename:p=>{p.images[1].filename=p.images[0].filename;},
  duplicate_id:p=>{p.images[1].id=p.images[0].id;},
  two_sides_one_image:p=>{p.images[0].roles.push('common_full');},
  whole_side_claimed_as_detail:p=>{p.images[0].roles.push('year_detail');},
  missing_processing_right:p=>{p.capture_check.local_processing_authorized=null;}
}))test('capture rejects '+name,()=>{const {state,plan}=capture();mutate(plan);assert.equal(validateCapture(plan,state.specimen).valid,false);});
test('lossless working copies strip EXIF while originals retain exact bytes',async t=>{
  const f=await fixture(t,{exif:true}),before=fs.readFileSync(path.join(f.vault,'incoming/0.png'));
  assert.ok((await sharp(before).metadata()).exif);
  const result=await importPhotos(f.vault);assert.equal(result.imported,true);assert.equal(result.identity,null);assert.equal(result.valuation_allowed,false);
  const manifest=await inspectIntake(f.vault,result.intake_id),dir=path.join(f.vault,'intakes',result.intake_id),p=manifest.images[0];
  assert.deepEqual(privateRead(dir,p.original),before);assert.equal(p.original_sha256,hash(before));
  const work=privateRead(dir,p.working),m=await sharp(work).metadata();assert.equal(m.exif,undefined);assert.equal(m.xmp,undefined);assert.equal(m.iptc,undefined);assert.equal(JSON.stringify(manifest).includes('SYNTHETIC PRIVATE'),false);
  assert.equal((await auditIntake(f.vault,result.intake_id)).documentation_complete,false);
});
test('corrupt last image rejects the entire import without accepting a partial intake',async t=>{
  const f=await fixture(t);fs.writeFileSync(path.join(f.vault,'incoming/4.png'),'SYNTHETIC CORRUPT');
  await assert.rejects(importPhotos(f.vault));assert.equal(fs.readdirSync(path.join(f.vault,'intakes')).length,0);assert.equal(fs.existsSync(path.join(f.vault,'.import-lock')),false);
});
test('different encodings of duplicate pixels are rejected',async t=>{
  const f=await fixture(t),first=privateRead(f.vault,'incoming/0.png');
  fs.writeFileSync(path.join(f.vault,'incoming/1.png'),await sharp(first).png({compressionLevel:1}).toBuffer());
  await assert.rejects(importPhotos(f.vault),/duplicate/);
});
test('previously imported images cannot be imported a second time',async t=>{
  const f=await fixture(t);await importPhotos(f.vault);await assert.rejects(importPhotos(f.vault),/duplicate/);assert.equal(fs.readdirSync(path.join(f.vault,'intakes')).length,1);
});
test('a lock is respected without deleting somebody else’s import lock',async t=>{
  const f=await fixture(t);privateWrite(f.vault,'.import-lock',Buffer.from('SYNTHETIC LOCK'));await assert.rejects(importPhotos(f.vault));assert.equal(privateRead(f.vault,'.import-lock').toString(),'SYNTHETIC LOCK');
});
test('wrong extension, too-small, animated and corrupt images fail decoding',async()=>{
  const image=await sharp({create:{width:512,height:512,channels:3,background:'red'}}).png().toBuffer();await assert.rejects(decodePhoto(image,'wrong.jpg'));
  const small=await sharp(image).resize(100,100).png().toBuffer();await assert.rejects(decodePhoto(small,'small.png'));await assert.rejects(decodePhoto(Buffer.from('SYNTHETIC'),'fake.png'));
  const blue=await sharp({create:{width:512,height:512,channels:3,background:'blue'}}).png().toBuffer();
  const animated=await sharp([image,blue],{join:{animated:true}}).webp({loop:0}).toBuffer();assert.equal((await sharp(animated).metadata()).pages,2);await assert.rejects(decodePhoto(animated,'animated.webp'));
});
test('prepare enumerates real incoming files but leaves roles, times and human attestations empty',async t=>{
  const f=await fixture(t);const r=prepareCapture(f.vault);assert.equal(r.prepared,true);
  const plan=JSON.parse(privateRead(f.vault,'capture-draft.json'));assert.equal(plan.images.length,5);assert.equal(plan.images.every(i=>i.roles.length===0&&i.captured_at===null&&i.specimen_id===f.state.specimen.specimen_id),true);
  assert.equal(validateCapture(plan,f.state.specimen).valid,false);assert.throws(()=>prepareCapture(f.vault));
});
test('archive integrity detects modified originals and manifests',async t=>{
  const f=await fixture(t),r=await importPhotos(f.vault),dir=path.join(f.vault,'intakes',r.intake_id),manifest=await inspectIntake(f.vault,r.intake_id);
  fs.writeFileSync(path.join(dir,manifest.images[0].original),'SYNTHETIC changed');await assert.rejects(inspectIntake(f.vault,r.intake_id));
});
test('capture evidence cannot be silently substituted after import',async t=>{
  const f=await fixture(t),r=await importPhotos(f.vault),dir=path.join(f.vault,'intakes',r.intake_id);
  const p=JSON.parse(privateRead(dir,'capture.json'));p.capture_check.reviewer_ref='SYNTHETIC OTHER';save(dir,'capture.json',p);await assert.rejects(inspectIntake(f.vault,r.intake_id));
});
function syntheticDossier(t){
  const dir=path.join(temp(t),'archive');initIntake(dir);
  const proof=(name)=>{const file='documents/'+name+'.txt',body=Buffer.from('SYNTHETIC DOCUMENT ONLY '+name);privateWrite(dir,file,body);return {document:file,sha256:hash(body)};};
  const tplate=templates(),d=tplate.dossier,manifest={...tplate.specimen,imported_at:early,human_capture_check:{reviewer_ref:'SYNTHETIC OPERATOR'},images:capture().plan.images.map(i=>({...i,working_bytes:100}))},manifestHash=hash('SYNTHETIC manifest');
  Object.assign(d.provenance,{owner_ref:'SYNTHETIC OWNER',obtained_at:early,source_ref:'SYNTHETIC source',condition:'SYNTHETIC',finish:'SYNTHETIC'});
  Object.assign(d.rights,{photographer_ref:'SYNTHETIC',metadata_basis:'SYNTHETIC',image_basis:'SYNTHETIC',consent:proof('consent'),retention_until:'2099-01-01T00:00:00Z'});
  // Artificial test readings, NOT actual measurements or nominal defaults.
  const synthetic={mass_g:2.31,diameter_mm:16.24,thickness_mm:1.66};
  for(const [key,m] of Object.entries(d.measurements)){const v=synthetic[key];Object.assign(m,{readings:[v-0.01,v,v+0.01],uncertainty:0.02,method:'SYNTHETIC'});Object.assign(m.instrument,{id:'SYNTHETIC',resolution:0.01,zero_before:true,zero_after:true,calibration:{checked_at:early,valid_until:'2099-01-01T00:00:00Z',...proof('calibration-'+key)}});}
  d.sources=[{url:'https://nbs.sk/',publisher:'SYNTHETIC fixture, not an actual source review',locator:'SYNTHETIC',license_basis:'SYNTHETIC',...proof('source')}];
  d.model_selection={image_ids:['SYNTHETIC-1','SYNTHETIC-0','SYNTHETIC-2','SYNTHETIC-3','SYNTHETIC-4'],coverage_review:{status:'approved',reviewer_ref:'SYNTHETIC',reviewed_at:later}};
  const content=dossierContentHash(d);
  for(const [i,r] of d.reviews.entries())Object.assign(r,{reviewer_ref:'SYNTHETIC REVIEWER '+i,independence_basis:'SYNTHETIC ONLY',independent_of_operator:true,independent_of_other_reviewer:true,reviewed_at:later,manifest_sha256:manifestHash,dossier_content_sha256:content,signed_report:proof('review-'+i),observations:Object.fromEntries(Object.keys(r.observations).map(f=>[f,f==='date'?'2020':f==='country_code'?'SK':f==='country_text'?'SLOVENSKO':f==='denomination'?'1 cent':f.startsWith('physical.')?synthetic[f.split('.')[1]]:'SYNTHETIC']))});
  Object.assign(d.final_decision,{status:'approved',authority_ref:'SYNTHETIC AUTHORITY',reviewed_at:later,manifest_sha256:manifestHash,dossier_content_sha256:content,...proof('decision')});
  return {dir,d,manifest,manifestHash};
}
test('even a structurally complete synthetic dossier cannot approve reference or valuation',t=>{
  const f=syntheticDossier(t),r=auditDossier(f.dir,f.d,f.manifest,f.manifestHash);assert.equal(r.documentation_complete,true,JSON.stringify(r.errors));assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);assert.equal(r.reference_approval,'NOT_PERFORMED');assert.equal(r.model_request_status,'BLOCKED');
});
for(const [name,mutate] of Object.entries({
  missing_measurement:f=>{f.d.measurements.mass_g.readings[1]=null;},
  nominal_substitution:f=>{f.d.measurements.mass_g.readings='2.30';},
  physical_contradiction:f=>{f.d.measurements.mass_g.readings=[7.1,7.2,7.3];},
  expert_measurement_disagrees:f=>{for(const r of f.d.reviews)r.observations['physical.mass_g']=7.2;},
  forged_verified_state:f=>{f.d.verification_state='verified_reference';},
  missing_uncertainty:f=>{f.d.measurements.mass_g.uncertainty=null;},
  missing_calibration:f=>{f.d.measurements.mass_g.instrument.calibration.document=null;},
  missing_signature:f=>{f.d.reviews[1].signed_report.document=null;},
  same_reviewer:f=>{f.d.reviews[1].reviewer_ref=f.d.reviews[0].reviewer_ref;},
  same_signature_file:f=>{f.d.reviews[1].signed_report=f.d.reviews[0].signed_report;},
  conflicting_experts:f=>{f.d.reviews[1].observations.mint_mark='SYNTHETIC DIFFERENT';},
  contradictory_third_expert:f=>{f.d.reviews.push({...f.d.reviews[0],observations:{...f.d.reviews[0].observations,mint_mark:'SYNTHETIC OTHER'}});},
  wrong_year:f=>{for(const r of f.d.reviews)r.observations.date='2020?';},
  outstanding_conflict:f=>{f.d.conflicts=['SYNTHETIC unresolved'];},
  missing_final_decision:f=>{f.d.final_decision.status='pending';},
  missing_rights:f=>{f.d.rights.consent.document=null;},
  missing_original_source:f=>{f.d.sources=[];},
  six_model_images:f=>{f.d.model_selection.image_ids.push('SYNTHETIC-EXTRA');},
  missing_model_detail:f=>{f.d.model_selection.image_ids.pop();},
  oversized_model_payload:f=>{f.manifest.images[0].working_bytes=5*1024*1024;},
  wrong_model_side_order:f=>{f.d.model_selection.image_ids.reverse();},
  changed_measurement_after_signature:f=>{f.d.measurements.mass_g.readings[0]=8.1;},
  forged_signature_digest:f=>{f.d.reviews[1].signed_report.sha256='0'.repeat(64);}
}))test('dossier stays blocked for '+name,t=>{const f=syntheticDossier(t);mutate(f);const r=auditDossier(f.dir,f.d,f.manifest,f.manifestHash);assert.equal(r.documentation_complete,false);assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);});
for(const [name,run] of Object.entries({unavailable:()=>({status:1,stdout:''}),malformed:()=>({status:0,stdout:'SYNTHETIC NOT JSON'}),denied:()=>({status:0,stdout:'{"valid":false}'}),timeout:()=>({status:null,stdout:''})}))test('Windows ACL failure '+name+' never falls back to POSIX',()=>assert.throws(()=>windowsStorage('C:\\SYNTHETIC',{run}),/windows_private_storage_unverified/));
test('Windows helper is invoked without execution policy bypass or system configuration changes',()=>{
  windowsStorage('C:\\SYNTHETIC',{run:(program,args)=>{assert.equal(program,'powershell.exe');assert.equal(args.some(a=>/bypass|executionpolicy/i.test(a)),false);return {status:0,stdout:'{"valid":true}'};}});
});
test('public archive permissions are rejected on the actual OS',t=>{
  const vault=path.join(temp(t),'archive');initIntake(vault);
  if(process.platform==='win32'){
    const r=spawnSync('icacls.exe',[vault,'/grant','*S-1-1-0:(OI)(CI)R'],{encoding:'utf8'});assert.equal(r.status,0);assert.throws(()=>checkVault(vault),/windows_private/);
  }else{fs.chmodSync(vault,0o755);assert.throws(()=>checkVault(vault),/private_storage/);}
});
test('a hard-linked incoming file is rejected on the actual OS',async t=>{
  const f=await fixture(t),file=path.join(f.vault,'incoming/0.png');fs.linkSync(file,path.join(f.vault,'copy.png'));await assert.rejects(importPhotos(f.vault),/unsafe_storage_link/);
});
test('CLI errors do not disclose private paths or image names',t=>{
  const vault=path.join(temp(t),'SYNTHETIC-PRIVATE-OWNER'),cli=path.join(root,'scripts/specimen-intake.mjs');
  const r=spawnSync(process.execPath,[cli,'audit','--vault',vault,'--intake','wrong'],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(r.stdout.includes(vault),false);const out=JSON.parse(r.stdout);assert.equal(out.identity,null);assert.equal(out.valuation_allowed,false);assert.equal(out.ready_for_physical_pilot,false);
});
