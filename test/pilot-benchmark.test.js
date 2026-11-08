import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePilot,TARGET_IDS,NEGATIVE_CATEGORIES} from '../scripts/pilot-benchmark.mjs';
import {auditReadiness} from '../scripts/audit-readiness.mjs';
import catalogue from '../data/catalogue.json' with {type:'json'};
import pilot from '../data/pilot/sk-eurocents.json' with {type:'json'};
import sources from '../data/pilot/sources.json' with {type:'json'};

// Synthetic evaluator test data, never written to the actual blind manifest.
function fixture(){
  let i=0;
  const cases=[];
  const add=(id,category)=>{i++;cases.push({case_id:`FIXTURE-${i}`,specimen_id:`SPECIMEN-${i}`,category,expected_catalogue_id:id,label_review:{reviewer:'FIXTURE',reviewed_at:'2026-11-09'},rights:{status:'approved',basis:'SYNTHETIC ONLY'},images:[1,2].map(n=>({path:`fixture/${i}-${n}.jpg`,sha256:(i*2+n).toString(16).padStart(64,'0')}))});};
  for(const id of TARGET_IDS)for(let j=0;j<10;j++)add(id,'supported');
  for(const category of NEGATIVE_CATEGORIES)for(let j=0;j<5;j++)add(null,category);
  const manifest={schema_version:'1.0',status:'LOCKED',locked_at:'2026-11-09T00:00:00Z',custodian:'FIXTURE',reference_specimen_ids:[],reference_image_sha256:[],cases};
  const run={manifest_sha256:'a'.repeat(64),reference_sha256:'b'.repeat(64),commit:'a'.repeat(40),model:'FIXTURE',micro_model:'FIXTURE',verify_model:'FIXTURE',coinprint_version:'FIXTURE',started_at:'2026-11-09T01:00:00Z',finished_at:'2026-11-09T02:00:00Z',results:cases.map(c=>({case_id:c.case_id,http_status:200,body:{coinprint_version:'FIXTURE',status:c.expected_catalogue_id?'VERIFIED':'BLOCKED',valuation_allowed:Boolean(c.expected_catalogue_id),identity:c.expected_catalogue_id?{catalogue_id:c.expected_catalogue_id}:null,blockers:c.expected_catalogue_id?[]:['FIXTURE']}}))};
  return {manifest,run};
}
test('benchmark evaluator accepts a complete synthetic positive control',()=>{const {manifest,run}=fixture();assert.equal(evaluatePilot(manifest,run,'a'.repeat(64)).accepted,true);});
for(const [name,mutate] of Object.entries({
  empty:({manifest,run})=>{manifest.cases=[];run.results=[];},
  always_blocked:({run})=>{for(const r of run.results)r.body={status:'BLOCKED',valuation_allowed:false,identity:null,blockers:['FIXTURE']};},
  false_confirmation:({run})=>{run.results.at(-1).body={status:'VERIFIED',valuation_allowed:true,identity:{catalogue_id:TARGET_IDS[0]},blockers:[]};},
  wrong_identity:({run})=>{run.results[0].body.identity.catalogue_id=TARGET_IDS[1];},
  blocked_valuation:({run})=>{run.results.at(-1).body.valuation_allowed=true;},
  missing_response:({run})=>{run.results.pop();},
  duplicate_result:({run})=>{run.results[1]=run.results[0];},
  leaked_specimen:({manifest})=>{manifest.reference_specimen_ids=[manifest.cases[0].specimen_id];},
  leaked_image:({manifest})=>{manifest.reference_image_sha256=[manifest.cases[0].images[0].sha256];},
  duplicate_specimen:({manifest})=>{manifest.cases[1].specimen_id=manifest.cases[0].specimen_id;},
  unlocked:({manifest})=>{manifest.status='PENDING_COLLECTION';},
  changed_manifest:({run})=>{run.manifest_sha256='b'.repeat(64);},
  errors_not_abstentions:({run})=>{run.results.at(-1).http_status=500;},
  missing_category:({manifest})=>{manifest.cases.at(-1).category='unsupported';}
}))test('benchmark refuses '+name,()=>{const f=fixture();mutate(f);assert.equal(evaluatePilot(f.manifest,f.run,'a'.repeat(64)).accepted,false);});
test('missing-side HTTP 400 is a safe rejection',()=>{const f=fixture();for(const c of f.manifest.cases.filter(c=>c.category==='missing_view')){const r=f.run.results.find(r=>r.case_id===c.case_id);r.http_status=400;r.body={error:'Missing side'};}assert.equal(evaluatePilot(f.manifest,f.run,'a'.repeat(64)).accepted,true);});
test('audit cannot mark empty, missing or merely ticked checklist ready',()=>{
  for(const checklist of ['', '## READY FOR PHYSICAL PILOT\n## PHYSICAL PILOT', '## READY FOR PHYSICAL PILOT\n'+('- [x] fixture\n'.repeat(11))+'## PHYSICAL PILOT']){
    const result=auditReadiness({catalogue,state:{},pilot,sources,checklist});assert.equal(result.readiness.ready_for_physical_pilot,false);
  }
});
test('audit fails integrity for an asserted verified record without actual evidence',()=>{
  const fake={...pilot.records[0],verification_state:'verified_reference'};
  const result=auditReadiness({catalogue:{...catalogue,records:[...catalogue.records,fake]},state:{},pilot,sources,checklist:''});assert.equal(result.integrity_passed,false);
});
