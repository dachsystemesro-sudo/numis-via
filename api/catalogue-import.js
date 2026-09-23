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
    sources:[source.id],
    provenance:[provenance]
  };
  if(record.identity_level==='variant'&&!record.date)record.identity_level='family';
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
