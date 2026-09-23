const normalize=value=>String(value??'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

const fields=['external_id','label','denomination','material','mint','issuer','obverse_description','reverse_description'];

export function searchStaging(records,query,{source='all',limit=12}={}){
  const tokens=normalize(query).split(' ').filter(token=>token.length>=2);
  if(!tokens.length)return [];
  const capped=Math.min(25,Math.max(1,Number(limit)||12));
  return records
    .filter(record=>source==='all'||record.source_id===source)
    .map(record=>{
      const normalized=Object.fromEntries(fields.map(field=>[field,normalize(record[field])]));
      if(!tokens.every(token=>fields.some(field=>normalized[field].includes(token))))return null;
      const score=tokens.reduce((total,token)=>total+fields.reduce((sum,field)=>{
        if(!normalized[field].includes(token))return sum;
        return sum+(field==='external_id'||field==='denomination'||field==='issuer'?4:1);
      },0),0);
      return {score,record};
    })
    .filter(Boolean)
    .sort((a,b)=>b.score-a.score||a.record.staging_id.localeCompare(b.record.staging_id))
    .slice(0,capped)
    .map(({score,record})=>({
      score,
      staging_id:record.staging_id,
      source_id:record.source_id,
      external_id:record.external_id,
      source_url:record.source_url,
      label:record.label,
      denomination:record.denomination,
      material:record.material,
      mint:record.mint,
      issuer:record.issuer,
      obverse_description:record.obverse_description,
      reverse_description:record.reverse_description,
      identity_status:'reference_candidate',
      valuation_allowed:false
    }));
}
