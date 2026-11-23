import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewPilotReference,PILOT_FIELDS} from '../api/pilot-reference.js';
import pilot from '../data/pilot/sk-eurocents.json' with {type:'json'};
import sources from '../data/pilot/sources.json' with {type:'json'};
import {validateCatalogue} from '../api/catalogue-validator.js';
import {catalogueCandidates} from '../api/catalogue.js';
const fixture=()=>{
  const record={catalogue_id:'FIXTURE',label:'FIXTURE',sources:['a','b'],identity_level:'variant',verification_state:'verified_reference',country_code:'FIXTURE',country_text:'FIXTURE',denomination:'FIXTURE',date:'2020',main_motif:'FIXTURE',coat_of_arms:'FIXTURE',mint_mark:'FIXTURE',engraver_mark:'FIXTURE',geometry:'FIXTURE',edge:'FIXTURE',physical:{mass_g:1,diameter_mm:1,thickness_mm:1},rights:{metadata:{status:'approved',basis:'SYNTHETIC ONLY'},images:{status:'no_images_used'}},review:{status:'approved',reviewed_by:'FIXTURE',reviewed_at:'2026-11-09'}};
  const registry={sources:['a','b'].map(id=>({id,independence_group:id,supports:[...PILOT_FIELDS],urls:[`https://${id}.example/fixture`]}))};
  record.reference_evidence=PILOT_FIELDS.flatMap(field=>['a','b'].map(id=>({source_id:id,field,value:field.split('.').reduce((v,k)=>v[k],record),source_url:`https://${id}.example/fixture`,locator:'SYNTHETIC',snapshot_sha256:'a'.repeat(64),review_status:'approved',reviewed_by:'FIXTURE',reviewed_at:'2026-11-09'})));
  return {record,registry};
};
test('all nine proposed variants remain unverified and outside production',()=>{
  assert.equal(pilot.records.length,9);assert.equal(pilot.production_loaded,false);
  for(const r of pilot.records){assert.equal(r.verification_state,'needs_reference_review');assert.equal(reviewPilotReference(r,sources).valid,false);}
});
test('complete synthetic review trail validates without representing a coin',()=>{
  const {record,registry}=fixture();assert.deepEqual(reviewPilotReference(record,registry),{valid:true,errors:[]});assert.equal(validateCatalogue({schema_version:'1.1',records:[record]}).valid,true);
});
test('variant matching rejects ambiguous years, wrong geometry and unreadable decisive marks',()=>{
  const {record}=fixture();
  const features=Object.fromEntries(Object.entries(record).filter(([,v])=>typeof v==='string').map(([k,value])=>[k,{value}]));
  assert.equal(catalogueCandidates(features,{},[record])[0].checks.date,true);
  for(const value of ['2020–2021','2020?','about 2020']){
    const match=catalogueCandidates({...features,date:{value}}, {}, [record])[0];assert.equal(match.checks.date,false);
  }
  const wrong=catalogueCandidates({...features,geometry:{value:'OTHER'}},{},[record])[0];assert.ok(wrong.contradictions.includes('geometry'));
  record.decisive_discriminators=['mint_mark'];
  const missing=catalogueCandidates({...features,mint_mark:{value:null}},{},[record])[0];assert.ok(missing.missing.includes('mint_mark'));
});
for(const [name,mutate] of Object.entries({
  unknown_decisive_field:({record})=>{record.decisive_discriminators=['made_up'];},
  unsourced_symbols:({record})=>{record.micro_symbols='★';record.decisive_discriminators=['micro_symbols'];},
  nontext_geometry:({record})=>{record.geometry=false;for(const e of record.reference_evidence.filter(e=>e.field==='geometry'))e.value=false;},
  unlisted_evidence_source:({record})=>{record.sources=['OTHER'];},
  impossible_review_date:({record})=>{record.review.reviewed_at='2026-02-30';},
  approved_image_rights_without_basis:({record})=>{record.rights.images={status:'approved'};},
  malformed_reference_conflicts:({record})=>{record.reference_conflicts={critical:'wrong mark'};},
  mirror:({registry})=>{registry.sources[1].independence_group='a';},
  unrelated_source:({registry})=>{registry.sources[1].supports=['main_motif'];},
  undeclared_source_scope:({registry})=>{delete registry.sources[1].supports;},
  spoofed_url:({record})=>{record.reference_evidence[0].source_url='https://a.example.evil.test/fixture';},
  wrong_value:({record})=>{record.reference_evidence[0].value='OTHER';},
  missing_snapshot:({record})=>{delete record.reference_evidence[0].snapshot_sha256;},
  missing_mark:({record})=>{record.mint_mark=null;},
  ambiguous_year:({record})=>{record.date='2020–2021';},
  license_pending:({record})=>{record.rights.metadata.status='pending';},
  missing_review:({record})=>{record.review.status='pending';},
  missing_physical:({record})=>{record.physical.mass_g=0;}
}))test('reference review refuses '+name,()=>{const f=fixture();mutate(f);assert.equal(reviewPilotReference(f.record,f.registry).valid,false);});
test('optional decisive symbols need their own independent evidence and source scope',()=>{
  const {record,registry}=fixture();record.micro_symbols='★';record.decisive_discriminators=['micro_symbols'];
  assert.equal(reviewPilotReference(record,registry).valid,false);
  for(const source of registry.sources){
    source.supports.push('micro_symbols');
    record.reference_evidence.push({...record.reference_evidence.find(e=>e.source_id===source.id),field:'micro_symbols',value:'★'});
  }
  assert.deepEqual(reviewPilotReference(record,registry),{valid:true,errors:[]});
});
