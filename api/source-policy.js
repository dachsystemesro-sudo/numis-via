const AUTO_LICENSES=new Set(['CC0-1.0','CC-BY-3.0','CC-BY-4.0','ODbL-1.0']);

export function sourceDecision(source){
  const reasons=[];
  if(source.status!=='enabled')reasons.push('zdroj nie je povolený na automatický import');
  if(source.commercial_use!==true)reasons.push('komerčné použitie nie je potvrdené');
  if(!AUTO_LICENSES.has(source.license))reasons.push('licencia nie je v zozname povolených licencií');
  if(source.images)reasons.push('obrázky vyžadujú samostatnú kontrolu licencie');
  return {allowed:reasons.length===0,reasons};
}

export function provenanceFor(source,externalId,url,importedAt=new Date().toISOString()){
  const decision=sourceDecision(source);
  if(!decision.allowed)throw Error(`${source.id}: ${decision.reasons.join('; ')}`);
  if(!externalId||!url)throw Error(`${source.id}: chýba externý identifikátor alebo URL`);
  return {source_id:source.id,external_id:String(externalId),source_url:String(url),license:source.license,imported_at:importedAt};
}
