// Explicitly opt-in collector. Never invoked by CI or readiness inventory.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {sha256} from './pilot-contract.mjs';
import {parsePilotArgs,preflightFromFiles} from './pilot-preflight.mjs';
import {evaluatePilot} from './pilot-benchmark.mjs';

export function casePayload(sample,root){
  if(Date.now()>=Date.parse(sample.rights.retention_until))throw Error('rights_expired');
  return {images:sample.images.map(image=>{
    const resolved=path.resolve(root,image.path);
    if(fs.realpathSync(resolved)!==resolved||path.relative(root,resolved).startsWith('..'))throw Error('asset_changed');
    const stat=fs.statSync(resolved);if(!stat.isFile()||stat.size>10*1024*1024||process.platform==='win32'||(stat.mode&0o077))throw Error('asset_changed');
    const bytes=fs.readFileSync(resolved);if(sha256(bytes)!==image.sha256)throw Error('asset_changed');
    return `data:${image.mime};base64,${bytes.toString('base64')}`;
  }),measurements:sample.measurements||{}};
}

export async function collectPilot({input,report,root},send,save){
  if(!report.valid||!report.assets_checked)throw Error('preflight_failed');
  const run={schema_version:'2.0',dataset_kind:input.manifest.dataset_kind,commit:input.config.commit,coinprint_version:input.config.coinprint_version,models:input.config.models,asset_inventory_sha256:report.asset_inventory_sha256,started_at:new Date().toISOString(),finished_at:new Date().toISOString(),results:[]};
  for(const [name,value] of Object.entries(input.hashes))run[name+'_sha256']=value;
  save(run);
  for(const sample of input.manifest.cases){
    try{
      const payload=casePayload(sample,root);
      const result=await send(input.config.endpoint,payload);
      run.results.push({case_id:sample.case_id,http_status:result.status,body:result.body});
    }catch{run.results.push({case_id:sample.case_id,http_status:0,body:{error:'request_or_asset_failed'}});}
    run.finished_at=new Date().toISOString();save(run);
    if(run.results.at(-1).http_status===0)break;
  }
  return run;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  let fd;
  try{
    const options=parsePilotArgs(process.argv.slice(2),{execute:{type:'boolean',default:false},output:{type:'string'}});
    const preflight=await preflightFromFiles(options);
    if(!options.execute){console.log(JSON.stringify({...preflight.report,execution:'NOT_REQUESTED'},null,2));if(!preflight.report.valid)process.exitCode=1;}
    else{
      if(!preflight.report.ready_for_execution||preflight.input.manifest.dataset_kind!=='real')throw Error('preflight');
      const output=path.resolve(options.output),repo=fileURLToPath(new URL('../',import.meta.url)),relative=path.relative(repo,output);
      if(!relative.startsWith('..')||!path.isAbsolute(output)||fs.realpathSync(path.dirname(output))!==path.dirname(output)||(process.platform!=='win32'&&(fs.statSync(path.dirname(output)).mode&0o077)))throw Error('private');
      fd=fs.openSync(output,'wx',0o600);
      const save=run=>{fs.ftruncateSync(fd,0);fs.writeSync(fd,JSON.stringify(run,null,2)+'\n',0,'utf8');fs.fsyncSync(fd);};
      const send=async(url,payload)=>{
        const response=await fetch(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(180000)});
        return {status:response.status,body:await response.json()};
      };
      const run=await collectPilot(preflight,send,save),evaluation=evaluatePilot(preflight.input,run,preflight.report);
      console.log(JSON.stringify(evaluation,null,2));if(!evaluation.empirical_accepted)process.exitCode=1;
    }
  }catch{console.log(JSON.stringify({accepted:false,execution:'BLOCKED',measurement_status:'NOT_MEASURED',errors:['collector_preflight_or_storage_failed'],ready_for_physical_pilot:false}));process.exitCode=1;}
  finally{if(fd!==undefined)fs.closeSync(fd);}
}
