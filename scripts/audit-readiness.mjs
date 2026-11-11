import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import catalogue from '../data/catalogue.json' with {type:'json'};
import state from '../data/import-state.json' with {type:'json'};
import pilot from '../data/pilot/sk-eurocents.json' with {type:'json'};
import sources from '../data/pilot/sources.json' with {type:'json'};
import {validateCatalogue} from '../api/catalogue-validator.js';
import {reviewPilotReference} from '../api/pilot-reference.js';
import {TARGET_IDS,evaluatePilot} from './pilot-benchmark.mjs';

export function auditReadiness({catalogue,state,pilot,sources,checklist,benchmark={accepted:false}}){
  const validated=validateCatalogue(catalogue);
  const records=catalogue.records||[];
  const verified=records.filter(r=>r.identity_level==='variant'&&r.verification_state==='verified_reference');
  const invalidReferences=verified.map(r=>({id:r.catalogue_id,...reviewPilotReference(r,sources)})).filter(r=>!r.valid);
  const start=checklist.indexOf('## READY FOR PHYSICAL PILOT');
  const end=checklist.indexOf('## PHYSICAL PILOT',start+1);
  const section=start>=0&&end>start?checklist.slice(start,end):'';
  const boxes=section.match(/^- \[[ xX]\]/gm)||[];
  const pending=boxes.filter(x=>x==='- [ ]').length;
  const evidenceRows=checklist.split('\n').filter(x=>/^\|/.test(x)&&!/^\|\s*(Kontrola|---)/.test(x));
  const evidenceDocumented=evidenceRows.length>=11&&evidenceRows.every(row=>/\d{4}-\d{2}-\d{2}/.test(row)&&/https:\/\//.test(row)&&/PASS/.test(row));
  const covered=TARGET_IDS.filter(id=>verified.some(r=>r.catalogue_id===id&&reviewPilotReference(r,sources).valid));
  const pilotIDs=(pilot.records||[]).map(r=>r.catalogue_id);
  const pilotValid=pilot.schema_version==='1.0'&&pilotIDs.length===9&&new Set(pilotIDs).size===9&&TARGET_IDS.every(id=>pilotIDs.includes(id))&&pilot.records.every(r=>['needs_reference_review','verified_reference'].includes(r.verification_state)&&(r.verification_state!=='verified_reference'||reviewPilotReference(r,sources).valid));
  const integrity=validated.valid&&invalidReferences.length===0&&pilotValid;
  const ready=integrity&&covered.length===9&&boxes.length===11&&pending===0&&evidenceDocumented&&benchmark.accepted===true;
  return {generated_at:new Date().toISOString(),integrity_passed:integrity,catalogue:{schema_valid:validated.valid,validation_errors:validated.errors,records:records.length,verified_reference:verified.length,invalid_references:invalidReferences,ocre_staged:state.sources?.ocre?.total_staged??null,ocre_complete:state.sources?.ocre?.complete===true},pilot:{structure_valid:pilotValid,candidates:pilotIDs.length,production_variants_covered:covered.length,required_variants:9},benchmark,readiness:{checklist_items:boxes.length,pending_checklist_items:pending,evidence_documented:evidenceDocumented,ready_for_physical_pilot:ready},note:'Inventory and review-trail validation only. PASS evidence must be reviewed against the current commit; this audit cannot prove image accuracy, runtime health or truth of reference claims. OCRE completion is not required for this pilot.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const checklist=fs.readFileSync(new URL('../PRODUCTION_READINESS.md',import.meta.url),'utf8');
  const manifestRaw=fs.readFileSync(new URL('../data/pilot/blind-manifest.json',import.meta.url));
  const runURL=new URL('../data/pilot/blind-run.json',import.meta.url);
  const run=fs.existsSync(runURL)?JSON.parse(fs.readFileSync(runURL,'utf8')):{};
  const referenceRaw=fs.readFileSync(new URL('../data/catalogue.json',import.meta.url));
  const benchmark=evaluatePilot(JSON.parse(manifestRaw),run,createHash('sha256').update(manifestRaw).digest('hex'),createHash('sha256').update(referenceRaw).digest('hex'));
  const report=auditReadiness({catalogue,state,pilot,sources,checklist,benchmark});
  console.log(JSON.stringify(report,null,2));
  if(!report.integrity_passed||(process.argv.includes('--require-ready')&&!report.readiness.ready_for_physical_pilot))process.exitCode=1;
}
