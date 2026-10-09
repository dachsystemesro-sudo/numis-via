import test from 'node:test';
import assert from 'node:assert/strict';
import {rowsToStaging,mergeStaging,syncOcreBatches,fetchWithRetry,requireBindings} from '../scripts/sync-open-catalogues.mjs';

const cell=value=>({type:'literal',value});

test('converts and combines duplicate OCRE SPARQL rows',()=>{
  const rows=[
    {type:cell('http://numismatics.org/ocre/id/ric.1.aug.1'),title:cell('Augustus type 1'),denominationLabel:cell('denarius'),obv:cell('Head of Augustus')},
    {type:cell('http://numismatics.org/ocre/id/ric.1.aug.1'),materialLabel:cell('silver'),rev:cell('Standing figure')}
  ];
  const records=rowsToStaging(rows,'2026-09-23T00:00:00.000Z');
  assert.equal(records.length,1);
  assert.equal(records[0].denomination,'denarius');
  assert.equal(records[0].material,'silver');
  assert.equal(records[0].license,'ODbL-1.0');
});

test('resume merge replaces a known staging record without duplication',()=>{
  const old=[{staging_id:'OCRE-a',label:'old'}];
  const incoming=[{staging_id:'OCRE-a',label:'new'},{staging_id:'OCRE-b',label:'second'}];
  const result=mergeStaging(old,incoming);
  assert.equal(result.length,2);
  assert.equal(result.find(x=>x.staging_id==='OCRE-a').label,'new');
});


test('multi-batch sync stops as soon as the source is complete',async()=>{
  let calls=0;
  const syncOnce=async()=>{
    calls++;
    return {complete:true};
  };
  const result=await syncOcreBatches(null,10,syncOnce);
  assert.equal(calls,1);
  assert.equal(result.complete,true);
  assert.equal(result.completed_batches,1);
});

test('multi-batch sync limits a single run to twenty batches',async()=>{
  let calls=0;
  const syncOnce=async()=>{
    calls++;
    return {complete:false};
  };
  await syncOcreBatches(null,100,syncOnce);
  assert.equal(calls,20);
});


test('fetch retry recovers from transient 503',async()=>{
  let calls=0;
  const fetchImpl=async()=>{
    calls++;
    if(calls<2)return {ok:false,status:503};
    return {ok:true,status:200};
  };
  const response=await fetchWithRetry(fetchImpl,'https://example.invalid',{},2);
  assert.equal(response.ok,true);
  assert.equal(calls,2);
});

test('fetch retry does not retry permanent 404',async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return {ok:false,status:404}};
  await assert.rejects(()=>fetchWithRetry(fetchImpl,'https://example.invalid',{},4),/HTTP 404/);
  assert.equal(calls,1);
});


test('fetch retry recovers from a transient network exception',async()=>{
  let calls=0;
  const fetchImpl=async()=>{
    calls++;
    if(calls===1)throw new TypeError('temporary network failure');
    return {ok:true,status:200};
  };
  const response=await fetchWithRetry(fetchImpl,'https://example.invalid',{timeoutMs:1000},2);
  assert.equal(response.ok,true);
  assert.equal(calls,2);
});

test('fetch retry creates a fresh timeout signal for every attempt',async()=>{
  const signals=[];
  let calls=0;
  const fetchImpl=async(_url,options)=>{
    calls++;
    signals.push(options.signal);
    if(calls===1)return {ok:false,status:500};
    return {ok:true,status:200};
  };
  const response=await fetchWithRetry(fetchImpl,'https://example.invalid',{timeoutMs:1000},2);
  assert.equal(response.ok,true);
  assert.equal(calls,2);
  assert.notEqual(signals[0],signals[1]);
});

test('rejects malformed SPARQL payload instead of treating it as empty completion',()=>{
  for(const payload of [null,{}, {results:{}}, {results:{bindings:null}}]){
    assert.throws(()=>requireBindings(payload),/neplatná SPARQL odpoveď/);
  }
});

test('rejects missing, foreign, or malformed OCRE identifiers without advancing import',()=>{
  const invalid=[
    {},{type:{value:'https://example.org/ocre/id/a'}},
    {type:{value:'https://numismatics.org/ocre/id/a?next=1'}},
    {type:{value:'https://numismatics.org/ocre/id/'}},
    {type:{value:42}}
  ];
  for(const row of invalid){
    assert.throws(()=>requireBindings({results:{bindings:[{type:{value:'https://numismatics.org/ocre/id/ric.1.aug.1'}},row]}}),/neplatný identifikátor/);
  }
});

test('accepts valid OCRE identifiers and genuine empty result sets',()=>{
  assert.equal(requireBindings({results:{bindings:[{type:{value:'http://numismatics.org/ocre/id/ric.1.aug.1'}}]}}).length,1);
  assert.deepEqual(requireBindings({results:{bindings:[]}}),[]);
});
