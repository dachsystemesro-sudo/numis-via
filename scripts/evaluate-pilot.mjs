import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluatePilot} from './pilot-benchmark.mjs';
const [manifestPath,runPath]=process.argv.slice(2);
if(!manifestPath||!runPath){console.error('Usage: npm run pilot:evaluate -- MANIFEST.json RUN.json');process.exitCode=2;}
else{
  const raw=fs.readFileSync(manifestPath);
  const reference=fs.readFileSync(new URL('../data/catalogue.json',import.meta.url));
  const report=evaluatePilot(JSON.parse(raw),JSON.parse(fs.readFileSync(runPath,'utf8')),createHash('sha256').update(raw).digest('hex'),createHash('sha256').update(reference).digest('hex'));
  console.log(JSON.stringify(report,null,2));
  if(!report.accepted)process.exitCode=1;
}
