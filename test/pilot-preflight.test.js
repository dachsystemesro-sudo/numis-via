import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePilotInputs} from '../scripts/pilot-preflight.mjs';
import {sha256} from '../scripts/pilot-contract.mjs';
import {syntheticFixture,sealFixture} from '../fixtures/pilot-synthetic.mjs';

test('synthetic metadata positive control covers 90 supported and 30 negatives without execution',()=>{
  const r=validatePilotInputs(syntheticFixture().input);assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.supported_cases,90);assert.equal(r.negative_cases,30);assert.equal(r.ready_for_execution,false);assert.equal(r.measurement_status,'NOT_MEASURED');
});
for(const [name,mutate] of Object.entries({
  missing_front:f=>{f.input.manifest.cases[0].images.shift();},
  swapped_sides:f=>{f.input.manifest.cases[0].images.reverse();},
  same_side_twice:f=>{f.input.manifest.cases[0].images[1].view='obverse';},
  missing_requested_detail:f=>{f.input.manifest.cases[0].required_views.push('detail:mint_mark');},
  mismatched_specimen:f=>{f.input.manifest.cases[0].images[1].specimen_id='OTHER';},
  mismatched_capture_session:f=>{f.input.manifest.cases[0].images[1].capture_session_id='OTHER';},
  same_image_hash:f=>{f.input.manifest.cases[0].images[1].sha256=f.input.manifest.cases[0].images[0].sha256;},
  same_decoded_image:f=>{f.input.manifest.cases[0].images[1].pixel_sha256=f.input.manifest.cases[0].images[0].pixel_sha256;},
  reference_pixel_leak:f=>{f.input.separation.reference.pixel_sha256=[f.input.manifest.cases[0].images[0].pixel_sha256];},
  training_image_leak:f=>{f.input.separation.training.image_sha256=[f.input.manifest.cases[0].images[0].sha256];},
  incomplete_inventory:f=>{f.input.separation.complete=false;},
  invented_provider_training_knowledge:f=>{f.input.separation.provider_training_unknown=false;},
  invented_empty_inventory:f=>{delete f.input.separation.reference;},
  training_specimen_reuse:f=>{f.input.separation.training.specimen_ids=[f.input.manifest.cases[0].specimen_id];},
  labels_in_manifest:f=>{f.input.manifest.cases[0].expected_catalogue_id=f.input.labels.cases[0].expected_catalogue_id;},
  ambiguous_expected_year:f=>{f.input.labels.cases[0].expected_identity.date='2020 or 2021';},
  unsupported_positive_year:f=>{f.input.labels.cases[0].expected_catalogue_id='SK-EUR-001-2022-PILOT';},
  wrong_positive_country:f=>{f.input.labels.cases[0].expected_identity.country_code='SI';},
  negative_with_positive_identity:f=>{f.input.labels.cases[90].expected_catalogue_id=f.input.labels.cases[0].expected_catalogue_id;},
  negative_prototype_category:f=>{f.input.labels.cases[90].category='__proto__';},
  missing_negative_reason:f=>{delete f.input.labels.cases[90].reason;},
  conflicting_duplicate_label:f=>{f.input.labels.cases[1].case_id=f.input.labels.cases[0].case_id;},
  unsafe_relative_path:f=>{f.input.manifest.cases[0].images[0].path='../PRIVATE_NAME.png';},
  unknown_mime:f=>{f.input.manifest.cases[0].images[0].mime='image/svg+xml';},
  missing_rights:f=>{f.input.manifest.cases[0].rights.status='pending';},
  missing_retention:f=>{delete f.input.manifest.cases[0].rights.retention_until;},
  missing_privacy_review:f=>{f.input.manifest.cases[0].privacy.no_personal_data=false;},
  missing_expert_label:f=>{f.input.labels.cases[0].review.status='pending';},
  operator_labels_own_set:f=>{f.input.labels.cases[0].review.reviewer=f.input.manifest.operator;},
  reused_reference_capture:f=>{f.input.manifest.cases[0].provenance.dataset_role='reference';},
  unknown_capture_source:f=>{f.input.manifest.cases[0].provenance.original_capture=false;},
  missing_runtime_evidence:f=>{f.input.runtime.review.evidence_sha256=null;},
  lowered_request_policy:f=>{f.input.config.request_policy.passes=1;},
  future_capture:f=>{f.input.manifest.cases[0].provenance.captured_at='2027-01-01T00:00:00Z';},
  wrong_implementation:f=>{f.input.config.implementation_sha256='a'.repeat(64);},
  changed_decoder_or_node:f=>{f.input.config.evaluation_toolchain.sharp='OTHER';},
  malformed_measurement:f=>{f.input.manifest.cases[0].measurements={mass_g:[3.06]};}
}))test('preflight refuses '+name,()=>{
  const f=syntheticFixture();mutate(f);sealFixture(f);const r=validatePilotInputs(f.input);assert.equal(r.valid,false,JSON.stringify(r));assert.equal(r.ready_for_execution,false);
});
test('changing a model config file invalidates the frozen manifest binding',()=>{
  const f=syntheticFixture();f.input.config.models.primary='OTHER/model';f.input.hashes.config=sha256(JSON.stringify(f.input.config));assert.equal(validatePilotInputs(f.input).valid,false);
});
test('real execution requires the independently reviewed catalogue absent in PR21',()=>{
  const f=syntheticFixture();for(const k of ['manifest','labels','config','separation','runtime'])f.input[k].dataset_kind='real';f.input.config.endpoint='https://example.invalid/api/analyze';f.input.runtime.review.kind='operator_runtime_attestation';sealFixture(f);
  const r=validatePilotInputs(f.input);assert.equal(r.valid,false);assert.ok(r.errors.includes('verified_reference_set_missing'));
});
test('future runtime evidence cannot be used for an earlier preflight',()=>{
  const f=syntheticFixture();f.input.now='2026-11-12T00:00:00Z';assert.ok(validatePilotInputs(f.input).errors.includes('future_freeze_or_runtime'));
});
test('frozen rights that have since expired cannot authorize processing',()=>{
  const f=syntheticFixture();f.input.now='2028-01-01T00:00:00Z';assert.ok(validatePilotInputs(f.input).errors.includes('photo_rights_expired'));
});

for(const [index,value] of [null,[],{manifest:{cases:[null]}},{manifest:{cases:'private malformed data'}}].entries())test('malformed input '+index+' produces a safe deterministic report',()=>{
  const r=validatePilotInputs(value);assert.equal(r.valid,false);assert.equal(r.ready_for_execution,false);assert.equal(r.measurement_status,'NOT_MEASURED');
});
test('explicit requested edge and detail views can pass a synthetic structural control',()=>{
  const f=syntheticFixture(),sample=f.input.manifest.cases[0];
  for(const key of ['edge','detail:mint_mark']){
    const [view,detail_of]=key.split(':');
    sample.required_views.push(key);
    sample.images.push({...structuredClone(sample.images[0]),path:`images/synthetic-${view}.png`,view,...(detail_of?{detail_of}:{}),sha256:sha256('SYNTHETIC bytes '+key),pixel_sha256:sha256('SYNTHETIC pixels '+key)});
  }
  sealFixture(f);assert.equal(validatePilotInputs(f.input).valid,true);
});

test('normalized but impossible calendar dates cannot impersonate a frozen review chain',()=>{
  const f=syntheticFixture();
  for(const key of ['manifest','labels','config','separation','runtime'])f.input[key]=JSON.parse(JSON.stringify(f.input[key]).replaceAll('2026-11-12T','2026-02-30T'));
  sealFixture(f);assert.equal(validatePilotInputs(f.input).valid,false);
});
