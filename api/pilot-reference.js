const text=x=>typeof x==='string'&&x.trim().length>0;
const date=x=>text(x)&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
export const PILOT_FIELDS=['country_code','country_text','denomination','date','main_motif','coat_of_arms','mint_mark','engraver_mark','geometry','edge','physical.mass_g','physical.diameter_mm','physical.thickness_mm'];
const at=(record,field)=>field.split('.').reduce((v,key)=>v?.[key],record);

// This validates the review trail, not the truth of a claim. Source independence
// is assigned in the reviewed registry, never supplied by an individual claim.
export function reviewPilotReference(record,registry){
  const errors=[];
  if(record?.identity_level!=='variant'||record?.verification_state!=='verified_reference')errors.push('not_verified_variant');
  if(!/^\d{4}$/.test(record?.date||''))errors.push('exact_year_required');
  const evidence=Array.isArray(record?.reference_evidence)?record.reference_evidence:[];
  for(const field of PILOT_FIELDS){
    const expected=at(record,field);
    if(expected==null||expected===''||(field.startsWith('physical.')&&(!Number.isFinite(expected)||expected<=0)))errors.push('missing:'+field);
    const groups=new Set();
    for(const e of evidence.filter(e=>e?.field===field)){
      const source=registry?.sources?.find(s=>s.id===e.source_id);
      let urlOK=false;
      try{const url=new URL(e.source_url);urlOK=url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&source?.urls?.includes(url.href);}catch{}
      if(!source||!Array.isArray(source.supports)||!source.supports.includes(field)||!text(source.independence_group)||!urlOK||e.value!==expected||!text(e.locator)||!text(e.reviewed_by)||!date(e.reviewed_at)||e.review_status!=='approved'||!text(e.snapshot_sha256)||!/^[a-f0-9]{64}$/.test(e.snapshot_sha256)){
        errors.push('invalid_evidence:'+field);continue;
      }
      groups.add(source.independence_group);
    }
    if(groups.size<2)errors.push('independent_evidence_required:'+field);
  }
  if(record?.rights?.metadata?.status!=='approved'||!text(record?.rights?.metadata?.basis))errors.push('metadata_rights_pending');
  if(!['approved','no_images_used'].includes(record?.rights?.images?.status))errors.push('image_rights_pending');
  if(!text(record?.review?.reviewed_by)||!date(record?.review?.reviewed_at)||record?.review?.status!=='approved')errors.push('expert_review_pending');
  if((record?.reference_conflicts||[]).length)errors.push('reference_conflict');
  return {valid:errors.length===0,errors};
}
