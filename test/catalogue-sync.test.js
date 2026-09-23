import test from 'node:test';
import assert from 'node:assert/strict';
import {rowsToStaging,mergeStaging,syncOcreBatches} from '../scripts/sync-open-catalogues.mjs';

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
