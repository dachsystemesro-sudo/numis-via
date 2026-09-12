import test from 'node:test';
import assert from 'node:assert/strict';
import {denominationPhysicalGate} from '../api/catalogue.js';

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
