import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {TARGET_IDS,NEGATIVE_CATEGORIES,sha256,isHash,text,timestamp,identityFor,same,implementationHash,evaluationToolchain} from './pilot-contract.mjs';
import {reviewPilotReference} from '../api/pilot-reference.js';

const MAX_CASES=1000,MAX_IMAGE_BYTES=10*1024*1024,MAX_REQUEST_BYTES=4*1024*1024;
const array=x=>Array.isArray(x)?x:[];
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const before=(a,b)=>timestamp(a)&&timestamp(b)&&Date.parse(a)<=Date.parse(b);
const reviewed=x=>x?.status==='approved'&&text(x.reviewer)&&timestamp(x.reviewed_at)&&isHash(x.evidence_sha256);
const unique=xs=>new Set(xs).size===xs.length;
const viewKey=i=>i?.view==='detail'?`detail:${i.detail_of}`:i?.view;
const view=k=>['obverse','reverse','edge'].includes(k)||/^detail:[a-z_]+$/.test(k??'');
const privateFile=p=>process.platform!=='win32'&&(fs.statSync(p).mode&0o077)===0;
const inventoryDigest=m=>sha256(JSON.stringify(array(m?.cases).map(c=>({case_id:c?.case_id,images:array(c?.images).map(i=>({sha256:i.sha256,pixel_sha256:i.pixel_sha256,view:viewKey(i)}))}))));

// Errors are stable codes only. Never include paths, identities, labels, image
// bytes, reviewer names or caught filesystem/decoder messages in console output.
function validateMetadata(input){
  const {manifest:m,labels:l,config:c,separation:s,runtime:r,hashes:h={},catalogue,sourceRegistry}=input??{};
  const errors=[];const fail=code=>errors.push(code);
  const cases=array(m?.cases),labels=array(l?.cases);
  const kind=m?.dataset_kind;
  if(m?.schema_version!=='2.0'||m.status!=='LOCKED'||!['real','synthetic_fixture'].includes(kind)||!timestamp(m.locked_at)||!text(m.custodian)||!text(m.operator)||m.operator===m.custodian)fail('manifest_not_frozen');
  if(cases.length>MAX_CASES)fail('case_limit');
  if(l?.schema_version!=='2.0'||l.status!=='SEALED'||l.dataset_kind!==kind||l.custodian!==m?.custodian||!reviewed(l.review)||!before(l.review.reviewed_at,l.sealed_at)||!before(l.sealed_at,m?.locked_at))fail('labels_not_sealed');
  if(c?.schema_version!=='2.0'||c.dataset_kind!==kind||!timestamp(c.frozen_at)||!before(c.frozen_at,m?.locked_at)||!/^[a-f0-9]{40}$/.test(c.commit??'')||!text(c.coinprint_version)||!['primary','micro','verifier'].every(k=>text(c.models?.[k]))||!same(c.request_policy,{temperature:0,passes:4,images_only:true}))fail('config_not_frozen');
  try{const u=new URL(c.endpoint);if((u.protocol!=='https:'&&!(kind==='synthetic_fixture'&&u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))||u.username||u.password||u.search||u.hash)fail('endpoint_invalid');}catch{fail('endpoint_invalid');}
  for(const name of ['reference','config','labels','separation','implementation'])if(!isHash(h[name])||m?.bindings?.[name+'_sha256']!==h[name])fail(name+'_hash_mismatch');
  if(input?.now&&(!before(m?.locked_at,input.now)||!before(r?.review?.reviewed_at,input.now)))fail('future_freeze_or_runtime');
  if(!isHash(h.manifest)||!isHash(h.runtime))fail('provenance_hash_missing');
  if(c?.implementation_sha256!==h.implementation)fail('implementation_changed');
  if(!same(c?.evaluation_toolchain,evaluationToolchain()))fail('evaluation_toolchain_changed');
  if(s?.schema_version!=='2.0'||s.status!=='LOCKED'||s.dataset_kind!==kind||s.scope!=='project_controlled_known_data'||s.provider_training_unknown!==true||s.complete!==true||!reviewed(s.review)||s.review.reviewer===m?.operator||!before(s.review.reviewed_at,s.locked_at)||!before(s.locked_at,m?.locked_at))fail('separation_not_attested');
  const sourceSpecimens=[],sourceHashes=[],sourcePixels=[];
  for(const role of ['training','reference']){
    const inventory=s?.[role];
    if(!object(inventory)||!['specimen_ids','image_sha256','pixel_sha256'].every(k=>Array.isArray(inventory[k])&&unique(inventory[k])))fail('separation_inventory_missing');
    sourceSpecimens.push(...array(inventory?.specimen_ids));sourceHashes.push(...array(inventory?.image_sha256));sourcePixels.push(...array(inventory?.pixel_sha256));
    if(array(inventory?.specimen_ids).some(x=>!text(x))||[...array(inventory?.image_sha256),...array(inventory?.pixel_sha256)].some(x=>!isHash(x)))fail('separation_inventory_invalid');
  }
  if(r?.schema_version!=='2.0'||r.dataset_kind!==kind||!reviewed(r.review)||r.review.kind!==(kind==='real'?'operator_runtime_attestation':'synthetic_fixture')||!text(r.deployment_id)||!before(m?.locked_at,r.observed_at)||!before(r.observed_at,r.review.reviewed_at)||r.commit!==c?.commit||r.coinprint_version!==c?.coinprint_version||!same(r.models,c?.models)||r.endpoint!==c?.endpoint)fail('runtime_attestation_missing');
  for(const name of ['manifest','labels','config','reference','separation','implementation'])if(r?.[name+'_sha256']!==h[name])fail('runtime_binding_mismatch');
  const caseIDs=cases.map(x=>x?.case_id),labelIDs=labels.map(x=>x?.case_id),specimens=cases.map(x=>x?.specimen_id);
  if(!unique(caseIDs)||!unique(labelIDs)||caseIDs.some(x=>!text(x))||labelIDs.some(x=>!text(x))||!same([...caseIDs].sort(),[...labelIDs].sort()))fail('case_label_set_mismatch');
  if(!unique(specimens)||specimens.some(x=>!text(x)||sourceSpecimens.includes(x)))fail('specimen_leakage_or_duplicate');
  const counts=Object.fromEntries(TARGET_IDS.map(id=>[id,0])),negative=Object.fromEntries(NEGATIVE_CATEGORIES.map(k=>[k,0]));
  const hashes=new Set(),pixels=new Set();
  for(const sample of cases){
    if(!object(sample)){fail('case_invalid');continue;}
    const label=labels.find(l=>l?.case_id===sample.case_id);
    if(!label){fail('label_missing');continue;}
    if(Object.hasOwn(sample,'expected_catalogue_id')||Object.hasOwn(sample,'category')||Object.hasOwn(sample,'expected_identity'))fail('labels_in_manifest');
    if(!reviewed(label.review)||label.review.reviewer===m?.operator||!before(sample.provenance?.captured_at,label.review.reviewed_at)||!before(label.review.reviewed_at,l?.sealed_at))fail('expert_label_review_missing');
    if(label.category==='supported'){
      if(!TARGET_IDS.includes(label.expected_catalogue_id)||!same(label.expected_identity,identityFor(label.expected_catalogue_id)))fail('supported_label_invalid');
      else counts[label.expected_catalogue_id]++;
    }else if(!NEGATIVE_CATEGORIES.includes(label.category)||label.expected_catalogue_id!==null||label.expected_identity!==null||!text(label.reason))fail('negative_label_invalid');
    else negative[label.category]++;
    const p=sample.provenance,rights=sample.rights,privacy=sample.privacy;
    if(p?.dataset_role!=='blind_test'||p.original_capture!==true||!text(p.captured_by)||!text(p.capture_session_id)||!before(p.captured_at,m?.locked_at))fail('capture_provenance_missing');
    if(rights?.status!=='approved'||!text(rights.basis)||!text(rights.consent_ref)||rights.storage!=='private'||!text(rights.owner)||!timestamp(rights.retention_until)||!before(m?.locked_at,rights.retention_until))fail('photo_rights_missing');
    if(input?.now&&timestamp(rights?.retention_until)&&Date.parse(input.now)>=Date.parse(rights.retention_until))fail('photo_rights_expired');
    if(privacy?.status!=='approved'||!text(privacy.reviewed_by)||privacy.no_personal_data!==true||privacy.stripped_metadata!==true)fail('privacy_review_missing');
    const images=array(sample.images),keys=images.map(viewKey),required=array(sample.required_views);
    if(images.length<1||images.length>5||!unique(keys)||!unique(required)||!required.includes('obverse')||!required.includes('reverse')||required.some(k=>!view(k)))fail('view_contract_invalid');
    if(label.category==='missing_view'){
      if(images.length!==1||!['obverse','reverse'].includes(keys[0])||sample.intentional_defect!=='missing_view'||required.some(k=>!['obverse','reverse'].includes(k)))fail('missing_view_negative_invalid');
    }else if(keys[0]!=='obverse'||keys[1]!=='reverse'||required.some(k=>!keys.includes(k))||sample.intentional_defect!=null)fail('required_view_missing_or_mismatched');
    for(const image of images){
      if(!object(image)){fail('image_metadata_invalid');continue;}
      const suffix={'image/jpeg':['.jpg','.jpeg'],'image/png':['.png'],'image/webp':['.webp']}[image.mime];
      if(!text(image.path)||path.isAbsolute(image.path)||image.path.includes('\\')||image.path.split('/').some(p=>p==='..'||p==='')||!suffix?.includes(path.extname(image.path).toLowerCase())||!view(viewKey(image)))fail('image_path_or_mime_invalid');
      if(image.specimen_id!==sample.specimen_id||image.capture_session_id!==p?.capture_session_id||!reviewed(image.view_review)||!before(image.view_review.reviewed_at,l?.sealed_at))fail('view_specimen_mismatch');
      if(!isHash(image.sha256)||hashes.has(image.sha256)||sourceHashes.includes(image.sha256))fail('image_hash_duplicate_or_leaked');
      if(!isHash(image.pixel_sha256)||pixels.has(image.pixel_sha256)||sourcePixels.includes(image.pixel_sha256))fail('image_pixels_duplicate_or_leaked');
      hashes.add(image.sha256);pixels.add(image.pixel_sha256);
    }
    if(sample.measurements!=null&&(!object(sample.measurements)||Object.entries(sample.measurements).some(([k,v])=>!['mass_g','diameter_mm','thickness_mm'].includes(k)||typeof v!=='number'||!Number.isFinite(v)||v<=0)))fail('measurements_invalid');
  }
  if(TARGET_IDS.some(id=>counts[id]<10))fail('minimum_10_per_variant');
  if(NEGATIVE_CATEGORIES.some(k=>negative[k]<5))fail('minimum_5_per_negative_category');
  if(kind==='real'&&TARGET_IDS.some(id=>!array(catalogue?.records).some(record=>record.catalogue_id===id&&reviewPilotReference(record,sourceRegistry).valid)))fail('verified_reference_set_missing');
  const uniqueErrors=[...new Set(errors)];
  return {schema_version:'2.0',phase:'metadata',valid:uniqueErrors.length===0,errors:uniqueErrors,dataset_kind:['real','synthetic_fixture'].includes(kind)?kind:null,cases:cases.length,supported_cases:Object.values(counts).reduce((a,b)=>a+b,0),negative_cases:Object.values(negative).reduce((a,b)=>a+b,0),coverage:counts,negative_categories:negative,assets_checked:false,asset_inventory_sha256:inventoryDigest(m),ready_for_execution:false,measurement_status:'NOT_MEASURED',ready_for_physical_pilot:false};
}

export function validatePilotInputs(input){
  try{return validateMetadata(input);}
  catch{return {schema_version:'2.0',phase:'metadata',valid:false,errors:['input_structure_invalid'],dataset_kind:null,cases:0,supported_cases:0,negative_cases:0,coverage:{},negative_categories:{},assets_checked:false,ready_for_execution:false,measurement_status:'NOT_MEASURED',ready_for_physical_pilot:false};}
}

export async function inspectAssets(manifest,root){
  const errors=[];let checked=0;const hashes=new Set(),pixels=new Set();
  const {default:sharp}=await import('sharp');
  const realRoot=fs.realpathSync(root);
  if(!privateFile(realRoot))errors.push('private_storage_permissions');
  for(const sample of array(manifest.cases)){
    let requestBytes=1024;
    for(const image of array(sample.images)){
      try{
        const resolved=path.resolve(realRoot,image.path),relative=path.relative(realRoot,resolved);
        if(relative.startsWith('..')||path.isAbsolute(relative)||fs.realpathSync(resolved)!==resolved)throw Error('path');
        const stat=fs.statSync(resolved);
        if(!stat.isFile()||stat.size===0||stat.size>MAX_IMAGE_BYTES)throw Error('size');
        if(!privateFile(resolved))errors.push('private_storage_permissions');
        const bytes=fs.readFileSync(resolved);
        const digest=sha256(bytes);if(digest!==image.sha256||hashes.has(digest))errors.push('asset_hash_mismatch_or_duplicate');hashes.add(digest);
        const decoder=sharp(bytes,{failOn:'warning',limitInputPixels:25000000});
        const metadata=await decoder.metadata();
        const mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[metadata.format];
        if(!mime||(metadata.pages??1)!==1){errors.push('asset_mime_or_animation_invalid');continue;}
        if(mime!==image.mime)errors.push('asset_mime_or_animation_invalid');
        if(metadata.exif?.length||metadata.xmp?.length||metadata.iptc?.length)errors.push('embedded_private_metadata');
        if(manifest.dataset_kind==='real'&&(!metadata.width||!metadata.height||metadata.width<512||metadata.height<512))errors.push('asset_resolution_too_small');
        const decoded=await decoder.toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
        const pixelHash=sha256(Buffer.concat([Buffer.from(`${decoded.info.width}x${decoded.info.height}:rgba\0`),decoded.data]));
        if(pixelHash!==image.pixel_sha256||pixels.has(pixelHash))errors.push('asset_pixels_mismatch_or_duplicate');pixels.add(pixelHash);
        requestBytes+=Math.ceil(bytes.length/3)*4+image.mime.length+32;checked++;
      }catch{errors.push('asset_missing_corrupt_or_unsafe');}
    }
    if(requestBytes>MAX_REQUEST_BYTES)errors.push('request_payload_too_large');
  }
  return {valid:errors.length===0,errors:[...new Set(errors)],checked};
}

export function parsePilotArgs(args,extra={}){
  return parseArgs({args,options:{manifest:{type:'string',default:'data/pilot/blind-manifest.json'},labels:{type:'string'},config:{type:'string'},separation:{type:'string'},runtime:{type:'string'},...extra},strict:true}).values;
}
export async function preflightFromFiles(options){
  const errors=[],input={now:new Date().toISOString()},hashes={};
  for(const role of ['manifest','labels','config','separation','runtime']){
    try{
      const file=options[role];if(!file||!privateFile(file)||!privateFile(path.dirname(path.resolve(file))))errors.push(role+'_private_file_required');
      const raw=fs.readFileSync(file);if(raw.length>16*1024*1024)throw Error('size');
      input[role]=JSON.parse(raw);hashes[role]=sha256(raw);
    }catch{errors.push(role+'_unavailable');input[role]={};}
  }
  const reference=fs.readFileSync(new URL('../data/catalogue.json',import.meta.url));
  input.catalogue=JSON.parse(reference);input.sourceRegistry=JSON.parse(fs.readFileSync(new URL('../data/pilot/sources.json',import.meta.url)));
  hashes.reference=sha256(reference);hashes.implementation=implementationHash();input.hashes=hashes;
  const report=validatePilotInputs(input);report.errors=[...new Set([...errors,...report.errors])];report.valid=report.errors.length===0;
  if(report.valid){
    const assets=await inspectAssets(input.manifest,path.dirname(path.resolve(options.manifest)));
    report.errors.push(...assets.errors);report.valid=assets.valid;report.assets_checked=assets.valid;report.phase='assets';report.ready_for_execution=assets.valid&&input.manifest.dataset_kind==='real';
  }
  const parent=path.dirname(path.resolve(options.manifest));
  return {input,report,root:fs.existsSync(parent)?fs.realpathSync(parent):parent};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const {report}=await preflightFromFiles(parsePilotArgs(process.argv.slice(2)));console.log(JSON.stringify(report,null,2));if(!report.valid)process.exitCode=1;}
  catch{console.log(JSON.stringify({valid:false,errors:['preflight_input_error'],measurement_status:'NOT_MEASURED',ready_for_physical_pilot:false}));process.exitCode=1;}
}
