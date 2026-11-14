import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const bundle=fileURLToPath(new URL('./',import.meta.url));
const flags={identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
try{
  const manifest=JSON.parse(fs.readFileSync(path.join(bundle,'fix-manifest.json'),'utf8'));
  if(!Array.isArray(manifest.bundle_files)||manifest.bundle_files.length<10)throw Error('bundle_integrity_failed');
  for(const file of manifest.bundle_files){
    if(!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(file.path)||file.path.split('/').includes('..'))throw Error('bundle_integrity_failed');
    const filename=path.join(bundle,file.path),stat=fs.lstatSync(filename);
    if(!stat.isFile()||stat.isSymbolicLink()||createHash('sha256').update(fs.readFileSync(filename)).digest('hex')!==file.sha256)throw Error('bundle_integrity_failed');
  }
  const {runLocalAssistant,safeLocalError}=await import('./scripts/windows-local-assistant.mjs');
  const {remediationFor}=await import('./scripts/windows-helper-ui.mjs');
  try{process.exitCode=await runLocalAssistant(['--prepare',...process.argv.slice(2)],{bundle});}
  catch(error){console.log('ZASTAVENÉ – nič nepovoľujem a nič nemažem.');console.log(JSON.stringify(safeLocalError(error),null,2));console.log(remediationFor(error.message,error.probe));process.exitCode=1;}
}catch(error){
  console.log('ZASTAVENÉ – balík je neúplný alebo má zmenený obsah. Rozbaľte celý originálny balík z GitHubu do nového priečinka mimo projektu. Ochrany Windows nevypínajte.');
  console.log(JSON.stringify({error:'bundle_integrity_failed',...flags}));process.exitCode=1;
}
