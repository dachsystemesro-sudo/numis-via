import {provenanceFor} from './source-policy.js';

const clean=value=>String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const slug=value=>clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

export function normalizeOpenRecord(raw,source){
  const provenance=provenanceFor(source,raw.external_id,raw.source_url,raw.imported_at);
  const record={
    catalogue_id:`${source.id.toUpperCase()}-${slug(raw.external_id)}`,
    identity_level:raw.identity_level==='variant'?'variant':'family',
    label:clean(raw.label),
    country_code:clean(raw.country_code||'ZZ').toUpperCase(),
    country_text:clean(raw.country_text),
    denomination:clean(raw.denomination),
    main_motif:clean(raw.main_motif),
    date:raw.date?clean(raw.date):undefined,
    year_from:Number(raw.year_from)||undefined,
    year_to:Number(raw.year_to)||undefined,
    material:clean(raw.material)||undefined,
    mint:clean(raw.mint)||undefined,
    coat_of_arms:clean(raw.coat_of_arms)||undefined,
    mint_mark:clean(raw.mint_mark)||undefined,
    engraver_mark:clean(raw.engraver_mark)||undefined,
    micro_symbols:clean(raw.micro_symbols)||undefined,
    edge:clean(raw.edge)||undefined,
    sources:[source.id],
    provenance:[provenance],
    verification_state:'reference_only'
  };
  const decisive=['coat_of_arms','mint_mark','engraver_mark','micro_symbols','edge'];
  const evidence=(raw.reference_evidence||[]).filter(e=>decisive.includes(e?.field)&&clean(e?.source_id)&&clean(e?.source_url));
  if(evidence.length)record.reference_evidence=evidence.map(e=>({source_id:clean(e.source_id),independence_group:clean(e.independence_group||e.source_id),field:clean(e.field),value:clean(e.value),source_url:clean(e.source_url)}));
  if(record.identity_level==='variant'&&!record.date)record.identity_level='family';
  // Open imports may propose candidates, but may not become identity-locking variants
  // until decisive micro evidence has explicit provenance.
  if(record.identity_level==='variant'&&(!record.reference_evidence?.length||!decisive.some(key=>record[key]))){
    record.identity_level='family';
    record.verification_state='needs_micro_evidence';
  }
  return Object.fromEntries(Object.entries(record).filter(([,value])=>value!==undefined));
}

export function deduplicateRecords(records){
  const map=new Map();
  for(const record of records){
    const key=[record.country_code,record.denomination,record.date||`${record.year_from||''}-${record.year_to||''}`,record.main_motif,record.mint||''].map(slug).join('|');
    const previous=map.get(key);
    if(!previous)map.set(key,record);
    else map.set(key,{...previous,sources:[...new Set([...(previous.sources||[]),...(record.sources||[])])],provenance:[...(previous.provenance||[]),...(record.provenance||[])]});
  }
  return [...map.values()];
}


export function promotionDecision(record,{minimumIndependentSources=2}={}){
  const decisive=['coat_of_arms','mint_mark','engraver_mark','micro_symbols','edge'];
  const reasons=[];
  if(record.identity_level!=='variant')reasons.push('záznam nie je presný variant');
  if(!record.date)reasons.push('chýba presný ročník');
  const evidence=(record.reference_evidence||[]).filter(e=>decisive.includes(e?.field)&&clean(e?.source_id)&&clean(e?.source_url)&&clean(e?.value));
  const groups=new Map();
  for(const e of evidence){
    const field=clean(e.field), value=clean(e.value).toLowerCase();
    const key=field+'|'+value;
    if(!groups.has(key))groups.set(key,new Set());
    groups.get(key).add(clean(e.independence_group||e.source_id));
  }
  const consensus=[...groups.entries()].map(([key,sources])=>{const [field,...rest]=key.split('|');return {field,value:rest.join('|'),independent_groups:[...sources]}}).filter(x=>x.independent_groups.length>=minimumIndependentSources);
  const fieldValues=new Map();
  for(const e of evidence){
    const field=clean(e.field),value=clean(e.value).toLowerCase();
    if(!fieldValues.has(field))fieldValues.set(field,new Set());
    fieldValues.get(field).add(value);
  }
  const conflicts=[...fieldValues.entries()].filter(([,values])=>values.size>1).map(([field,values])=>({field,values:[...values]}));
  if(!consensus.length)reasons.push('chýbajú dva nezávislé zdroje zhodné na rovnakom mikroidentifikátore a hodnote');
  if(conflicts.length)reasons.push('referenčné zdroje si odporujú');
  const recordMismatch=consensus.filter(x=>clean(record[x.field]).toLowerCase()!==x.value);
  if(recordMismatch.length)reasons.push('katalógová hodnota nesúhlasí s referenčným konsenzom');
  const explicit=(record.reference_conflicts||[]).filter(Boolean);
  if(explicit.length)reasons.push('referenčné zdroje obsahujú explicitný konflikt');
  return {promotable:reasons.length===0,reasons,consensus,conflicts,record_mismatch:recordMismatch};
}

export function promoteVerifiedReference(record,options={}){
  const decision=promotionDecision(record,options);
  if(!decision.promotable)return {...record,verification_state:'needs_reference_review',promotion:decision};
  return {...record,verification_state:'verified_reference',promotion:decision};
}
