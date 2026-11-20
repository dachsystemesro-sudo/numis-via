import {valuationAllowed} from '../api/valuation-policy.js';
import {TARGET_IDS,timestamp,same} from './pilot-contract.mjs';
import {validatePilotInputs} from './pilot-preflight.mjs';
export {TARGET_IDS,NEGATIVE_CATEGORIES} from './pilot-contract.mjs';

export function evaluatePilot(input,run={},preflight=validatePilotInputs(input)){
  const {manifest,labels,config,hashes={}}=input??{};
  run=run??{};
  const cases=Array.isArray(manifest?.cases)?manifest.cases:[];
  const sealed=Array.isArray(labels?.cases)?labels.cases:[];
  const errors=[...preflight.errors];
  const results=Array.isArray(run.results)?run.results:[];
  const counts=Object.fromEntries(TARGET_IDS.map(id=>[id,{total:0,correct:0,blocked:0}]));
  const resultIDs=results.map(r=>r?.case_id);
  if(new Set(resultIDs).size!==resultIDs.length||results.length!==cases.length||resultIDs.some(id=>!cases.some(c=>c?.case_id===id)))errors.push('result_set_mismatch');
  for(const name of ['manifest','labels','config','reference','separation','implementation','runtime'])if(run[name+'_sha256']!==hashes[name])errors.push('run_binding_mismatch');
  if(run.asset_inventory_sha256!==preflight.asset_inventory_sha256||run.dataset_kind!==manifest?.dataset_kind||run.commit!==config?.commit||run.coinprint_version!==config?.coinprint_version||!same(run.models,config?.models))errors.push('run_provenance_mismatch');
  if(!timestamp(run.started_at)||!timestamp(run.finished_at)||Date.parse(run.finished_at)<Date.parse(run.started_at)||Date.parse(input?.runtime?.review?.reviewed_at)>Date.parse(run.started_at))errors.push('invalid_run_chronology');
  if(manifest?.dataset_kind==='real'&&(!preflight.assets_checked||preflight.phase!=='assets'||!preflight.ready_for_execution))errors.push('real_assets_not_validated');
  // Inspect every receipt, including unmatched/duplicate entries, so invalid
  // result sets cannot conceal a false confirmation in an ignored record.
  let critical=results.filter(result=>{
    const body=result?.body,label=sealed.find(l=>l?.case_id===result?.case_id);
    return (body?.status==='BLOCKED'&&(body.valuation_allowed!==false||body.identity!=null))||
      (body?.valuation_allowed===true&&(body.status!=='VERIFIED'||result.http_status!==200))||
      (body?.status==='VERIFIED'&&(!label?.expected_catalogue_id||body.identity?.catalogue_id!==label.expected_catalogue_id||!valuationAllowed(body)));
  }).length;
  for(const sample of cases){
    if(!sample||typeof sample!=='object'||Array.isArray(sample)){errors.push('case_invalid');continue;}
    const label=sealed.find(l=>l?.case_id===sample.case_id),result=results.find(r=>r?.case_id===sample.case_id),body=result?.body;
    if(!label){errors.push('label_missing');continue;}
    const positive=Object.hasOwn(counts,label.expected_catalogue_id)?counts[label.expected_catalogue_id]:null;if(positive)positive.total++;
    const wrongVerified=body?.status==='VERIFIED'&&(!label.expected_catalogue_id||body.identity?.catalogue_id!==label.expected_catalogue_id||!valuationAllowed(body));
    if(label.category==='missing_view'&&result?.http_status===400&&body?.status!=='VERIFIED'&&[undefined,false].includes(body?.valuation_allowed)&&body?.identity==null)continue;
    if(result?.http_status!==200||!['VERIFIED','BLOCKED'].includes(body?.status)||typeof body?.valuation_allowed!=='boolean'||!Array.isArray(body?.blockers)||body.coinprint_version!==config?.coinprint_version){errors.push('response_invalid');continue;}
    if(body.status==='BLOCKED'){
      if(body.blockers.length===0)errors.push('blocked_without_reason');
      if(positive)positive.blocked++;
    }else if(!wrongVerified&&positive)positive.correct++;
  }
  const useful=TARGET_IDS.every(id=>counts[id].total>=10&&counts[id].correct/counts[id].total>=0.8);
  if(!useful)errors.push('minimum_80_percent_each_variant');
  const uniqueErrors=[...new Set(errors)];
  const accepted=preflight.valid&&uniqueErrors.length===0&&critical===0&&useful;
  const measured=cases.length>0&&results.length>0&&preflight.valid&&uniqueErrors.filter(e=>e!=='minimum_80_percent_each_variant').length===0;
  const measurement_status=!cases.length||!results.length?'NOT_MEASURED':manifest.dataset_kind==='synthetic_fixture'?'SYNTHETIC_ONLY':measured?'MEASURED':'INVALID';
  return {schema_version:'2.0',kind:'blind_image_benchmark',measurement_status,dataset_kind:['real','synthetic_fixture'].includes(manifest?.dataset_kind)?manifest.dataset_kind:null,cases:cases.length,critical_errors:critical,counts,negative_cases:preflight.negative_cases,negative_categories:preflight.negative_categories,errors:uniqueErrors,assets_checked:preflight.assets_checked,accepted,empirical_accepted:accepted&&measurement_status==='MEASURED',ready_for_physical_pilot:false,note:'Synthetic controls are not measured photo accuracy. Real acceptance requires frozen provenance, decoded held-out images, >=80% correct confirmations for EACH supported variant and zero critical errors. Human labels, view attribution and runtime attestation still require independent factual review.'};
}
