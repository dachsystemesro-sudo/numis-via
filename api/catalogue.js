import catalogue from '../data/catalogue.json' with {type:'json'};
import euro from '../data/euro-denominations.json' with {type:'json'};

const norm=value=>String(value??'').toLocaleLowerCase('sk').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const observed=value=>value!==undefined&&value!==null&&norm(value)!=='';
const equal=(a,b)=>!observed(a)||!observed(b)?null:norm(a)===norm(b);
const matchesAlias=(actual,expected,aliases=[])=>{
  if(!observed(actual)||!observed(expected))return null;
  return [expected,...aliases].filter(Boolean).some(value=>{
  const a=norm(actual),b=norm(value);
  return a===b||(a.length>=4&&b.includes(a))||(b.length>=4&&a.includes(b));
  });
};
const close=(actual,expected,tolerance)=>actual==null||expected==null?null:Math.abs(Number(actual)-Number(expected))<=Number(tolerance);
const yearMatches=(actual,record)=>{
  const year=Number(String(actual??'').match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1]);
  if(!year)return null;
  if(record.date)return String(year)===String(record.date);
  if(record.year_from&&year<record.year_from)return false;
  if(record.year_to&&year>record.year_to)return false;
  return Boolean(record.year_from||record.year_to);
};

export function catalogueCandidates(features,measurements={}){
  return catalogue.records.map(record=>{
    const checks={
      denomination:matchesAlias(features.denomination?.value,record.denomination,record.denomination_aliases),
      country_text:matchesAlias(features.country_text?.value,record.country_text,record.country_text_aliases),
      date:yearMatches(features.date?.value,record),
      main_motif:matchesAlias(features.main_motif?.value,record.main_motif,record.main_motif_aliases),
      coat_of_arms:record.coat_of_arms?matchesAlias(features.coat_of_arms?.value,record.coat_of_arms,record.coat_of_arms_aliases):null,
      mint_mark:record.mint_mark?equal(features.mint_mark?.value,record.mint_mark):null,
      engraver_mark:record.engraver_mark?equal(features.engraver_mark?.value,record.engraver_mark):null,
      micro_symbols:record.micro_symbols?matchesAlias(features.micro_symbols?.value,record.micro_symbols,record.micro_symbols_aliases):null,
      edge:record.edge?equal(features.edge?.value,record.edge):null,
      mass_g:close(measurements.mass_g,record.physical?.mass_g,record.physical?.mass_tolerance_g),
      diameter_mm:close(measurements.diameter_mm,record.physical?.diameter_mm,record.physical?.diameter_tolerance_mm),
      thickness_mm:close(measurements.thickness_mm,record.physical?.thickness_mm,record.physical?.thickness_tolerance_mm)
    };
    const required=['denomination','country_text','date','main_motif',
      ...['coat_of_arms','mint_mark','engraver_mark','micro_symbols','edge'].filter(key=>record[key]!=null)];
    const contradictions=Object.entries(checks).filter(([,value])=>value===false).map(([key])=>key);
    const matched=Object.entries(checks).filter(([,value])=>value===true).map(([key])=>key);
    const missing=required.filter(key=>!features[key]?.value);
    const comparable=Object.values(checks).filter(value=>value!==null).length;
    const score=comparable?Math.round(100*matched.length/comparable):0;
    return {...record,checks,matched,contradictions,missing,score};
  }).filter(x=>x.matched.length>=2).sort((a,b)=>b.score-a.score).slice(0,12);
}

export function catalogueGate(matches){
  const valid=matches.filter(x=>x.identity_level==='variant'&&x.verification_state==='verified_reference'&&x.score>=90&&!x.contradictions.length&&!x.missing.length&&x.sources?.length>=1);
  if(!valid.length)return {passed:false,record:null,reason:'Minca alebo jej presný variant ešte nemá stav verified_reference v internom katalógu.'};
  if(valid.length>1&&valid[0].score-valid[1].score<8)return {passed:false,record:null,reason:'Katalóg obsahuje viac nerozlíšených variantov.'};
  return {passed:true,record:valid[0],reason:'Všetky rozhodujúce údaje súhlasia s katalógovým variantom.'};
}

export function denominationPhysicalGate(feature,measurements={}){
  const supplied=['mass_g','diameter_mm','thickness_mm'].filter(key=>measurements[key]!=null&&measurements[key]!=='');
  if(!supplied.length)return {passed:null,reason:'Fyzické rozmery neboli zadané.',matches:[]};
  const detected=norm(feature?.value);
  const tolerance={mass_g:0.18,diameter_mm:0.30,thickness_mm:0.30};
  const matches=euro.records.map(record=>{
    const checks=Object.fromEntries(supplied.map(key=>[key,Math.abs(Number(measurements[key])-record[key])<=tolerance[key]]));
    const score=Math.round(100*Object.values(checks).filter(Boolean).length/supplied.length);
    return {denomination:record.denomination,score,checks,agrees_with_image:detected?equal(detected,record.denomination):null};
  }).filter(item=>item.score>=67).sort((a,b)=>b.score-a.score);
  const best=matches[0];
  if(!best)return {passed:false,reason:'Rozmery nezodpovedajú žiadnemu štandardnému eurovému nominálu.',matches:[]};
  if(best.agrees_with_image===false)return {passed:false,reason:'Obrazovo určený nominál odporuje fyzickým parametrom.',matches};
  return {passed:true,reason:'Fyzické parametre sú zlučiteľné s nominálom '+best.denomination+'.',matches};
}
