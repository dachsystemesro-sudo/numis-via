// Opt-in collector for a frozen blind set. Never run as part of CI.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {evaluatePilot} from './pilot-benchmark.mjs';
const [manifestPath,endpoint,configPath,outputPath]=process.argv.slice(2);
if(!manifestPath||!endpoint||!configPath||!outputPath)throw Error('Usage: node scripts/run-pilot.mjs MANIFEST ENDPOINT RUN-CONFIG OUTPUT');
const raw=fs.readFileSync(manifestPath),manifest=JSON.parse(raw);
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const run={...config,manifest_sha256:hash(raw),started_at:new Date().toISOString(),finished_at:new Date().toISOString(),results:[]};
// Preflight validates quotas, separation, review, rights, configuration and lock.
const preflight=evaluatePilot(manifest,run,hash(raw));
const errors=preflight.errors.filter(e=>!e.startsWith('missing_or_invalid_response:')&&e!=='result_set_mismatch');
if(errors.length)throw Error('Preflight failed: '+errors.join(', '));
if(fs.existsSync(outputPath))throw Error('Output exists; preserve prior run evidence.');
const url=new URL(endpoint);
if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('Use HTTPS or a local test server.');
// Resolve and hash EVERY asset before making the first paid model request.
const root=path.dirname(fs.realpathSync(manifestPath));
const requests=manifest.cases.map(c=>{
  const images=c.images.map(image=>{
    const file=fs.realpathSync(path.resolve(root,image.path));
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Image outside manifest directory.');
    const data=fs.readFileSync(file);
    if(hash(data)!==image.sha256)throw Error('Image hash mismatch: '+c.case_id);
    if(!['image/jpeg','image/png','image/webp'].includes(image.mime))throw Error('Unsupported image MIME.');
    return `data:${image.mime};base64,${data.toString('base64')}`;
  });
  return {case_id:c.case_id,payload:{images,measurements:c.measurements||{}}};
});
for(const request of requests){
  try{
    // Expected labels, categories, reviews and specimen IDs are never sent.
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request.payload),signal:AbortSignal.timeout(180000)});
    run.results.push({case_id:request.case_id,http_status:response.status,body:await response.json()});
  }catch(error){run.results.push({case_id:request.case_id,http_status:0,body:{error:String(error.message)}});}
  run.finished_at=new Date().toISOString();
  fs.writeFileSync(outputPath,JSON.stringify(run,null,2)+'\n');
}
const report=evaluatePilot(manifest,run,hash(raw));
console.log(JSON.stringify(report,null,2));
if(!report.accepted)process.exitCode=1;
