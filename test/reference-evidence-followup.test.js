import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {digest,validateReview,matrixFor,validateHistory} from '../scripts/reference-source-audit.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
const old=JSON.parse(read('data/pilot/evidence-audit/source-review-2026-11-13.json'));
const review=JSON.parse(read('data/pilot/evidence-audit/source-review-2026-11-21.json'));
const pilot=JSON.parse(read('data/pilot/sk-eurocents.json'));
const baseline=Object.fromEntries(['gaps-2026-11-12.json','observations-2026-11-12.json'].map(n=>[n,digest(read('data/pilot/evidence-audit/'+n))]));
test('follow-up retains hash-bound historical review and nine unpromoted variants',()=>{
 assert.equal(review.follow_up.previous_review_sha256,digest(read(review.follow_up.previous_review_path)));
 assert.equal(validateReview(review,baseline).valid,true);
 const m=matrixFor(review,pilot);assert.deepEqual(m.counts,{'VERIFIED EVIDENCE':0,'PARTIALLY VERIFIED':138,'UNVERIFIED':9,'CONFLICT':6});
 assert.equal(m.variants.length,9);for(const row of m.variants)for(const c of Object.values(row.fields))assert.equal(c.exact_variant_status,'UNVERIFIED');
 assert.equal(m.identity,null);assert.equal(m.valuation_allowed,false);assert.equal(m.ready_for_physical_pilot,false);
});
test('original Annex confirms unresolved numeric disagreement without a provisional snippet',()=>{
 const m=matrixFor(review,pilot);
 for(const row of m.variants)if(!row.catalogue_id.includes('-001-')){assert.equal(row.fields['physical.mass_g'].status,'CONFLICT');assert.equal(row.fields['physical.mass_g'].provisional_conflict,false);}
 for(const n of [1,2,5]){const c=review.claims.find(c=>c.id==='eurlex-original-annex-'+n);assert.equal(c.scope,'nominal_specification');assert.equal(c.values['physical.mass_g'],{1:2.3,2:3,5:3.9}[n]);assert.match(c.locator,/page 6/);}
 assert.equal(review.claims.some(c=>c.id.startsWith('eurlex-index-mass')),false);
 assert.equal(old.claims.some(c=>c.id==='eurlex-index-mass-2'),true);
});
test('fifteen retained originals have source hashes, never hashes of notes',()=>{
 const sources=review.sources.filter(s=>s.snapshot_sha256);assert.equal(sources.length,15);
 for(const s of sources)assert.match(s.snapshot_sha256,/^[a-f0-9]{64}$/);
 const c=review.sources.find(s=>s.id==='eurlex-specification');assert.equal(c.snapshot_sha256,'43305ee22f821ca56a074720bec8f66e2b1fe78769b490b70f6f291fa116e5b2');assert.equal(c.access,'web_pdf_text_reviewed');
});
test('each paraphrased claim binds only to its source response hash',()=>{
 for(const c of review.claims)assert.equal(c.original_response_sha256,review.sources.find(s=>s.id===c.source_id).snapshot_sha256);
 const changed=structuredClone(review);changed.claims[0].original_response_sha256='a'.repeat(64);assert.ok(validateReview(changed,baseline).errors.includes('claim_original_hash_mismatch'));
});
test('year-specific issuer reports cannot be counted as independent specimens',()=>{
 const annual=review.claims.filter(c=>c.id.startsWith('nbs-annual-'));assert.equal(annual.length,6);
 for(const c of annual){assert.equal(c.scope,'issue_population');assert.equal(c.values.date,c.applies_to.date);assert.equal(c.review.status,'pending_expert_review');assert.equal(Object.hasOwn(c,'specimen_id'),false);}
 for(const year of [2019,2020]){const s=review.sources.find(s=>s.id==='nbs-annual-chapter-'+year);assert.equal(s.lineage,'official-sk-design');assert.equal(s.lineage_review.status,'conservative');}
});
test('quantity tolerances remain context and never become physical mass limits',()=>{
 const claims=review.claims.filter(c=>c.production_context);
 for(const c of claims){assert.ok(c.production_context.delivery_tolerance_note.includes('tolerance')||c.production_context.delivery_tolerance_note.includes('deviation'));assert.equal(Object.hasOwn(c.values,'physical.mass_g'),false);}
 assert.equal(claims.find(c=>c.id==='nbs-annual-2020-year-1').production_context.circulation_deliveries,57674500);
});
test('missing or rejected originals remain explicit, with no fabricated hash',()=>{
 const missing=review.sources.filter(s=>!s.snapshot_sha256);assert.equal(missing.length,3);
 assert.equal(review.additional_retrieval_attempts.find(p=>p.source_id==='nbs-annual-chapter-2021').state,'invalid_size');
 for(const p of review.additional_retrieval_attempts)assert.equal(p.archive_sha256,null);
});
test('new metadata contains no local private paths, source images or expert approval',()=>{
 const raw=JSON.stringify(review);assert.equal(/"[A-Z]:[\\/]/i.test(raw),false);
 assert.equal(review.follow_up.private_photographs_used,false);
 for(const s of review.sources)assert.equal(s.rights.public_original_release,false);
 for(const c of review.claims)assert.notEqual(c.review?.status,'approved');
});
test('new retrieval event appends to the existing hash chain',()=>{
 const dir=fileURLToPath(new URL('../data/pilot/evidence-audit/source-history/',import.meta.url));
 const entries=fs.readdirSync(dir).filter(p=>p.endsWith('.json')).sort().map(p=>{const raw=fs.readFileSync(dir+p);return {raw,event:JSON.parse(raw)};});
 assert.equal(entries.length,3);assert.equal(validateHistory(entries,baseline).valid,true);
 const e=entries.at(-1).event;assert.equal(e.review_sha256,digest(Buffer.from(JSON.stringify(review,null,2)+'\n')));assert.equal(e.probes.filter(p=>p.state==='available').length,15);
});
