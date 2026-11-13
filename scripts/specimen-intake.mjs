import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {PILOT_FIELDS} from '../api/pilot-reference.js';
import {denominationPhysicalGate} from '../api/catalogue.js';
import {timestamp} from './pilot-contract.mjs';
import {createVault,checkVault,checkStorage,privateRead,privateWrite,privateDir} from './intake-storage.mjs';

export const TARGET='SK-EUR-001-2020-PILOT';
export const ROLES=['national_full','common_full','year_detail','mint_mark_detail','engraver_mark_detail','symbols_detail','edge'];
const MAX_BYTES=10*1024*1024;
const hash=x=>createHash('sha256').update(x).digest('hex');
const json=x=>Buffer.from(JSON.stringify(x,null,2)+'\n');
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2048;
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const failClosed={identity:null,valuation_allowed:false,ready_for_physical_pilot:false,verification_state:'needs_reference_review'};
const now=()=>new Date().toISOString();
const readJSON=(root,file)=>JSON.parse(privateRead(root,file));
const measured=()=>({readings:[null,null,null],uncertainty:null,method:null,instrument:{id:null,resolution:null,calibration:{checked_at:null,valid_until:null,document:null,sha256:null},zero_before:null,zero_after:null}});
const reviewForm=()=>({reviewer_ref:null,independence_basis:null,independent_of_operator:null,independent_of_other_reviewer:null,reviewed_at:null,manifest_sha256:null,dossier_content_sha256:null,signed_report:{document:null,sha256:null},observations:Object.fromEntries([...PILOT_FIELDS,'micro_symbols'].map(f=>[f,null]))});
export const dossierContentHash=d=>{const {reviews,final_decision,...content}=d;return hash(json(content));};

export function templates(specimen_id='NV-'+randomUUID(),session_id='SESSION-'+randomUUID()){
  return {
    specimen:{schema_version:'1.0',target_variant:TARGET,specimen_id,session_id,created_at:now(),...failClosed},
    capture:{schema_version:'1.0',target_variant:TARGET,specimen_id,session_id,images:[],capture_check:{reviewer_ref:null,reviewed_at:null,same_specimen_confirmed:null,year_legibility:'pending',year_transcription:null,whole_sides_visible:null,decisive_details_visible:null,local_processing_authorized:null}},
    dossier:{schema_version:'1.0',target_variant:TARGET,specimen_id,provenance:{owner_ref:null,obtained_at:null,source_ref:null,condition:null,finish:null},rights:{photographer_ref:null,metadata_basis:null,image_basis:null,consent:{document:null,sha256:null},retention_until:null},measurements:{mass_g:measured(),diameter_mm:measured(),thickness_mm:measured()},reviews:[reviewForm(),reviewForm()],conflicts:[],final_decision:{status:'pending',authority_ref:null,reviewed_at:null,manifest_sha256:null,dossier_content_sha256:null,document:null,sha256:null},sources:[],model_selection:{image_ids:[],coverage_review:{status:'pending',reviewer_ref:null,reviewed_at:null}},...failClosed}
  };
}
export function initIntake(vault){
  const root=createVault(vault),t=templates();
  for(const name of ['incoming','documents','intakes'])privateDir(root,name);
  for(const [name,data] of Object.entries(t))privateWrite(root,name+'.json',json(data));
  return {created:true,specimen_id:t.specimen.specimen_id,...failClosed};
}
export function prepareCapture(vault,name='capture-draft.json'){
  const root=checkVault(vault),specimen=readJSON(root,'specimen.json');auditOriginal(specimen);
  if(!/^[A-Za-z0-9_-]+\.json$/.test(name))throw Error('capture_filename_invalid');
  checkStorage(path.join(root,'incoming'));
  const files=fs.readdirSync(path.join(root,'incoming')).sort();
  if(files.length<5||files.length>30)throw Error('archive_photo_count');
  const capture=templates(specimen.specimen_id,specimen.session_id).capture;
  capture.images=files.map((filename,i)=>{
    if(!/^[-A-Za-z0-9_. ]+\.(jpg|jpeg|png|webp)$/i.test(filename)||filename.startsWith('.'))throw Error('photo_id_or_filename');
    checkStorage(path.join(root,'incoming',filename));
    return {id:'PHOTO-'+String(i+1).padStart(3,'0'),filename,specimen_id:specimen.specimen_id,session_id:specimen.session_id,captured_at:null,roles:[]};
  });
  privateWrite(root,name,json(capture));return {prepared:true,photos:files.length,capture_file:name,human_capture_check_required:true,...failClosed};
}
export function validateCapture(plan,specimen){
  const errors=[];
  if(plan?.schema_version!=='1.0'||plan.target_variant!==TARGET||plan.specimen_id!==specimen.specimen_id||plan.session_id!==specimen.session_id)errors.push('capture_binding_mismatch');
  const images=Array.isArray(plan?.images)?plan.images:[];
  if(images.length<5||images.length>30)errors.push('archive_photo_count');
  const ids=new Set(),names=new Set(),roles=new Set();
  for(const image of images){
    if(!text(image?.id)||!/^[A-Za-z0-9_-]{1,80}$/.test(image.id)||ids.has(image.id)||!text(image.filename)||!/^[-A-Za-z0-9_. ]+\.(?:jpg|jpeg|png|webp)$/i.test(image.filename)||image.filename.startsWith('.')||names.has(image.filename.toLowerCase()))errors.push('photo_id_or_filename');
    ids.add(image?.id);names.add(image?.filename?.toLowerCase());
    if(image?.specimen_id!==specimen.specimen_id||image?.session_id!==specimen.session_id)errors.push('mixed_specimen_or_session');
    if(!timestamp(image?.captured_at)||Date.parse(image.captured_at)>Date.now())errors.push('capture_time_invalid');
    if(!Array.isArray(image?.roles)||!image.roles.length||new Set(image.roles).size!==image.roles.length||image.roles.some(r=>!ROLES.includes(r)))errors.push('photo_role_invalid');
    for(const role of image?.roles??[])roles.add(role);
    if(image?.roles?.includes('national_full')&&image.roles.includes('common_full'))errors.push('both_sides_in_one_image');
    if(image?.roles?.some(r=>['national_full','common_full'].includes(r))&&image.roles.some(r=>!['national_full','common_full'].includes(r)))errors.push('whole_side_is_not_a_macro_or_edge');
  }
  if(ROLES.some(r=>!roles.has(r)))errors.push('required_view_missing');
  const c=plan?.capture_check;
  if(!text(c?.reviewer_ref)||!timestamp(c?.reviewed_at)||Date.parse(c.reviewed_at)>Date.now()||images.some(i=>Date.parse(i.captured_at)>Date.parse(c.reviewed_at))||c.same_specimen_confirmed!==true||c.whole_sides_visible!==true||c.decisive_details_visible!==true||c.local_processing_authorized!==true)errors.push('human_capture_check_required');
  if(c?.year_legibility!=='readable'||c?.year_transcription!=='2020')errors.push('year_not_readably_2020');
  return {valid:errors.length===0,errors:[...new Set(errors)]};
}
export async function decodePhoto(bytes,filename,{working:workingCopy=false}={}){
  if(bytes.length===0||bytes.length>(workingCopy?110*1024*1024:MAX_BYTES))throw Error('photo_size_invalid');
  const decoder=sharp(bytes,{failOn:'warning',limitInputPixels:25000000});
  const m=await decoder.metadata();
  const ext=path.extname(filename).toLowerCase(),allowed={jpeg:['.jpg','.jpeg'],png:['.png'],webp:['.webp']};
  if(!allowed[m.format]?.includes(ext)||(m.pages??1)!==1||m.width<512||m.height<512)throw Error('photo_format_animation_or_resolution');
  // EXIF orientation is applied geometrically; no crop, synthesis, retouching,
  // sharpening or upscaling. All decodable pixels are fully read before writing.
  const raw=await decoder.rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const width=raw.info.width,height=raw.info.height;
  const working=await sharp(raw.data,{raw:{width,height,channels:4}}).png().toBuffer();
  const clean=await sharp(working).metadata();
  if(clean.exif||clean.xmp||clean.iptc||clean.icc||clean.comments?.length)throw Error('working_metadata_not_removed');
  return {original_sha256:hash(bytes),pixel_sha256:hash(Buffer.concat([Buffer.from(`${width}x${height}:rgba\0`),raw.data])),working_sha256:hash(working),width,height,working,transformation:'EXIF_orientation_to_sRGB_RGBA_lossless_PNG_metadata_removed'};
}
function auditOriginal(specimen){
  if(specimen?.schema_version!=='1.0'||specimen.target_variant!==TARGET||!/^NV-[a-f0-9-]{36}$/.test(specimen.specimen_id)||!/^SESSION-[a-f0-9-]{36}$/.test(specimen.session_id)||!timestamp(specimen.created_at)||specimen.identity!==null||specimen.valuation_allowed!==false||specimen.ready_for_physical_pilot!==false||specimen.verification_state!=='needs_reference_review')throw Error('specimen_record_invalid');
}
export async function importPhotos(vault,{capture='capture.json'}={}){
  const root=checkVault(vault),specimen=readJSON(root,'specimen.json'),planRaw=privateRead(root,capture),plan=JSON.parse(planRaw);auditOriginal(specimen);
  const validation=validateCapture(plan,specimen);if(!validation.valid)throw Error(validation.errors.join(','));
  // A shared lock rejects concurrent imports. Decode every input first so a bad
  // LAST photograph cannot leave a partially accepted collection.
  privateWrite(root,'.import-lock',Buffer.from('locked'));
  let stage;
  try{
    const decoded=[],originals=new Set(),pixels=new Set();let retainedBytes=0;
    const previous=fs.readdirSync(path.join(root,'intakes')).filter(n=>/^INTAKE-[a-f0-9-]+$/.test(n));
    for(const name of previous){const old=await inspectIntake(root,name);for(const p of old.images){originals.add(p.original_sha256);pixels.add(p.pixel_sha256);}}
    for(const image of plan.images){
      const source=privateRead(root,'incoming/'+image.filename,MAX_BYTES),photo=await decodePhoto(source,image.filename);
      retainedBytes+=source.length+photo.working.length;if(retainedBytes>128*1024*1024)throw Error('archive_batch_size_exceeded');
      if(originals.has(photo.original_sha256)||pixels.has(photo.pixel_sha256))throw Error('duplicate_bytes_or_pixels');
      originals.add(photo.original_sha256);pixels.add(photo.pixel_sha256);decoded.push({image,source,photo});
    }
    checkVault(root);
    const intake_id='INTAKE-'+randomUUID();stage=privateDir(path.join(root,'intakes'),'.pending-'+randomUUID());
    privateDir(stage,'originals');privateDir(stage,'working');
    const manifest={schema_version:'1.0',target_variant:TARGET,specimen_id:specimen.specimen_id,session_id:specimen.session_id,intake_id,imported_at:now(),capture_sha256:hash(planRaw),human_capture_check:plan.capture_check,images:[],...failClosed};
    privateWrite(stage,'capture.json',planRaw);
    for(const {image,source,photo} of decoded){
      const original='originals/'+image.id+path.extname(image.filename).toLowerCase(),working='working/'+image.id+'.png';
      privateWrite(stage,original,source);privateWrite(stage,working,photo.working);
      const {working:buffer,...proof}=photo;
      manifest.images.push({id:image.id,roles:image.roles,specimen_id:specimen.specimen_id,session_id:specimen.session_id,original,working,working_bytes:buffer.length,...proof});
    }
    privateWrite(stage,'manifest.json',json(manifest));
    await inspectIntakeFolder(stage,specimen);
    const destination=path.join(root,'intakes',intake_id);fs.renameSync(stage,destination);stage=null;checkStorage(destination);
    return {imported:true,intake_id,photos:manifest.images.length,manifest_sha256:hash(json(manifest)),...failClosed};
  }finally{if(stage)fs.rmSync(stage,{recursive:true,force:true});fs.unlinkSync(path.join(root,'.import-lock'));}
}
async function inspectIntakeFolder(folder,specimen){
  checkStorage(folder);const manifest=readJSON(folder,'manifest.json'),planRaw=privateRead(folder,'capture.json'),plan=JSON.parse(planRaw);
  if(manifest.specimen_id!==specimen.specimen_id||manifest.session_id!==specimen.session_id||manifest.target_variant!==TARGET||manifest.identity!==null||manifest.valuation_allowed!==false||manifest.ready_for_physical_pilot!==false||manifest.verification_state!=='needs_reference_review'||manifest.capture_sha256!==hash(planRaw)||!validateCapture(plan,specimen).valid||!Array.isArray(manifest.images)||manifest.images.length!==plan.images.length)throw Error('intake_manifest_invalid');
  const seen=new Set();
  for(const image of manifest.images){
    const planned=plan.images.find(p=>p.id===image.id);
    if(!planned||seen.has(image.id)||image.specimen_id!==specimen.specimen_id||image.session_id!==specimen.session_id||JSON.stringify(image.roles)!==JSON.stringify(planned.roles)||image.original!=='originals/'+image.id+path.extname(planned.filename).toLowerCase()||image.working!=='working/'+image.id+'.png')throw Error('intake_photo_binding');
    seen.add(image.id);
    const photo=await decodePhoto(privateRead(folder,image.original,MAX_BYTES),planned.filename);
    const retainedWorking=privateRead(folder,image.working,110*1024*1024);
    if(photo.original_sha256!==image.original_sha256||photo.pixel_sha256!==image.pixel_sha256||hash(retainedWorking)!==image.working_sha256||retainedWorking.length!==image.working_bytes)throw Error('intake_integrity');
    // Verify the retained working file itself, not merely its recorded digest.
    const work=await decodePhoto(privateRead(folder,image.working,110*1024*1024),image.working,{working:true});
    if(work.pixel_sha256!==photo.pixel_sha256)throw Error('working_pixels_changed');
  }
  return manifest;
}
export async function inspectIntake(root,id){
  if(!/^INTAKE-[a-f0-9-]{36}$/.test(id))throw Error('intake_id_invalid');
  const specimen=readJSON(root,'specimen.json');auditOriginal(specimen);return inspectIntakeFolder(path.join(root,'intakes',id),specimen);
}
function documentProof(root,entry){
  try{if(!digest(entry?.sha256)||!/^documents\/[A-Za-z0-9_. -]+\.(?:pdf|txt|json|png|jpg|jpeg)$/i.test(entry?.document??''))return false;return hash(privateRead(root,entry.document,MAX_BYTES))===entry.sha256;}catch{return false;}
}
export function auditDossier(root,dossier,manifest,manifestHash,clock=now()){
  const errors=[],means={},contentHash=dossierContentHash(dossier);
  if(dossier?.schema_version!=='1.0'||dossier.target_variant!==TARGET||dossier.specimen_id!==manifest.specimen_id||dossier.identity!==null||dossier.valuation_allowed!==false||dossier.ready_for_physical_pilot!==false||dossier.verification_state!=='needs_reference_review')errors.push('dossier_binding');
  const p=dossier?.provenance,r=dossier?.rights;
  if(!text(p?.owner_ref)||!timestamp(p?.obtained_at)||Date.parse(p.obtained_at)>Date.parse(clock)||!text(p?.source_ref)||!text(p?.condition)||!text(p?.finish))errors.push('provenance_missing');
  if(!text(r?.photographer_ref)||!text(r?.metadata_basis)||!text(r?.image_basis)||!documentProof(root,r?.consent)||!timestamp(r?.retention_until)||Date.parse(r.retention_until)<=Date.parse(clock))errors.push('rights_or_consent_missing');
  for(const key of ['mass_g','diameter_mm','thickness_mm']){
    const m=dossier?.measurements?.[key],i=m?.instrument,c=i?.calibration;
    if(!Array.isArray(m?.readings)||m.readings.length<3||m.readings.length>10||m.readings.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<=0)||typeof m.uncertainty!=='number'||!Number.isFinite(m.uncertainty)||m.uncertainty<=0||!text(m.method)||!text(i?.id)||typeof i?.resolution!=='number'||!Number.isFinite(i.resolution)||i.resolution<=0||i.zero_before!==true||i.zero_after!==true||!timestamp(c?.checked_at)||Date.parse(c.checked_at)>Date.parse(clock)||!timestamp(c?.valid_until)||Date.parse(c.valid_until)<=Date.parse(clock)||!documentProof(root,c))errors.push('measurement_incomplete:'+key);
    else means[key]=m.readings.reduce((a,b)=>a+b,0)/m.readings.length;
  }
  if(Object.keys(means).length===3&&denominationPhysicalGate({value:'1 cent'},means).passed!==true)errors.push('measurements_contradict_target');
  const fields=[...PILOT_FIELDS,'micro_symbols'],reviews=Array.isArray(dossier?.reviews)?dossier.reviews:[];
  const completeObservation=v=>fields.every(f=>f.startsWith('physical.')?typeof v.observations?.[f]==='number'&&Number.isFinite(v.observations[f])&&v.observations[f]>0:text(v.observations?.[f])&&!/\?|\bunknown\b|\bunreadable\b|nečitateľ/iu.test(v.observations[f]))&&v.observations.country_code==='SK'&&v.observations.country_text==='SLOVENSKO'&&v.observations.date==='2020'&&v.observations.denomination==='1 cent';
  const completed=reviews.filter(v=>text(v?.reviewer_ref)&&v.reviewer_ref!==manifest.human_capture_check.reviewer_ref&&text(v.independence_basis)&&v.independent_of_operator===true&&v.independent_of_other_reviewer===true&&timestamp(v.reviewed_at)&&Date.parse(v.reviewed_at)<=Date.parse(clock)&&Date.parse(v.reviewed_at)>=Date.parse(manifest.imported_at)&&v.manifest_sha256===manifestHash&&v.dossier_content_sha256===contentHash&&documentProof(root,v.signed_report)&&completeObservation(v));
  if(reviews.length!==2||completed.length!==2||new Set(completed.map(v=>v.reviewer_ref)).size!==2||new Set(completed.map(v=>v.signed_report.sha256)).size!==2)errors.push('two_independent_signed_reviews_required');
  if(fields.some(f=>new Set(reviews.map(v=>v?.observations?.[f]).filter(v=>v!=null&&v!=='').map(v=>JSON.stringify(v))).size>1))errors.push('expert_conflict');
  // Machine floating-point noise only, not a physical tolerance or rounding of
  // evidence to a nominal value. Actual means must agree with both reports.
  if(completed.some(v=>Object.entries(means).some(([key,value])=>Math.abs(v.observations['physical.'+key]-value)>8*Number.EPSILON*Math.max(1,Math.abs(value)))))errors.push('expert_measurement_conflict');
  if(!Array.isArray(dossier?.conflicts)||dossier.conflicts.length)errors.push('conflicts_unresolved');
  const decision=dossier?.final_decision;
  if(decision?.status!=='approved'||!text(decision.authority_ref)||!timestamp(decision.reviewed_at)||Date.parse(decision.reviewed_at)>Date.parse(clock)||Date.parse(decision.reviewed_at)<Date.parse(manifest.imported_at)||completed.some(v=>Date.parse(v.reviewed_at)>Date.parse(decision.reviewed_at))||decision.manifest_sha256!==manifestHash||decision.dossier_content_sha256!==contentHash||!documentProof(root,decision))errors.push('final_signed_decision_missing');
  const sources=Array.isArray(dossier?.sources)?dossier.sources:[];
  if(!sources.length||sources.some(s=>{try{const u=new URL(s.url);return u.protocol!=='https:'||u.username||u.password||!text(s.publisher)||!text(s.locator)||!text(s.license_basis)||!documentProof(root,s);}catch{return true;}}))errors.push('original_sources_and_rights_missing');
  const selected=dossier?.model_selection,ids=selected?.image_ids??[],coverage=new Set();
  if(Array.isArray(ids))for(const id of ids)for(const role of manifest.images.find(p=>p.id===id)?.roles??[])coverage.add(role);
  const modelValid=Array.isArray(ids)&&ids.length>=2&&ids.length<=5&&new Set(ids).size===ids.length&&ids.every(id=>manifest.images.some(p=>p.id===id))&&manifest.images.find(p=>p.id===ids[0])?.roles.includes('common_full')&&manifest.images.find(p=>p.id===ids[1])?.roles.includes('national_full')&&ROLES.every(r=>coverage.has(r))&&selected.coverage_review?.status==='approved'&&text(selected.coverage_review.reviewer_ref)&&timestamp(selected.coverage_review.reviewed_at);
  if(!modelValid)errors.push('five_image_decisive_coverage_not_approved');
  const selectedImages=Array.isArray(ids)?ids.map(id=>manifest.images.find(p=>p.id===id)):[];
  if(selectedImages.some(p=>!Number.isInteger(p?.working_bytes)||p.working_bytes<=0)||selectedImages.reduce((n,p)=>n+Math.ceil((p?.working_bytes??0)/3)*4+128,2048)>4*1024*1024)errors.push('model_payload_size_not_eligible');
  return {documentation_complete:errors.length===0,errors:[...new Set(errors)],dossier_content_sha256:contentHash,measured_means:means,expert_signature_authenticity:'HUMAN_VERIFICATION_REQUIRED',independence_truth:'HUMAN_VERIFICATION_REQUIRED',reference_approval:'NOT_PERFORMED',model_request_status:'BLOCKED',...failClosed};
}
export async function auditIntake(vault,id){
  const root=checkVault(vault),manifest=await inspectIntake(root,id),dossier=readJSON(root,'dossier.json');
  return auditDossier(root,dossier,manifest,hash(privateRead(path.join(root,'intakes',id),'manifest.json')));
}
export async function main(args){
  const {values,positionals}=parseArgs({args,allowPositionals:true,options:{vault:{type:'string'},intake:{type:'string'},capture:{type:'string'}}});
  if(!values.vault)throw Error('vault_required');
  let result;
  if(positionals[0]==='init')result=initIntake(values.vault);
  else if(positionals[0]==='prepare')result=prepareCapture(values.vault,values.capture??'capture-draft.json');
  else if(positionals[0]==='import')result=await importPhotos(values.vault,{capture:values.capture??'capture.json'});
  else if(positionals[0]==='audit')result=await auditIntake(values.vault,values.intake);
  else throw Error('command_required_init_prepare_import_audit');
  console.log(JSON.stringify(result,null,2));return result.documentation_complete===false?1:0;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{process.exitCode=await main(process.argv.slice(2));}catch(e){console.log(JSON.stringify({valid:false,error:/^[a-z_0-9]+(?::[a-z_0-9]+)?(?:,[a-z_0-9]+(?::[a-z_0-9]+)?)*$/.test(e.message)?e.message:'intake_rejected',remediation:'Pozrite docs/FIRST_SPECIMEN_SK_2020.md; existujuce ACL nemente bez schvalenia.',...failClosed}));process.exitCode=1;}}
