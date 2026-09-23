import test from 'node:test';
import assert from 'node:assert/strict';
import {searchStaging} from '../api/staging-search.js';

const records=[
  {staging_id:'OCRE-1',source_id:'ocre',external_id:'ric.aug.1',source_url:'https://example/1',label:'Augustus type',denomination:'Denarius',material:'Silver',mint:'Rome',issuer:'Augustus',obverse_description:'Head right',reverse_description:'Temple'},
  {staging_id:'OCRE-2',source_id:'ocre',external_id:'ric.tib.1',source_url:'https://example/2',label:'Tiberius type',denomination:'Aureus',material:'Gold',mint:'Lugdunum',issuer:'Tiberius',obverse_description:'Head left',reverse_description:'Figure seated'}
];

test('finds a staging candidate across independent fields',()=>{
  const results=searchStaging(records,'Augustus silver');
  assert.equal(results.length,1);
  assert.equal(results[0].staging_id,'OCRE-1');
  assert.equal(results[0].valuation_allowed,false);
  assert.equal(results[0].identity_status,'reference_candidate');
});

test('requires every search token and caps the result limit',()=>{
  assert.equal(searchStaging(records,'Augustus gold').length,0);
  assert.equal(searchStaging(records,'type',{limit:1}).length,1);
});

test('ignores queries without a meaningful token',()=>{
  assert.deepEqual(searchStaging(records,'a'),[]);
});
