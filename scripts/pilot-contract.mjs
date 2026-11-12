import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

export const TARGET_IDS=[1,2,5].flatMap(n=>[2019,2020,2021].map(y=>`SK-EUR-${String(n).padStart(3,'0')}-${y}-PILOT`));
export const NEGATIVE_CATEGORIES=['similar_year','other_country','damaged','unreadable','unsupported','missing_view'];
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const isHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=1024;
export const timestamp=x=>{
  if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x)||!Number.isFinite(Date.parse(x)))return false;
  const normalized=new Date(x).toISOString();return x===normalized||x===normalized.replace('.000Z','Z');
};
export const identityFor=id=>{
  const m=/^SK-EUR-(001|002|005)-(2019|2020|2021)-PILOT$/.exec(id??'');
  return m?{country_code:'SK',denomination:`${Number(m[1])} cent`,date:m[2]}:null;
};
export const canonical=x=>{
  if(Array.isArray(x))return x.map(canonical);
  if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
  return x;
};
export const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const require=createRequire(import.meta.url);
export const evaluationToolchain=()=>({node:process.versions.node,sharp:require('sharp').versions.sharp});
export function implementationHash(){
  const paths=['api/analyze.js','api/catalogue.js','api/pilot-reference.js','api/valuation-policy.js','data/pilot/sources.json','data/euro-denominations.json','scripts/pilot-contract.mjs','scripts/pilot-preflight.mjs','scripts/pilot-benchmark.mjs','scripts/run-pilot.mjs','scripts/evaluate-pilot.mjs','package-lock.json'];
  return sha256(Buffer.concat(paths.flatMap(p=>[Buffer.from(p+'\0'),fs.readFileSync(new URL('../'+p,import.meta.url)),Buffer.from('\0')])));
}
