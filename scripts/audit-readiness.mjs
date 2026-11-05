import fs from 'node:fs';
import catalogue from '../data/catalogue.json' with {type:'json'};
import state from '../data/import-state.json' with {type:'json'};
import {validateCatalogue} from '../api/catalogue-validator.js';

const validated=validateCatalogue(catalogue);
const records=Array.isArray(catalogue.records)?catalogue.records:[];
const verified=records.filter(r=>r.identity_level==='variant'&&r.verification_state==='verified_reference');
const evidenceComplete=verified.filter(r=>Array.isArray(r.reference_evidence)&&r.reference_evidence.length>0&&r.reference_evidence.every(e=>e.source_id&&e.field&&e.value&&e.source_url));
const checklist=fs.readFileSync(new URL('../PRODUCTION_READINESS.md',import.meta.url),'utf8');
const section=checklist.split('## READY FOR PHYSICAL PILOT')[1]?.split('## PHYSICAL PILOT')[0]||'';
const pending=(section.match(/^- \[ \]/gm)||[]).length;
const report={
  generated_at:new Date().toISOString(),
  catalogue:{schema_valid:validated.valid,validation_errors:validated.errors,records:records.length,verified_reference:verified.length,verified_with_evidence:evidenceComplete.length,ocre_staged:state.sources?.ocre?.total_staged??null,ocre_complete:state.sources?.ocre?.complete===true},
  readiness:{pending_checklist_items:pending,ready_for_physical_pilot:validated.valid&&verified.length>0&&verified.length===evidenceComplete.length&&pending===0},
  note:'This is a conservative inventory audit, not proof of image recognition accuracy, Vercel runtime health, independent blind testing, or expert verification.'
};
console.log(JSON.stringify(report,null,2));
if(!validated.valid)process.exitCode=1;
