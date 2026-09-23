import {catalogueCandidates,catalogueGate,denominationPhysicalGate} from './catalogue.js';

const URL='https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL=process.env.COINPRINT_MODEL||'openai/gpt-5.4';
const FEATURES=['denomination','country_text','date','main_motif','coat_of_arms','mint_mark','engraver_mark','micro_symbols','geometry','edge'];
const BASE_CRITICAL=['denomination','country_text','date','main_motif','geometry'];
const DETAIL_FEATURES=['coat_of_arms','mint_mark','engraver_mark','micro_symbols','edge'];
const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
const norm=v=>String(v??'').toLocaleLowerCase('sk').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const agrees=(a,b)=>norm(a)===norm(b)||(norm(a).length>5&&norm(b).includes(norm(a)))||(norm(b).length>5&&norm(a).includes(norm(b)));

async function call(images,prompt,model=MODEL){
  const content=[{type:'text',text:prompt},...images.map(url=>({type:'image_url',image_url:{url}}))];
  let response;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.AI_GATEWAY_API_KEY,'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content}],response_format:{type:'json_object'},temperature:0})});
    if(response.status!==429)break;
    await new Promise(resolve=>setTimeout(resolve,700*(2**attempt)));
  }
  if(!response?.ok)throw Error(response?.status===429?'AI služba je dočasne vyťažená.':'Obrazová analýza zlyhala.');
  const raw=await response.json();
  const parsed=JSON.parse(raw.choices?.[0]?.message?.content||'{}');
  if(!Array.isArray(parsed.features))throw Error('AI vrátila neplatnú štruktúru.');
  return parsed;
}

function prompt(pass){return `NUMIS VIA CoinPrint, nezávislý priechod ${pass}. Analyzuj fotografie tej istej mince. Prvá je líce, druhá rub, ďalšie môžu byť hrana alebo detail. Neodhaduj nič neviditeľné. Reliéf nie je text, farba neurčuje kov, všeobecný motív neurčuje krajinu. Čítaj každý znak, interpunkciu, mincovnú značku, značku autora a mikrosymboly. Geometriu opíš polohami rozhodujúcich prvkov. Istotu nad 90 povoľ iba pri jasnom dôkaze. Vráť iba JSON: {"features":[{"name":"denomination|country_text|date|main_motif|coat_of_arms|mint_mark|engraver_mark|micro_symbols|geometry|edge","value":null,"confidence":0,"side":"obverse|reverse|edge|unknown","visible_evidence":"","region":""}],"quality":{"sharpness":0,"exposure":0,"coverage":0,"glare_control":0},"candidates":[{"label":"","country":"","denomination":"","date":"","variant":"","confidence":0,"evidence":[""]}],"missing_views":[""]}. Max päť kandidátov.`}

function specialistPrompt(){return `NUMIS VIA CoinPrint, špecializovaný mikroskopický priechod. ZABUDNI predchádzajúce hypotézy a čítaj fotografie od nuly. Sústreď sa na presný letopočet číslicu po číslici, celý názov krajiny písmeno po písmene, mincovné značky, podpis/monogram autora, drobné symboly, interpunkciu, hviezdy, perlovec a polohu týchto prvkov. Pri každom tvrdení uveď konkrétny viditeľný dôkaz a oblasť fotografie. Ak znak nie je čitateľný, value musí byť null; nikdy nedopĺňaj pravdepodobný znak podľa typu mince. Vráť iba JSON v rovnakej schéme features/quality/candidates/missing_views ako primárny priechod.`}

function merge(passes){
  const out={};
  for(const name of FEATURES){
    const found=passes.map((p,i)=>({...p.features.find(x=>x.name===name),pass:i+1})).filter(x=>x.value&&clamp(x.confidence)>=55).sort((a,b)=>clamp(b.confidence)-clamp(a.confidence));
    const best=found[0]; const matches=best?found.filter(x=>agrees(x.value,best.value)):[];
    const conflicts=[]; for(let i=0;i<found.length;i++)for(let j=i+1;j<found.length;j++)if(!agrees(found[i].value,found[j].value))conflicts.push(found[i].value+' ↔ '+found[j].value);
    out[name]={value:best?.value||null,confidence:matches.length?Math.min(...matches.map(x=>clamp(x.confidence))):0,agreement_count:matches.length,side:best?.side||'unknown',visible_evidence:best?.visible_evidence||'',region:best?.region||'',conflicts};
  }
  return out;
}

function applicableCritical(features,catalogueMatches=[]){
  const required=new Set(BASE_CRITICAL);
  // A detail becomes a hard identifier when it is visibly detected OR when a close
  // catalogue candidate defines it. This prevents tiny mint/designer marks from
  // being silently ignored while avoiding impossible requirements on coins that lack them.
  for(const name of DETAIL_FEATURES){
    if(features[name]?.value)required.add(name);
    for(const record of catalogueMatches){
      const expected=record?.record?.[name]??record?.[name];
      if(expected!==undefined&&expected!==null&&String(expected).trim())required.add(name);
    }
  }
  return [...required];
}

function candidates(passes){const map=new Map();for(const p of passes)for(const c of p.candidates||[]){const key=[c.country,c.denomination,c.date,c.variant,c.label].map(norm).join('|');if(!map.has(key)||clamp(c.confidence)>clamp(map.get(key).confidence))map.set(key,c)}return [...map.values()].sort((a,b)=>clamp(b.confidence)-clamp(a.confidence)).slice(0,8)}

function verifyPrompt(features,pool){return `NUMIS VIA CoinPrint, oponentský priechod. Pokús sa VYVRÁTIŤ každého kandidáta podľa fotografií. Over nominál, presný text a krajinu, letopočet, motív, znak, mincovňu, autora, mikrosymboly, geometriu a hranu. Predošlé dôkazy: ${JSON.stringify(features)}. Kandidáti: ${JSON.stringify(pool)}. Vráť iba JSON: {"features":[],"candidate_verdicts":[{"label":"","supported":false,"score":0,"matched_features":[""],"contradictions":[""],"missing_decisive_features":[""],"catalogue_identity":""}],"quality":{"sharpness":0,"exposure":0,"coverage":0,"glare_control":0},"missing_views":[""]}. supported smie byť true iba bez kritického rozporu a bez chýbajúceho rozhodujúceho znaku.`}

function quality(passes,client={}){const limits={sharpness:65,exposure:55,coverage:75,glare_control:55};const scores={};for(const key of Object.keys(limits)){const values=passes.map(p=>clamp(p.quality?.[key])).filter(Boolean);if(clamp(client[key]))values.push(clamp(client[key]));scores[key]=values.length?Math.round(Math.min(...values)):0}const failures=Object.keys(limits).filter(k=>scores[k]<limits[k]);return {scores,passed:!failures.length,failures}}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const images=req.body?.images;
  if(!Array.isArray(images)||images.length<2||images.length>5||images.some(x=>typeof x!=='string'||!x.startsWith('data:image/')))return res.status(400).json({error:'Nahraj líce a rub mince; voliteľne aj hranu.'});
  if(!process.env.AI_GATEWAY_API_KEY)return res.status(503).json({error:'Analytická služba nie je nakonfigurovaná.'});
  try{
    const [a,b,micro]=await Promise.all([
      call(images,prompt('A: text, číslice a drobné značky')),
      call(images,prompt('B: motívy a geometria')),
      call(images,specialistPrompt(),process.env.COINPRINT_MICRO_MODEL||MODEL)
    ]);
    const features=merge([a,b,micro]); const pool=candidates([a,b,micro]);
    const verifier=await call(images,verifyPrompt(features,pool),process.env.COINPRINT_VERIFY_MODEL||MODEL);
    const photoQuality=quality([a,b,micro,verifier],req.body?.client_quality);
    const measurements=req.body?.measurements||{};
    const catalogueMatches=catalogueCandidates(features,measurements);
    const catalogue=catalogueGate(catalogueMatches);
    const critical=applicableCritical(features,catalogueMatches);
    const physicalGate=denominationPhysicalGate(features.denomination,measurements);
    const missing=critical.filter(k=>!features[k]?.value||features[k].agreement_count<2||features[k].confidence<78);
    const conflicts=critical.flatMap(k=>features[k].conflicts.map(x=>k+': '+x));
    const supported=(verifier.candidate_verdicts||[]).filter(v=>v.supported&&clamp(v.score)>=90&&!(v.contradictions||[]).length&&!(v.missing_decisive_features||[]).length).sort((x,y)=>clamp(y.score)-clamp(x.score));
    const blockers=[...photoQuality.failures.map(x=>'Nedostatočná kvalita: '+x),...conflicts.map(x=>'Kritický rozpor: '+x),...missing.map(x=>'Chýba nezávislé potvrdenie: '+x),...(supported.length?[]:['Žiadny kandidát neprešiel oponentským overením.']),...(supported.length>1&&clamp(supported[0].score)-clamp(supported[1].score)<8?['Kandidáti sú príliš podobní.']:[]),...(physicalGate.passed===false?[physicalGate.reason]:[]),...(catalogue.passed?[]:[catalogue.reason])];
    const verified=!blockers.length;
    return res.status(200).json({coinprint_version:'13.7.0',status:verified?'VERIFIED':'BLOCKED',valuation_allowed:verified,identity:verified?{...supported[0],catalogue_id:catalogue.record.catalogue_id}:null,confidence:verified?Math.min(clamp(supported[0].score),catalogue.record.score):0,blockers:[...new Set(blockers)],quality:photoQuality,features,measurements,physical_gate:physicalGate,catalogue:{matched:catalogueMatches.map(x=>({catalogue_id:x.catalogue_id,identity_level:x.identity_level,label:x.label,score:x.score,contradictions:x.contradictions})),gate:catalogue.reason},candidate_verdicts:verifier.candidate_verdicts||[],next_needed:[...new Set([...(a.missing_views||[]),...(b.missing_views||[]),...(micro.missing_views||[]),...(verifier.missing_views||[])])].filter(Boolean),audit:{passes:4,independent_primary_passes:3,micro_specialist:true,critical_features:critical,catalogue_schema:'1.1',timestamp:new Date().toISOString()}});
  }catch(error){return res.status(500).json({error:error.message||'CoinPrint analýza zlyhala.'})}
}
