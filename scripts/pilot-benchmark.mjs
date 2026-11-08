import {valuationAllowed} from '../api/valuation-policy.js';
export const TARGET_IDS=[1,2,5].flatMap(n=>[2019,2020,2021].map(y=>`SK-EUR-${String(n).padStart(3,'0')}-${y}-PILOT`));
export const NEGATIVE_CATEGORIES=['similar_year','other_country','damaged','unreadable','unsupported','missing_view'];
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);

export function evaluatePilot(manifest,run,manifestHash){
  const errors=[];
  const cases=Array.isArray(manifest?.cases)?manifest.cases:[];
  if(manifest?.schema_version!=='1.0'||manifest?.status!=='LOCKED'||!manifest?.locked_at||!manifest?.custodian)errors.push('manifest_not_locked');
  if(!sha(manifestHash)||run?.manifest_sha256!==manifestHash)errors.push('manifest_hash_mismatch');
  if(!/^[a-f0-9]{40}$/.test(run?.commit||'')||!run?.model||!run?.micro_model||!run?.verify_model||!run?.coinprint_version||!run?.started_at||!run?.finished_at||!sha(run?.reference_sha256))errors.push('run_metadata_missing');
  if(!Number.isFinite(Date.parse(manifest?.locked_at))||!Number.isFinite(Date.parse(run?.started_at))||Date.parse(manifest.locked_at)>Date.parse(run.started_at)||!Number.isFinite(Date.parse(run?.finished_at))||Date.parse(run.finished_at)<Date.parse(run.started_at))errors.push('invalid_run_chronology');
  const ids=new Set(),specimens=new Set(),hashes=new Set();
  const refSpecimens=new Set(manifest?.reference_specimen_ids||[]),refHashes=new Set(manifest?.reference_image_sha256||[]);
  const counts=Object.fromEntries(TARGET_IDS.map(id=>[id,{total:0,correct:0,blocked:0}]));
  const negatives=Object.fromEntries(NEGATIVE_CATEGORIES.map(c=>[c,0]));
  const results=Array.isArray(run?.results)?run.results:[];
  const resultIds=new Set();
  for(const r of results){if(!r?.case_id||resultIds.has(r.case_id))errors.push('duplicate_or_missing_result');resultIds.add(r?.case_id);}
  let critical=0,negativeTotal=0;
  for(const c of cases){
    if(!c?.case_id||ids.has(c.case_id))errors.push('duplicate_or_missing_case');ids.add(c?.case_id);
    if(!c?.specimen_id||specimens.has(c.specimen_id)||refSpecimens.has(c.specimen_id))errors.push('specimen_leakage_or_duplicate');specimens.add(c?.specimen_id);
    if(!c?.label_review?.reviewer||!c?.label_review?.reviewed_at||!c?.rights?.basis||c?.rights?.status!=='approved')errors.push('case_review_or_rights_missing');
    const minimumViews=c?.category==='missing_view'?1:2;
    if(!Array.isArray(c?.images)||c.images.length<minimumViews||c.images.length>5)errors.push('missing_images');
    for(const image of c?.images||[]){
      if(!sha(image?.sha256)||!image?.path||hashes.has(image.sha256)||refHashes.has(image.sha256))errors.push('image_leakage_or_missing_hash');
      hashes.add(image?.sha256);
    }
    if(c.expected_catalogue_id!==null&&!TARGET_IDS.includes(c.expected_catalogue_id))errors.push('unknown_expected_identity');
    if(c.expected_catalogue_id!==null&&c.category!=='supported')errors.push('invalid_positive_category');
    if(c.expected_catalogue_id===null){negativeTotal++;if(c.category in negatives)negatives[c.category]++;else errors.push('unknown_negative_category');}
    else if(counts[c.expected_catalogue_id])counts[c.expected_catalogue_id].total++;
    const result=results.find(r=>r.case_id===c.case_id);
    // Missing-side requests must be rejected before contacting the model.
    if(c.category==='missing_view'&&result?.http_status===400&&result?.body?.valuation_allowed!==true&&!result?.body?.identity)continue;
    const body=result?.body;
    if(result?.http_status!==200||!['VERIFIED','BLOCKED'].includes(body?.status)||typeof body?.valuation_allowed!=='boolean'||!Array.isArray(body?.blockers)){
      errors.push('missing_or_invalid_response:'+c.case_id);continue;
    }
    if(body.coinprint_version!==run.coinprint_version)errors.push('runtime_version_mismatch:'+c.case_id);
    if(body.status==='BLOCKED'){
      if(body.valuation_allowed!==false||body.identity!=null)critical++;
      if(counts[c.expected_catalogue_id])counts[c.expected_catalogue_id].blocked++;
    }else if(!c.expected_catalogue_id||body.identity?.catalogue_id!==c.expected_catalogue_id||!valuationAllowed(body))critical++;
    else counts[c.expected_catalogue_id].correct++;
  }
  if(results.length!==cases.length||[...resultIds].some(id=>!ids.has(id)))errors.push('result_set_mismatch');
  if(TARGET_IDS.some(id=>counts[id].total<10))errors.push('minimum_10_per_variant');
  if(NEGATIVE_CATEGORIES.some(c=>negatives[c]<5))errors.push('minimum_5_per_negative_category');
  const useful=TARGET_IDS.every(id=>counts[id].total>0&&counts[id].correct/counts[id].total>=0.8);
  return {schema_version:'1.0',kind:'blind_image_benchmark',cases:cases.length,critical_errors:critical,negative_cases:negativeTotal,counts,negative_categories:negatives,errors:[...new Set(errors)],accepted:errors.length===0&&critical===0&&useful,note:'Acceptance requires >=80% correct confirmations per supported variant and zero critical errors; abstentions are reported separately. This is not an authenticity certificate.'};
}
