import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{createAnalysisHandler} from '../api/analyze.js';
import {requireValuation,valuationAllowed} from '../api/valuation-policy.js';
import {catalogueCandidates,catalogueGate} from '../api/catalogue.js';

// Contract fixtures written independently of prompts. These are simulated model
// outputs, NOT images, reference facts, an accuracy benchmark or real coin results.
const observations={denomination:'2 cent',country_text:'SLOVENSKO',date:'2020',main_motif:'Kriváň',geometry:'FIXTURE geometry',mint_mark:'FIXTURE M',engraver_mark:'FIXTURE Z'};
const primary=()=>({features:Object.entries(observations).map(([name,value])=>({name,value,confidence:98,visible_evidence:'FIXTURE observation',region:'FIXTURE region'})),quality:{sharpness:95,exposure:95,coverage:98,glare_control:95},candidates:[{label:'FIXTURE',country:'SK',denomination:'2 cent',date:'2020',confidence:98}],missing_views:[]});
const verifier=()=>({features:[],quality:{sharpness:95,exposure:95,coverage:98,glare_control:95},candidate_verdicts:[{label:'FIXTURE',catalogue_identity:'FIXTURE-ONLY',supported:true,score:99,contradictions:[],missing_decisive_features:[]}],missing_views:[]});
const fakeRecord={...observations,label:'FIXTURE',country_code:'SK',catalogue_id:'FIXTURE-ONLY',identity_level:'variant',verification_state:'verified_reference',score:100,contradictions:[],missing:[],sources:['FIXTURE'],mint_mark:'FIXTURE M',engraver_mark:'FIXTURE Z'};
// Use real matching and orchestration; isolate only synthetic reference review.
const isolated=createAnalysisHandler({findCandidates:(features,measurements)=>catalogueCandidates(features,measurements,[fakeRecord]),checkCatalogue:matches=>catalogueGate(matches,()=>({valid:true}))});
async function invoke(t,{mutate=()=>{},target=isolated,request={},gatewayError=false}={}){
  const key=process.env.AI_GATEWAY_API_KEY;process.env.AI_GATEWAY_API_KEY='fixture-not-a-secret';
  t.after(()=>{if(key===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=key;});
  const passes=[primary(),primary(),primary(),verifier()];mutate(passes);
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{if(gatewayError)throw Error('FIXTURE gateway failure');return {ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify(passes[calls++])}}]})};});
  let status,body;const res={status(code){status=code;return this},json(data){body=data;return this}};
  await target({method:'POST',body:{images:['data:image/jpeg;base64,AA==','data:image/jpeg;base64,AQ=='],...request}},res);
  return {status,body,calls};
}
test('synthetic positive control reaches VERIFIED only after all server gates',async t=>{
  const {body,status,calls}=await invoke(t);assert.equal(status,200);assert.equal(calls,4);assert.equal(body.status,'VERIFIED');assert.equal(requireValuation(body),'FIXTURE-ONLY');
});
const scenarios={
  'country text with an alternative is not agreement':p=>{p[1].features.find(f=>f.name==='country_text').value='SLOVENSKO or SLOVENIJA';},
  'long mark with an alternative is not agreement':p=>{p[1].features.find(f=>f.name==='mint_mark').value='FIXTURE M or FIXTURE N';},
  'observations without visible evidence':p=>{for(const pass of p.slice(0,3))pass.features.find(f=>f.name==='date').visible_evidence='';},
  'requested missing view':p=>{p[3].missing_views=['edge required'];},
  'verifier confirms a different catalogue identity':p=>{p[3].candidate_verdicts[0].catalogue_identity='OTHER';},
  'verifier omits catalogue identity':p=>{delete p[3].candidate_verdicts[0].catalogue_identity;},
  'similar conflicting year':p=>{p[1].features.find(f=>f.name==='date').value='2021';},
  'conflicting country':p=>{p[1].features.find(f=>f.name==='country_text').value='SLOVENIJA';},
  'damaged decisive mark':p=>{for(const pass of p.slice(0,3))pass.features.find(f=>f.name==='mint_mark').value=null;},
  'unreadable date':p=>{for(const pass of p.slice(0,3))pass.features.find(f=>f.name==='date').value=null;},
  'one pass alone sees mark':p=>{for(const pass of p.slice(1,3))pass.features.find(f=>f.name==='engraver_mark').value=null;},
  'zero quality must not disappear':p=>{p[0].quality.sharpness=0;},
  'blurred photograph':p=>{p[0].quality.sharpness=20;},
  'suspected counterfeit requires review':p=>{p[3].candidate_verdicts[0].contradictions=['suspected counterfeit'];},
  'verifier rejects':p=>{p[3].candidate_verdicts[0].supported=false;},
  'verifier missing proof':p=>{p[3].candidate_verdicts[0].missing_decisive_features=['mint_mark'];},
  'malformed verifier verdict':p=>{delete p[3].candidate_verdicts[0].contradictions;},
  'two similar candidates':p=>{p[3].candidate_verdicts.push({...p[3].candidate_verdicts[0],label:'FIXTURE OTHER',score:98});}
};
for(const [name,mutate] of Object.entries(scenarios))test(name+' stays BLOCKED and cannot be valued',async t=>{
  const {body,status}=await invoke(t,{mutate,request:{status:'VERIFIED',valuation_allowed:true,identity:{catalogue_id:'FORGED'}}});
  assert.equal(status,200);assert.equal(body.status,'BLOCKED');assert.equal(body.valuation_allowed,false);assert.equal(body.identity,null);assert.throws(()=>requireValuation(body));
});
test('contradictory physical measurement blocks otherwise perfect observations',async t=>{
  const {body}=await invoke(t,{request:{measurements:{mass_g:8.50,diameter_mm:25.75,thickness_mm:2.20}}});assert.equal(body.status,'BLOCKED');assert.throws(()=>requireValuation(body));
});
test('actual production catalogue blocks even perfect synthetic observations',async t=>{
  const {body}=await invoke(t,{target:handler});assert.equal(body.status,'BLOCKED');assert.equal(body.valuation_allowed,false);assert.equal(body.identity,null);
});
test('unsupported country cannot be confirmed by actual catalogue',async t=>{
  const {body}=await invoke(t,{target:handler,mutate:p=>{for(const pass of p.slice(0,3))pass.features.find(f=>f.name==='country_text').value='SLOVENIJA';}});assert.equal(body.status,'BLOCKED');assert.throws(()=>requireValuation(body));
});
test('missing side is rejected without a model call',async t=>{
  const {status,calls}=await invoke(t,{request:{images:['data:image/jpeg;base64,AA=='],valuation_allowed:true}});assert.equal(status,400);assert.equal(calls,0);
});
test('unreviewed reference cannot pass production gate by setting its status',()=>{
  assert.equal(catalogueGate([fakeRecord]).passed,false);
});
test('valuation boundary denies contradictory, absent and forged flags',()=>{
  for(const value of [null,{}, {status:'BLOCKED',valuation_allowed:true,identity:{catalogue_id:'X'},blockers:[]},{status:'VERIFIED',valuation_allowed:true,identity:{catalogue_id:'X'},blockers:['conflict']},{status:'VERIFIED',valuation_allowed:true,blockers:[]},{status:'VERIFIED',valuation_allowed:'true',identity:{catalogue_id:'X'},blockers:[]}]){
    assert.equal(valuationAllowed(value),false);assert.throws(()=>requireValuation(value));
  }
});

test('gateway failure cannot return valuation permission',async t=>{const {status,body}=await invoke(t,{gatewayError:true});assert.equal(status,500);assert.notEqual(body.valuation_allowed,true);assert.equal(valuationAllowed(body),false);});

test('one contradictory dimension blocks even when the other two match',async t=>{
  const {body}=await invoke(t,{request:{measurements:{mass_g:3.06,diameter_mm:18.75,thickness_mm:9}}});
  assert.equal(body.status,'BLOCKED');assert.throws(()=>requireValuation(body));
});

for(const [field,values] of Object.entries({date:['2009','2016','2022','2020 or 2021'],country_text:['SLOVENIJA','SLOVENSKO or SLOVENIJA','SLOVENSKO?'],mint_mark:['LP','unreadable','FIXTURE M?','FIXTURE.M'],engraver_mark:['LP'],geometry:['OTHER']})){
  for(const value of values)test(`all primary passes agree on wrong ${field} ${value}: catalogue still blocks`,async t=>{
    const {body}=await invoke(t,{mutate:p=>{for(const pass of p.slice(0,3))pass.features.find(f=>f.name===field).value=value;}});
    assert.equal(body.status,'BLOCKED');assert.equal(body.identity,null);assert.throws(()=>requireValuation(body));
  });
}
