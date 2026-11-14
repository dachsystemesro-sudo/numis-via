import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {diagnoseWindowsStorage} from './windows-intake-diagnostics.mjs';

const flags={identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
export function main(args){
  const {values}=parseArgs({args,options:{vault:{type:'string'}}});
  if(values.vault&&!path.isAbsolute(values.vault))throw Error('vault_absolute_path_required');
  const helper=fileURLToPath(new URL('./private-intake-storage.ps1',import.meta.url));
  // No mkdir, writes, photo selection or changes to an existing archive. A
  // missing default target intentionally tests only whether the helper starts.
  const target=values.vault??path.join(os.tmpdir(),'NUMIS-DIAGNOSTIC-'+randomUUID());
  const diagnostic=diagnoseWindowsStorage(helper,target);
  const complete=diagnostic.windows_access===true&&diagnostic.probe.valid===true&&diagnostic.check.helper_started===true;
  console.log(JSON.stringify({operation:'read_only_diagnosis',diagnostic_complete:complete,...diagnostic},null,2));
  return complete?0:1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{process.exitCode=main(process.argv.slice(2));}
  catch(error){console.log(JSON.stringify({operation:'read_only_diagnosis',diagnostic_complete:false,error:/^[a-z_0-9]+(?::[a-z_0-9]+)?$/.test(error?.message)?error.message:'diagnostic_failed',...flags}));process.exitCode=1;}
}
