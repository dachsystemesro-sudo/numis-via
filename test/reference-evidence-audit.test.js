import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validateEvidenceAudit,renderEvidenceMatrix,contextLineages,AUDIT_FIELDS} from '../scripts/audit-reference-evidence.mjs';
import {reviewPilotReference} from '../api/pilot-reference.js';
import {auditReadiness} from '../scripts/audit-readiness.mjs';
import catalogue from '../data/catalogue.json' with {type:'json'};
import pilot from '../data/pilot/sk-eurocents.json' with {type:'json'};
import registry from '../data/pilot/sources.json' with {type:'json'};

const raw=fs.readFileSync(new URL('../data/pilot/evidence-audit/observations-2026-11-12.json',import.meta.url));
const auditData=JSON.parse(fs.readFileSync(new URL('../data/pilot/evidence-audit/gaps-2026-11-12.json',import.meta.url)));
const digest=v=>createHash('sha256').update(v).digest('hex');
function fixture(){return {audit:structuredClone(auditData),notes:JSON.parse(raw)};}
function check(f,{rehash=true}={}){
  const notesRaw=Buffer.from(JSON.stringify(f.notes));
  if(rehash)f.audit.observation_notes.sha256=digest(notesRaw);
  return validateEvidenceAudit(f.audit,{pilot,registry,notes:f.notes,notesRaw});
}

test('committed nine-variant audit has full field coverage and no promotion',()=>{
  const report=validateEvidenceAudit(auditData,{pilot,registry,notes:JSON.parse(raw),notesRaw:raw});
  assert.equal(report.valid,true,JSON.stringify(report.errors));
  assert.equal(report.variants,9);assert.equal(report.fields_per_variant,17);
  assert.equal(report.production_promotions,0);assert.equal(report.independently_corroborated_exact_fields,0);assert.equal(report.ready_for_physical_pilot,false);
  for(const row of auditData.variants){
    assert.equal(Object.keys(row.fields).length,AUDIT_FIELDS.length);
    assert.equal(row.verification_state,'needs_reference_review');
    assert.equal(reviewPilotReference(pilot.records.find(r=>r.catalogue_id===row.catalogue_id),registry).valid,false);
  }
});
test('NBS and ECB design descriptions remain one conservative lineage',()=>{
  const notes=JSON.parse(raw);
  assert.deepEqual(contextLineages(['nbs-design','ecb-design'],notes),['official-sk-design']);
  assert.deepEqual(contextLineages(['nbs-design','nbs-design','ecb-design'],notes),['official-sk-design']);
});
test('population-year quantities have the correct denomination/year cells',()=>{
  const notes=JSON.parse(raw);
  const observed={1:['32,020','57,702','14,669'],2:['14,470','25,122','7,335'],5:['4,045','16,510','6,319']};
  for(const n of [1,2,5])for(const [i,year] of [2019,2020,2021].entries()){
    const o=notes.observations.find(o=>o.id===`nbs-issue-${n}-${year}`);
    assert.equal(o.values.quantity_millions_as_displayed,observed[n][i]);
    assert.equal(o.scope,'issue_population');
  }
});

for(const [name,mutate] of Object.entries({
  missing_variant:f=>{f.audit.variants.pop();},
  duplicate_variant:f=>{f.audit.variants[1]=f.audit.variants[0];},
  missing_material_field:f=>{delete f.audit.variants[0].fields.material;},
  missing_lookalike_blocker:f=>{f.audit.variants[0].unresolved_blockers=f.audit.variants[0].unresolved_blockers.filter(b=>!b.includes('lookalikes'));},
  year_substitution:f=>{f.audit.variants[0].fields.date.asserted_value='2020';},
  wrong_year_context:f=>{f.audit.variants[0].fields.date.observations=['nbs-issue-1-2021'];},
  wrong_field_context:f=>{f.audit.variants[0].fields.mint_mark.observations=['nbs-design'];},
  mismatched_observed_year:f=>{f.notes.observations.find(o=>o.id==='nbs-issue-1-2019').values.date='2020';},
  duplicate_evidence:f=>{f.audit.variants[0].fields.main_motif.observations=['nbs-design','nbs-design'];},
  fake_snapshot_hash:f=>{f.notes.sources[0].source_snapshot.sha256='a'.repeat(64);},
  spoofed_original_url:f=>{f.notes.sources[0].url='https://nbs.sk.evil.invalid/';},
  spoofed_observation_url:f=>{f.notes.observations[0].source_url='https://example.invalid/';},
  unreviewed_terms_url:f=>{f.notes.sources[0].terms.url='https://example.invalid/permission';},
  invented_independence:f=>{f.notes.sources.find(s=>s.id==='ecb-sk').lineage_group='independent-ecb';},
  asserted_independence:f=>{f.notes.sources[0].independence_status='verified';},
  nominal_as_specimen:f=>{f.notes.observations.find(o=>o.id==='ecb-spec-1').scope='exact_specimen';},
  unavailable_legal_source_as_evidence:f=>{f.notes.observations[0].source_id='eurlex-specification';f.notes.observations[0].source_url=f.notes.sources.find(s=>s.id==='eurlex-specification').url;},
  missing_user_photo_rights:f=>{delete f.audit.variants[0].rights.user_photographs;},
  invented_expert_signature:f=>{f.audit.variants[0].expert_review={status:'approved',reviewed_by:'NOT A REAL REVIEW',reviewed_at:'2026-11-12'};},
  asserted_corroboration:f=>{f.audit.variants[0].independently_corroborated_fields=['date'];},
  promoted_field:f=>{f.audit.variants[0].fields.date.exact_variant_status='verified';},
  ready_flag:f=>{f.audit.ready_for_physical_pilot=true;},
  production_loaded:f=>{f.audit.production_loaded=true;}
}))test('gap audit rejects '+name,()=>{const f=fixture();mutate(f);const result=check(f);assert.equal(result.valid,false,JSON.stringify(result));});

test('changing retained audit notes invalidates the hash without claiming a source hash',()=>{
  const f=fixture();f.notes.method+=' changed';assert.equal(check(f,{rehash:false}).valid,false);
  assert.equal(auditData.observation_notes.sha256,digest(raw));
  for(const s of JSON.parse(raw).sources)assert.equal(s.source_snapshot.sha256,null);
});
test('matrix is reproducible and contains nine summary rows plus every field',()=>{
  const rendered=renderEvidenceMatrix(auditData,JSON.parse(raw));
  assert.equal(fs.readFileSync(new URL('../docs/evidence-audit/ISSUE_19_MATRIX.md',import.meta.url),'utf8'),rendered);
  assert.equal((rendered.match(/^\| SK-EUR-/gm)||[]).length,9);
  assert.equal((rendered.match(/^### SK-EUR-/gm)||[]).length,9);
  for(const field of AUDIT_FIELDS)assert.equal(rendered.split('\n').filter(l=>l.startsWith('| '+field+' |')).length,9);
});
test('audit observations cannot change production reference or readiness gates',()=>{
  assert.equal(catalogue.records.some(r=>r.verification_state==='verified_reference'),false);
  assert.equal(pilot.production_loaded,false);
  const report=auditReadiness({catalogue,state:{},pilot,sources:registry,checklist:''});
  assert.equal(report.integrity_passed,true);assert.equal(report.pilot.production_variants_covered,0);assert.equal(report.readiness.ready_for_physical_pilot,false);
});
