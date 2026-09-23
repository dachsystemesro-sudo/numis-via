import staging from '../data/staging/ocre.json' with {type:'json'};
import {searchStaging} from './staging-search.js';

export default function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Povolená je iba metóda GET.'});
  const query=String(req.query?.q??'').trim();
  if(query.length<2)return res.status(400).json({error:'Zadajte aspoň dva znaky.'});
  const results=searchStaging(staging.records||[],query,{source:String(req.query?.source||'all'),limit:req.query?.limit});
  return res.status(200).json({
    query,
    count:results.length,
    catalogue_status:'reference_only',
    valuation_allowed:false,
    warning:'Výsledky sú kandidáti z verejného katalógu. Identita ani cena nie sú potvrdené bez úplného CoinPrint overenia.',
    results
  });
}
