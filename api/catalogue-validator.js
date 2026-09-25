const text=value=>typeof value==='string'&&value.trim().length>0;
const DEFAULT_DECISIVE=['date','country_text','denomination','main_motif','coat_of_arms','mint_mark','engraver_mark','micro_symbols','edge','geometry'];

export function validateCatalogue(catalogue){
  const errors=[];
  if(catalogue?.schema_version!=='1.1')errors.push('schema_version musí byť 1.1');
  if(!Array.isArray(catalogue?.records))errors.push('records musí byť pole');
  const ids=new Set();
  for(const [index,record] of (catalogue?.records||[]).entries()){
    const at=`records[${index}]`;
    for(const key of ['catalogue_id','identity_level','label','country_code','country_text','denomination','main_motif'])if(!text(record[key]))errors.push(`${at}.${key} chýba`);
    if(!['family','variant'].includes(record.identity_level))errors.push(`${at}.identity_level je neplatné`);
    if(record.catalogue_id&&ids.has(record.catalogue_id))errors.push(`${at}.catalogue_id je duplicitné`);
    ids.add(record.catalogue_id);
    if(record.identity_level==='variant'&&!record.date)errors.push(`${at}.date je povinný pre variant`);
    if(record.identity_level==='variant'){
      const decisive=Array.isArray(record.decisive_discriminators)&&record.decisive_discriminators.length?record.decisive_discriminators:DEFAULT_DECISIVE.filter(key=>text(record[key]));
      if(!decisive.length)errors.push(`${at}: variant nemá žiadny rozhodujúci identifikátor`);
      for(const key of decisive)if(!DEFAULT_DECISIVE.includes(key))errors.push(`${at}.decisive_discriminators obsahuje neznáme pole ${key}`);
      if(!Array.isArray(record.reference_evidence)||!record.reference_evidence.length)errors.push(`${at}.reference_evidence chýba pre variant`);
      for(const [eIndex,e] of (record.reference_evidence||[]).entries()){
        if(!text(e?.source_id)||!text(e?.field)||!text(e?.value)||!text(e?.source_url))errors.push(`${at}.reference_evidence[${eIndex}] je neúplný`);
      }
    }
    if(record.identity_level==='family'&&!record.year_from)errors.push(`${at}.year_from je povinný pre rodinu`);
    if(!Array.isArray(record.sources)||!record.sources.length)errors.push(`${at}.sources chýbajú`);
  }
  return {valid:errors.length===0,errors,records:(catalogue?.records||[]).length};
}
