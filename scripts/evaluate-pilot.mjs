import fs from 'node:fs';
import {evaluatePilot} from './pilot-benchmark.mjs';
import {parsePilotArgs,preflightFromFiles} from './pilot-preflight.mjs';
try{
  const options=parsePilotArgs(process.argv.slice(2),{run:{type:'string'}});
  const {input,report}=await preflightFromFiles(options);
  let run={};try{if(process.platform!=='win32'&&(fs.statSync(options.run).mode&0o077))throw Error('private');run=JSON.parse(fs.readFileSync(options.run,'utf8'));}catch{report.errors.push('run_private_file_unavailable');report.valid=false;}
  const evaluation=evaluatePilot(input,run,report);
  console.log(JSON.stringify(evaluation,null,2));if(!evaluation.empirical_accepted)process.exitCode=1;
}catch{console.log(JSON.stringify({accepted:false,empirical_accepted:false,measurement_status:'NOT_MEASURED',errors:['evaluation_input_error'],ready_for_physical_pilot:false}));process.exitCode=1;}
