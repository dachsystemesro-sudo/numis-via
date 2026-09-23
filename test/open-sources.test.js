import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../data/open-catalogues.json' with {type:'json'};
import {sourceDecision} from '../api/source-policy.js';
import {normalizeOpenRecord,deduplicateRecords} from '../api/catalogue-import.js';

test('only explicitly open commercial sources are auto-enabled',()=>{
  const decisions=Object.fromEntries(registry.sources.map(source=>[source.id,sourceDecision(source)]));
  assert.equal(decisions.wikidata.allowed,true);
  assert.equal(decisions.nomisma.allowed,true);
  assert.equal(decisions.ocre.allowed,true);
  assert.equal(decisions.numista.allowed,false);
  assert.equal(decisions['british-museum'].allowed,false);
});

test('normalizes an open record with immutable provenance',()=>{
  const source=registry.sources.find(item=>item.id==='wikidata');
  const record=normalizeOpenRecord({external_id:'Q123',source_url:'https://www.wikidata.org/wiki/Q123',label:' Test coin ',country_code:'sk',country_text:'Slovensko',denomination:'2 EUR',main_motif:'dvojkríž',year_from:2009},source);
  assert.equal(record.catalogue_id,'WIKIDATA-q123');
  assert.equal(record.provenance[0].license,'CC0-1.0');
});

test('deduplicates matching records without losing provenance',()=>{
  const source=registry.sources.find(item=>item.id==='wikidata');
  const one=normalizeOpenRecord({external_id:'Q1',source_url:'https://www.wikidata.org/wiki/Q1',label:'Coin',country_code:'SK',country_text:'Slovensko',denomination:'2 EUR',main_motif:'dvojkríž',year_from:2009},source);
  const two=normalizeOpenRecord({external_id:'Q2',source_url:'https://www.wikidata.org/wiki/Q2',label:'Coin',country_code:'SK',country_text:'Slovensko',denomination:'2 EUR',main_motif:'dvojkríž',year_from:2009},source);
  const result=deduplicateRecords([one,two]);
  assert.equal(result.length,1);
  assert.equal(result[0].provenance.length,2);
});
