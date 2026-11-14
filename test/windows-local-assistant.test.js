import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {installLocalFix,safeLocalError,SOURCE_CHECK,RUNTIME_FILES} from '../scripts/windows-local-assistant.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(t){
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'numis-code-fix-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const project=path.join(parent,'project'),bundle=path.join(parent,'bundle');fs.mkdirSync(project);fs.mkdirSync(bundle);
  for(const root of [project,bundle])fs.mkdirSync(path.join(root,'scripts'));
  const files=[{path:'scripts/existing.mjs',sha256:hash('NEW\n'),normalized_sha256:hash('NEW\n'),base_normalized_sha256:hash('OLD\n')},{path:'scripts/additional.mjs',sha256:hash('ADDED\n'),normalized_sha256:hash('ADDED\n'),base_normalized_sha256:null}];
  fs.writeFileSync(path.join(project,'scripts/existing.mjs'),'OLD\r\n');fs.writeFileSync(path.join(bundle,'scripts/existing.mjs'),'NEW\n');fs.writeFileSync(path.join(bundle,'scripts/additional.mjs'),'ADDED\n');
  const runtime=RUNTIME_FILES.map(p=>{const filename=path.join(project,p);fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,'SYNTHETIC RUNTIME\n');return {path:p,base_normalized_sha256:hash('SYNTHETIC RUNTIME\n')};});
  const manifest={base_commit:'86bc8cc3b6a4217e56783b6bc3585e1729ba3d90',files,runtime};fs.writeFileSync(path.join(bundle,'fix-manifest.json'),JSON.stringify(manifest));return {project,bundle,manifest};
}
test('exact-base code repair retains original bytes in unique backup and is idempotent',t=>{
  const f=fixture(t);const r=installLocalFix(f.project,f.bundle);assert.deepEqual(r,{changed_files:2,code_backup_created:true});
  const backup=fs.readdirSync(f.bundle).find(x=>x.startsWith('code-backup-'));assert.ok(backup);assert.equal(fs.readFileSync(path.join(f.bundle,backup,'scripts__existing.mjs'),'utf8'),'OLD\r\n');
  assert.equal(fs.readFileSync(path.join(f.project,'scripts/existing.mjs'),'utf8'),'NEW\n');assert.equal(installLocalFix(f.project,f.bundle).changed_files,0);
});
test('unknown local modification stops before any code or backup is written',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.project,'scripts/existing.mjs'),'USER CHANGES');assert.throws(()=>installLocalFix(f.project,f.bundle),/version_differs/);assert.equal(fs.readFileSync(path.join(f.project,'scripts/existing.mjs'),'utf8'),'USER CHANGES');assert.equal(fs.existsSync(path.join(f.project,'scripts/additional.mjs')),false);assert.equal(fs.readdirSync(f.bundle).some(x=>x.startsWith('code-backup-')),false);
});
test('corrupt delivery file stops before modifying project',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.bundle,'scripts/additional.mjs'),'CORRUPT');assert.throws(()=>installLocalFix(f.project,f.bundle),/integrity/);assert.equal(fs.readFileSync(path.join(f.project,'scripts/existing.mjs'),'utf8'),'OLD\r\n');
});
test('manifest cannot escape allowed code directories',t=>{
  const f=fixture(t);f.manifest.files[0].path='../private.txt';fs.writeFileSync(path.join(f.bundle,'fix-manifest.json'),JSON.stringify(f.manifest));assert.throws(()=>installLocalFix(f.project,f.bundle),/path_invalid/);
});
test('hard-linked project code cannot alter another path during repair',t=>{
  const f=fixture(t);const alias=path.join(f.project,'keep.mjs');fs.linkSync(path.join(f.project,'scripts/existing.mjs'),alias);assert.throws(()=>installLocalFix(f.project,f.bundle),/code_link_forbidden/);assert.equal(fs.readFileSync(alias,'utf8'),'OLD\r\n');assert.equal(fs.existsSync(path.join(f.project,'scripts/additional.mjs')),false);
});
test('changed safety dependency blocks repair before all project writes',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.project,'api/catalogue.js'),'SYNTHETIC UNSAFE CHANGE');assert.throws(()=>installLocalFix(f.project,f.bundle),/runtime_differs/);assert.equal(fs.readFileSync(path.join(f.project,'scripts/existing.mjs'),'utf8'),'OLD\r\n');assert.equal(fs.existsSync(path.join(f.project,'scripts/additional.mjs')),false);
});
test('local failure never reveals private paths and never authorizes valuation',()=>{
  const r=safeLocalError(Error('C:\\Users\\PRIVATE\\Pictures'));assert.equal(JSON.stringify(r).includes('PRIVATE'),false);assert.equal(r.automatic_cleanup,false);assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);
});
test('delivery and code backups must stay outside the project test discovery',t=>{
  const f=fixture(t);assert.throws(()=>installLocalFix(f.project,f.project),/bundle_must_be_outside_project/);assert.equal(fs.readFileSync(path.join(f.project,'scripts/existing.mjs'),'utf8'),'OLD\r\n');
});
test('source attribute check reads without modifying files, policies or ACL',()=>{
  assert.doesNotMatch(SOURCE_CHECK,/Set-ExecutionPolicy|Unblock-File|Set-Acl|Set-Item|Remove-Item|Copy-Item|Move-Item|Invoke-Expression/i);assert.match(SOURCE_CHECK,/ReparsePoint/);assert.match(SOURCE_CHECK,/Offline/);
});
test('explicit pinned PR #26 code is accepted with a backup, unknown versions remain blocked',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.project,'scripts/additional.mjs'),'KNOWN PR26\n');f.manifest.files[1].allowed_base_normalized_sha256=[hash('KNOWN PR26\n')];fs.writeFileSync(path.join(f.bundle,'fix-manifest.json'),JSON.stringify(f.manifest));
  assert.equal(installLocalFix(f.project,f.bundle).changed_files,2);assert.equal(fs.readFileSync(path.join(f.project,'scripts/additional.mjs'),'utf8'),'ADDED\n');
});
