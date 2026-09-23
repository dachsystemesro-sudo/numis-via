import test from 'node:test';
import assert from 'node:assert/strict';
import {denominationPhysicalGate} from '../api/catalogue.js';
import {catalogueCandidates,catalogueGate} from '../api/catalogue.js';
import {validateCatalogue} from '../api/catalogue-validator.js';
import catalogue from '../data/catalogue.json' with {type:'json'};

test('accepts official physical parameters of two euro coin',()=>{
  const result=denominationPhysicalGate({value:'2 EUR'},{mass_g:8.50,diameter_mm:25.75,thickness_mm:2.20});
  assert.equal(result.passed,true);
  assert.equal(result.matches[0].denomination,'2 EUR');
});

test('blocks conflict between visual denomination and measurements',()=>{
  const result=denominationPhysicalGate({value:'1 EUR'},{mass_g:8.50,diameter_mm:25.75,thickness_mm:2.20});
  assert.equal(result.passed,false);
  assert.match(result.reason,/odporuje/i);
});

test('abstains when no measurements were supplied',()=>{
  assert.equal(denominationPhysicalGate({value:'2 EUR'},{}).passed,null);
});

test('catalogue schema and seeded records are valid',()=>{
  assert.deepEqual(validateCatalogue(catalogue),{valid:true,errors:[],records:8});
});

test('recognises a Slovak design family but blocks valuation',()=>{
  const features={denomination:{value:'2 eurá'},country_text:{value:'SLOVENSKO'},date:{value:'2024'},main_motif:{value:'slovenský dvojkríž'}};
  const matches=catalogueCandidates(features);
  assert.equal(matches[0].catalogue_id,'SK-EUR-200-FAMILY');
  assert.equal(matches[0].identity_level,'family');
  assert.equal(catalogueGate(matches).passed,false);
});

test('rejects an out-of-range family year',()=>{
  const features={denomination:{value:'2 EUR'},country_text:{value:'SLOVENSKO'},date:{value:'2008'},main_motif:{value:'dvojkríž na troch vrchoch'}};
  const match=catalogueCandidates(features).find(x=>x.catalogue_id==='SK-EUR-200-FAMILY');
  assert.equal(match.checks.date,false);
});
