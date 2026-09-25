import test from 'node:test';
import assert from 'node:assert/strict';
import registry from '../data/open-catalogues.json' with {type:'json'};
import {sourceDecision} from '../api/source-policy.js';
import {normalizeOpenRecord,deduplicateRecords,promotionDecision,promoteVerifiedReference} from '../api/catalogue-import.js';

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


test('open variant cannot become identity-locking without micro provenance',()=>{
  const source={id:'wikidata',status:'enabled',commercial_use:true,license:'CC0-1.0',images:false};
  const raw={external_id:'x1',source_url:'https://www.wikidata.org/entity/Q1',label:'x',country_text:'X',denomination:'1',main_motif:'X',date:'2020',identity_level:'variant'};
  const record=normalizeOpenRecord(raw,source);
  assert.equal(record.identity_level,'family');
  assert.equal(record.verification_state,'needs_micro_evidence');
});

test('open variant retains variant level only with decisive sourced micro evidence',()=>{
  const source={id:'wikidata',status:'enabled',commercial_use:true,license:'CC0-1.0',images:false};
  const url='https://www.wikidata.org/entity/Q2';
  const raw={external_id:'x2',source_url:url,label:'x',country_text:'X',denomination:'1',main_motif:'X',date:'2020',identity_level:'variant',mint_mark:'M',reference_evidence:[{source_id:'wikidata',field:'mint_mark',value:'M',source_url:url}]};
  const record=normalizeOpenRecord(raw,source);
  assert.equal(record.identity_level,'variant');
  assert.equal(record.mint_mark,'M');
  assert.equal(record.reference_evidence[0].field,'mint_mark');
});


test('reference promotion requires two independent micro-evidence sources',()=>{
  const record={identity_level:'variant',date:'2020',mint_mark:'M',reference_evidence:[
    {source_id:'one',field:'mint_mark',value:'M',source_url:'https://one.example/x'}
  ]};
  const decision=promotionDecision(record);
  assert.equal(decision.promotable,false);
  assert.match(decision.reasons.join(' '),/dva nezávislé zdroje/);
});

test('two independent agreeing sources can promote a variant reference',()=>{
  const record={identity_level:'variant',date:'2020',mint_mark:'M',reference_evidence:[
    {source_id:'one',field:'mint_mark',value:'M',source_url:'https://one.example/x'},
    {source_id:'two',field:'mint_mark',value:'M',source_url:'https://two.example/x'}
  ]};
  const promoted=promoteVerifiedReference(record);
  assert.equal(promoted.verification_state,'verified_reference');
  assert.equal(promoted.promotion.consensus[0].independent_groups.length,2);
});

test('reference conflict blocks promotion despite multiple sources',()=>{
  const record={identity_level:'variant',date:'2020',mint_mark:'M',reference_evidence:[
    {source_id:'one',field:'mint_mark',source_url:'https://one.example/x'},
    {source_id:'two',field:'mint_mark',value:'M',source_url:'https://two.example/x'}
  ],reference_conflicts:['mint_mark']};
  assert.equal(promotionDecision(record).promotable,false);
});


test('different values from two sources are detected automatically as conflict',()=>{
  const record={identity_level:'variant',date:'2020',mint_mark:'M',reference_evidence:[
    {source_id:'one',independence_group:'publisher-a',field:'mint_mark',value:'M',source_url:'https://one.example/x'},
    {source_id:'two',independence_group:'publisher-b',field:'mint_mark',value:'N',source_url:'https://two.example/x'}
  ]};
  const decision=promotionDecision(record);
  assert.equal(decision.promotable,false);
  assert.equal(decision.conflicts[0].field,'mint_mark');
});

test('two mirrors from the same independence group count as one source',()=>{
  const record={identity_level:'variant',date:'2020',mint_mark:'M',reference_evidence:[
    {source_id:'one',independence_group:'same-publisher',field:'mint_mark',value:'M',source_url:'https://one.example/x'},
    {source_id:'two',independence_group:'same-publisher',field:'mint_mark',value:'M',source_url:'https://two.example/x'}
  ]};
  assert.equal(promotionDecision(record).promotable,false);
});
