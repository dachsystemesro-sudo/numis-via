import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueGate,denominationPhysicalGate} from '../api/catalogue.js';

const reference=(overrides={})=>({
  catalogue_id:'FIXTURE-VERIFIED',
  identity_level:'variant',
  verification_state:'verified_reference',
  score:100,
  contradictions:[],
  missing:[],
  sources:['fixture-source'],
  ...overrides
});

test('catalogue gate refuses an empty candidate list',()=>{
  assert.equal(catalogueGate([]).passed,false);
});

test('catalogue gate rejects staged, family and reference-only identities even with perfect scores',()=>{
  for(const record of [
    reference({verification_state:'staged'}),
    reference({verification_state:'reference_only'}),
    reference({identity_level:'family'})
  ])assert.equal(catalogueGate([record]).passed,false);
});

test('catalogue gate rejects contradictions, missing decisive features, weak score and absent provenance',()=>{
  for(const record of [
    reference({contradictions:['mint_mark']}),
    reference({missing:['date']}),
    reference({score:89}),
    reference({sources:[]})
  ])assert.equal(catalogueGate([record]).passed,false);
});

test('catalogue gate refuses two indistinguishable verified variants',()=>{
  const result=catalogueGate([reference(),reference({catalogue_id:'FIXTURE-SECOND',score:95})]);
  assert.equal(result.passed,false);
  assert.match(result.reason,/viac nerozlíšených variantov/);
});

test('catalogue gate selects a uniquely supported verified variant',()=>{
  const result=catalogueGate([reference(),reference({catalogue_id:'FIXTURE-SECOND',score:90})]);
  assert.equal(result.passed,true);
  assert.equal(result.record.catalogue_id,'FIXTURE-VERIFIED');
});

test('physical gate refuses contradictory or invalid observations',()=>{
  assert.equal(denominationPhysicalGate({value:'1 EUR'},{mass_g:8.50,diameter_mm:25.75,thickness_mm:2.20}).passed,false);
  for(const measurement of [0,-1,'not-a-number','Infinity']){
    assert.equal(denominationPhysicalGate({value:'2 EUR'},{mass_g:measurement}).passed,false);
  }
});
