import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const statePath=path.join(root,'data','import-state.json');
const stagingPath=path.join(root,'data','staging','ocre.json');
const limit=Math.min(500,Math.max(10,Number(process.env.CATALOGUE_BATCH_SIZE)||250));

const query=`PREFIX nmo: <http://nomisma.org/ontology#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?type ?title ?denomination ?denominationLabel ?material ?materialLabel ?mint ?mintLabel ?issuer ?issuerLabel ?obv ?rev WHERE {
  ?type a nmo:TypeSeriesItem .
  FILTER(STRSTARTS(STR(?type), "http://numismatics.org/ocre/id/"))
  OPTIONAL { ?type dcterms:title ?title . FILTER(LANG(?title)="en" || LANG(?title)="") }
  OPTIONAL { ?type nmo:hasDenomination ?denomination . ?denomination skos:prefLabel ?denominationLabel . FILTER(LANG(?denominationLabel)="en") }
  OPTIONAL { ?type nmo:hasMaterial ?material . ?material skos:prefLabel ?materialLabel . FILTER(LANG(?materialLabel)="en") }
  OPTIONAL { ?type nmo:hasMint ?mint . ?mint skos:prefLabel ?mintLabel . FILTER(LANG(?mintLabel)="en") }
  OPTIONAL { ?type nmo:hasAuthority ?issuer . ?issuer skos:prefLabel ?issuerLabel . FILTER(LANG(?issuerLabel)="en") }
  OPTIONAL { ?type nmo:hasObverse/dcterms:description ?obv . FILTER(LANG(?obv)="en" || LANG(?obv)="") }
  OPTIONAL { ?type nmo:hasReverse/dcterms:description ?rev . FILTER(LANG(?rev)="en" || LANG(?rev)="") }
} ORDER BY ?type LIMIT ${limit} OFFSET __OFFSET__`;

const value=(row,key)=>row[key]?.value?.trim()||null;
const idFrom=url=>url.split('/').filter(Boolean).at(-1);

export function rowsToStaging(bindings,importedAt=new Date().toISOString()){
  const map=new Map();
  for(const row of bindings){
    const sourceUrl=value(row,'type');
    if(!sourceUrl)continue;
    const id=idFrom(sourceUrl);
    const current=map.get(id)||{staging_id:`OCRE-${id}`,source_id:'ocre',external_id:id,source_url:sourceUrl,license:'ODbL-1.0',status:'staged',imported_at:importedAt};
    const data={label:value(row,'title')||id,denomination:value(row,'denominationLabel'),material:value(row,'materialLabel'),mint:value(row,'mintLabel'),issuer:value(row,'issuerLabel'),obverse_description:value(row,'obv'),reverse_description:value(row,'rev')};
    for(const [key,item] of Object.entries(data))if(item&&!current[key])current[key]=item;
    map.set(id,current);
  }
  return [...map.values()];
}

export function mergeStaging(existing,incoming){
  const map=new Map(existing.map(item=>[item.staging_id,item]));
  for(const item of incoming)map.set(item.staging_id,{...(map.get(item.staging_id)||{}),...item});
  return [...map.values()].sort((a,b)=>a.staging_id.localeCompare(b.staging_id));
}

async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return fallback}}

export async function syncOcre(fetchImpl=fetch){
  const state=await readJson(statePath,{version:1,sources:{ocre:{offset:0,complete:false}}});
  const offset=state.sources.ocre.offset||0;
  const endpoint=new URL('https://nomisma.org/query');
  endpoint.searchParams.set('query',query.replace('__OFFSET__',String(offset)));
  endpoint.searchParams.set('output','json');
  const response=await fetchImpl(endpoint,{headers:{accept:'application/sparql-results+json','user-agent':'NUMIS-VIA/1.0 catalogue importer'}});
  if(!response.ok)throw Error(`OCRE import zlyhal: HTTP ${response.status}`);
  const payload=await response.json();
  const incoming=rowsToStaging(payload.results?.bindings||[]);
  const existing=await readJson(stagingPath,{schema_version:'1.0',records:[]});
  const records=mergeStaging(existing.records||[],incoming);
  state.sources.ocre.offset=offset+limit;
  state.sources.ocre.complete=incoming.length===0;
  state.sources.ocre.last_batch=incoming.length;
  state.sources.ocre.total_staged=records.length;
  state.sources.ocre.last_sync=new Date().toISOString();
  await fs.mkdir(path.dirname(stagingPath),{recursive:true});
  await fs.writeFile(stagingPath,JSON.stringify({schema_version:'1.0',source_id:'ocre',records},null,2)+'\n');
  await fs.writeFile(statePath,JSON.stringify(state,null,2)+'\n');
  return state.sources.ocre;
}

if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await syncOcre(),null,2));
