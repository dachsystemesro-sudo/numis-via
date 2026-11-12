import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePilot,TARGET_IDS} from '../scripts/pilot-benchmark.mjs';
import {validatePilotInputs} from '../scripts/pilot-preflight.mjs';
import {syntheticFixture,syntheticRun,sealFixture} from '../fixtures/pilot-synthetic.mjs';
import {auditReadiness} from '../scripts/audit-readiness.mjs';
import catalogue from '../data/catalogue.json' with {type:'json'};
import pilot from '../data/pilot/sk-eurocents.json' with {type:'json'};
import sources from '../data/pilot/sources.json' with {type:'json'};

// Contract scoring only; generated synthetic replies are never real-image evidence.
function fixture(){const f=syntheticFixture();const report=validatePilotInputs(f.input);return {...f,report,run:syntheticRun(f,report)};}
test('complete synthetic positive control scores but cannot claim measured accuracy',()=>{
  const f=fixture(),r=evaluatePilot(f.input,f.run,f.report);
  assert.equal(r.accepted,true,JSON.stringify(r.errors));assert.equal(r.measurement_status,'SYNTHETIC_ONLY');assert.equal(r.empirical_accepted,false);assert.equal(r.ready_for_physical_pilot,false);
});
for(const [name,mutate] of Object.entries({
  empty:f=>{f.input.manifest.cases=[];f.input.labels.cases=[];f.run.results=[];},
  always_blocked:f=>{for(const r of f.run.results)r.body={coinprint_version:f.input.config.coinprint_version,status:'BLOCKED',valuation_allowed:false,identity:null,blockers:['SYNTHETIC']};},
  false_confirmation:f=>{f.run.results.at(-1).http_status=200;f.run.results.at(-1).body={coinprint_version:f.input.config.coinprint_version,status:'VERIFIED',valuation_allowed:true,identity:{catalogue_id:TARGET_IDS[0]},blockers:[]};},
  wrong_identity:f=>{f.run.results[0].body.identity.catalogue_id=TARGET_IDS[1];},
  blocked_valuation:f=>{f.run.results[91].body.valuation_allowed=true;},
  blocked_identity:f=>{f.run.results[91].body.identity={catalogue_id:TARGET_IDS[0]};},
  missing_response:f=>{f.run.results.pop();},
  duplicate_result:f=>{f.run.results[1]=f.run.results[0];},
  leaked_specimen:f=>{f.input.separation.training.specimen_ids=[f.input.manifest.cases[0].specimen_id];},
  leaked_reference_image:f=>{f.input.separation.reference.image_sha256=[f.input.manifest.cases[0].images[0].sha256];},
  duplicate_specimen:f=>{f.input.manifest.cases[1].specimen_id=f.input.manifest.cases[0].specimen_id;},
  unlocked:f=>{f.input.manifest.status='PENDING_COLLECTION';},
  changed_manifest:f=>{f.run.manifest_sha256='a'.repeat(64);},
  changed_catalogue:f=>{f.run.reference_sha256='a'.repeat(64);},
  changed_model_configuration:f=>{f.run.models.primary='OTHER/model';},
  changed_config_hash:f=>{f.run.config_sha256='a'.repeat(64);},
  changed_label_seal:f=>{f.run.labels_sha256='a'.repeat(64);},
  changed_runtime_attestation:f=>{f.run.runtime_sha256='a'.repeat(64);},
  changed_asset_inventory:f=>{f.run.asset_inventory_sha256='a'.repeat(64);},
  errors_not_abstentions:f=>{f.run.results.at(-1).http_status=500;},
  missing_category:f=>{f.input.labels.cases.at(-1).category='unsupported';},
  wrong_runtime_version:f=>{f.run.results[0].body.coinprint_version='OTHER';},
  results_predate_runtime_review:f=>{f.run.started_at='2026-11-12T00:00:00Z';}
}))test('benchmark refuses '+name,()=>{
  const f=fixture();mutate(f);sealFixture(f);const r=evaluatePilot(f.input,f.run,validatePilotInputs(f.input));assert.equal(r.accepted,false);assert.equal(r.empirical_accepted,false);
});
test('80 percent is required independently for EVERY variant',()=>{
  const f=fixture();
  const block=i=>{f.run.results[i].body={coinprint_version:f.input.config.coinprint_version,status:'BLOCKED',valuation_allowed:false,identity:null,blockers:['SYNTHETIC']};};
  block(0);block(1);assert.equal(evaluatePilot(f.input,f.run,f.report).accepted,true);
  block(2);assert.equal(evaluatePilot(f.input,f.run,f.report).accepted,false);
});
test('missing-side HTTP 400 is safe but cannot hide a false VERIFIED',()=>{
  const f=fixture();assert.equal(evaluatePilot(f.input,f.run,f.report).accepted,true);
  f.run.results.at(-1).body={status:'VERIFIED',valuation_allowed:true,identity:{catalogue_id:TARGET_IDS[0]}};
  const r=evaluatePilot(f.input,f.run,f.report);assert.equal(r.accepted,false);assert.equal(r.critical_errors,1);
});
test('zero cases means NOT MEASURED and no acceptance',()=>{
  const f=fixture();f.input.manifest.cases=[];f.input.labels.cases=[];sealFixture(f);
  const r=evaluatePilot(f.input,{},validatePilotInputs(f.input));assert.equal(r.measurement_status,'NOT_MEASURED');assert.equal(r.accepted,false);
});
test('audit cannot mark empty, missing or merely ticked checklist ready',()=>{
  for(const checklist of ['', '## READY FOR PHYSICAL PILOT\n## PHYSICAL PILOT', '## READY FOR PHYSICAL PILOT\n'+('- [x] fixture\n'.repeat(11))+'## PHYSICAL PILOT']){
    const result=auditReadiness({catalogue,state:{},pilot,sources,checklist});assert.equal(result.readiness.ready_for_physical_pilot,false);
  }
});
test('audit fails integrity for an asserted verified record without actual evidence',()=>{
  const fake={...pilot.records[0],verification_state:'verified_reference'};
  const result=auditReadiness({catalogue:{...catalogue,records:[...catalogue.records,fake]},state:{},pilot,sources,checklist:''});assert.equal(result.integrity_passed,false);
});

test('malformed expected identity cannot pollute prototype or be accepted',()=>{
  const f=fixture();f.input.labels.cases[90].expected_catalogue_id='__proto__';sealFixture(f);
  const before=Object.prototype.total;
  assert.equal(evaluatePilot(f.input,f.run,validatePilotInputs(f.input)).accepted,false);
  assert.equal(Object.prototype.total,before);
});

test('an unmatched extra false confirmation is counted as critical, never hidden',()=>{
  const f=fixture();f.run.results.push({case_id:'UNMATCHED',http_status:200,body:{status:'VERIFIED',valuation_allowed:true,identity:{catalogue_id:TARGET_IDS[0]},blockers:[]}});
  const r=evaluatePilot(f.input,f.run,f.report);assert.equal(r.accepted,false);assert.equal(r.critical_errors,1);
});
