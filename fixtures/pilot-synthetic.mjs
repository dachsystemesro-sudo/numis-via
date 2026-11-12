// Unit-test metadata and abstract solid-colour pixel buffers only. No real coin,
// photograph, expert review, runtime attestation or measured result is represented.
import fs from 'node:fs';
import {TARGET_IDS,NEGATIVE_CATEGORIES,sha256,identityFor,implementationHash,evaluationToolchain} from '../scripts/pilot-contract.mjs';
export const review=()=>({status:'approved',reviewer:'SYNTHETIC_REVIEWER',reviewed_at:'2026-11-12T00:01:00Z',evidence_sha256:sha256('SYNTHETIC ONLY')});
export function sealFixture(f){
  const h=f.input.hashes;
  for(const name of ['labels','config','separation']){f.raw[name]=Buffer.from(JSON.stringify(f.input[name]));h[name]=sha256(f.raw[name]);}
  h.reference=sha256(f.raw.reference);h.implementation=implementationHash();
  f.input.manifest.bindings=Object.fromEntries(['labels','config','reference','separation','implementation'].map(k=>[k+'_sha256',h[k]]));
  f.raw.manifest=Buffer.from(JSON.stringify(f.input.manifest));h.manifest=sha256(f.raw.manifest);
  Object.assign(f.input.runtime,Object.fromEntries(['labels','config','reference','separation','implementation','manifest'].map(k=>[k+'_sha256',h[k]])),{models:f.input.config.models,commit:f.input.config.commit,coinprint_version:f.input.config.coinprint_version,endpoint:f.input.config.endpoint});
  f.raw.runtime=Buffer.from(JSON.stringify(f.input.runtime));h.runtime=sha256(f.raw.runtime);
  return f;
}
export function syntheticFixture(){
  const reference=fs.readFileSync(new URL('../data/catalogue.json',import.meta.url));
  const manifest={schema_version:'2.0',dataset_kind:'synthetic_fixture',status:'LOCKED',locked_at:'2026-11-12T00:03:00Z',custodian:'SYNTHETIC_CUSTODIAN',operator:'SYNTHETIC_OPERATOR',cases:[]};
  const labels={schema_version:'2.0',dataset_kind:'synthetic_fixture',status:'SEALED',custodian:manifest.custodian,sealed_at:'2026-11-12T00:02:00Z',review:review(),cases:[]};
  const inventory=()=>({specimen_ids:[],image_sha256:[],pixel_sha256:[]});
  const separation={schema_version:'2.0',dataset_kind:'synthetic_fixture',status:'LOCKED',locked_at:'2026-11-12T00:02:00Z',scope:'project_controlled_known_data',provider_training_unknown:true,complete:true,review:review(),training:inventory(),reference:inventory()};
  const config={schema_version:'2.0',dataset_kind:'synthetic_fixture',frozen_at:'2026-11-12T00:02:00Z',commit:'a'.repeat(40),coinprint_version:'14.8.1',models:{primary:'SYNTHETIC/primary',micro:'SYNTHETIC/micro',verifier:'SYNTHETIC/verifier'},endpoint:'http://127.0.0.1:19333/api/analyze',request_policy:{temperature:0,passes:4,images_only:true},evaluation_toolchain:evaluationToolchain(),implementation_sha256:implementationHash()};
  const runtime={schema_version:'2.0',dataset_kind:'synthetic_fixture',observed_at:'2026-11-12T00:04:00Z',deployment_id:'SYNTHETIC_NOT_A_DEPLOYMENT',review:{...review(),reviewed_at:'2026-11-12T00:05:00Z',kind:'synthetic_fixture'}};
  let i=0;
  const add=(id,category)=>{
    i++;const case_id=`SYNTHETIC-CASE-${i}`,specimen_id=`SYNTHETIC-SPECIMEN-${i}`,session=`SYNTHETIC-SESSION-${i}`;
    // Far-future sentinel avoids clock-flaky positive tests. It is not a real
    // retention permission; the expiry regression supplies its own expired term.
    manifest.cases.push({case_id,specimen_id,provenance:{dataset_role:'blind_test',original_capture:true,captured_by:'SYNTHETIC',captured_at:'2026-11-12T00:00:00Z',capture_session_id:session},rights:{status:'approved',basis:'SYNTHETIC UNIT TEST ONLY',consent_ref:'SYNTHETIC',storage:'private',owner:'SYNTHETIC',retention_until:'2099-11-12T00:00:00Z'},privacy:{status:'approved',reviewed_by:'SYNTHETIC',no_personal_data:true,stripped_metadata:true},required_views:['obverse','reverse'],...(category==='missing_view'?{intentional_defect:'missing_view'}:{}),images:(category==='missing_view'?['obverse']:['obverse','reverse']).map(view=>({path:`images/${i}-${view}.png`,mime:'image/png',sha256:sha256(`SYNTHETIC BYTES ${i} ${view}`),pixel_sha256:sha256(`SYNTHETIC PIXELS ${i} ${view}`),view,specimen_id,capture_session_id:session,view_review:review()}))});
    labels.cases.push({case_id,category,expected_catalogue_id:id,expected_identity:id?identityFor(id):null,reason:id?null:'SYNTHETIC negative contract',review:review()});
  };
  for(const id of TARGET_IDS)for(let j=0;j<10;j++)add(id,'supported');
  for(const category of NEGATIVE_CATEGORIES)for(let j=0;j<5;j++)add(null,category);
  return sealFixture({input:{manifest,labels,config,separation,runtime,hashes:{},catalogue:JSON.parse(reference),sourceRegistry:{sources:[]}},raw:{reference}});
}
export function syntheticRun(f,preflight){
  return {schema_version:'2.0',dataset_kind:'synthetic_fixture',commit:f.input.config.commit,coinprint_version:f.input.config.coinprint_version,models:structuredClone(f.input.config.models),...Object.fromEntries(Object.entries(f.input.hashes).map(([k,v])=>[k+'_sha256',v])),asset_inventory_sha256:preflight.asset_inventory_sha256,started_at:'2026-11-12T00:06:00Z',finished_at:'2026-11-12T00:07:00Z',results:f.input.labels.cases.map(c=>({case_id:c.case_id,http_status:c.category==='missing_view'?400:200,body:c.category==='missing_view'?{error:'SYNTHETIC missing side'}:{coinprint_version:f.input.config.coinprint_version,status:c.expected_catalogue_id?'VERIFIED':'BLOCKED',valuation_allowed:Boolean(c.expected_catalogue_id),identity:c.expected_catalogue_id?{catalogue_id:c.expected_catalogue_id}:null,blockers:c.expected_catalogue_id?[]:['SYNTHETIC negative']}}))};
}
