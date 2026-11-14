import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {discoverProjects,diagnosticBlockReason,remediationFor} from '../scripts/windows-helper-ui.mjs';
import {RUNTIME_FILES} from '../scripts/windows-local-assistant.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),python=process.platform==='win32'?'python':'python3';
const hash=b=>createHash('sha256').update(b).digest('hex');
const artifact=path.join(root,'downloads/NUMIS-VIA-Windows-pomocnik.zip');
const pins=JSON.parse(fs.readFileSync(path.join(root,'windows-helper/supported-bases.json'),'utf8'));
const flags=r=>{assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);};
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'NUMIS-SYNTHETIC-HELPER-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
function unpack(t){const out=path.join(temp(t),'package');execFileSync(python,['-c','import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',artifact,out]);return path.join(out,'NUMIS-VIA-pomocnik');}
const good=()=>({platform:'win32',windows_access:true,probe:{valid:true,helper_exists:true,language_mode:'FullLanguage'},check:{valid:false,helper_started:true,reason:'parents_line_65_objectnotfound_itemnotfoundexception'}});

test('downloadable ZIP matches every public source byte and contains no photographs',()=>{
  const report=JSON.parse(execFileSync(python,[path.join(root,'scripts/build-windows-helper.py'),'--check'],{encoding:'utf8'}));assert.equal(report.valid,true);assert.equal(report.photos,0);assert.equal(report.files,15);
});
test('pinned runtime inventory exactly covers unchanged PR #26 runtime',()=>{
  assert.deepEqual([...pins.runtime_files].sort(),[...RUNTIME_FILES].sort());
  for(const file of RUNTIME_FILES){assert.equal(pins.hashes[file].pr25,pins.hashes[file].pr26);assert.equal(hash(Buffer.from(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'))),pins.hashes[file].pr25);}
});
test('packaged checksum preflight rejects changed code before loading the helper',t=>{
  const bundle=unpack(t);fs.appendFileSync(path.join(bundle,'scripts/windows-local-assistant.mjs'),'\nthrow Error("MUST_NOT_EXECUTE_SYNTHETIC");');
  const r=spawnSync(process.execPath,[path.join(bundle,'SPUSTIT.mjs')],{encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stdout,/bundle_integrity_failed/);assert.equal(r.stderr.includes('MUST_NOT_EXECUTE'),false);assert.equal(fs.readdirSync(bundle).some(p=>p.startsWith('code-backup-')),false);
});
test('one-click launcher delegates only to Node and keeps failures visible',()=>{
  const cmd=fs.readFileSync(path.join(root,'windows-helper/SPUSTIT.cmd'),'utf8');assert.match(cmd,/%~dp0SPUSTIT\.mjs/);assert.match(cmd,/pause/);assert.doesNotMatch(cmd,/powershell|ExecutionPolicy|Defender|reg\.exe|del |rmdir|curl|npm ci/i);
});
test('read-only discovery finds a unique project without entering dependency trees',t=>{
  const p=temp(t);fs.mkdirSync(path.join(p,'one','project'),{recursive:true});fs.mkdirSync(path.join(p,'node_modules','hidden-project'),{recursive:true});
  const r=discoverProjects([p],{isCandidate:dir=>path.basename(dir).endsWith('project')});assert.deepEqual([...r],[path.join(p,'one','project')]);assert.equal(r.truncated,false);
});
test('discovery keeps ambiguous projects ambiguous',t=>{
  const p=temp(t);fs.mkdirSync(path.join(p,'one'));fs.mkdirSync(path.join(p,'two'));assert.equal(discoverProjects([p],{isCandidate:dir=>['one','two'].includes(path.basename(dir))}).length,2);
});
test('truncated discovery cannot authorize automatic project selection',t=>{
  const p=temp(t);fs.mkdirSync(path.join(p,'one'));fs.mkdirSync(path.join(p,'two'));const r=discoverProjects([p],{isCandidate:()=>false,maxDirs:1});assert.equal(r.truncated,true);
});
test('preflight accepts only the expected missing new leaf after the real helper starts',()=>assert.equal(diagnosticBlockReason(good()),null));
for(const [name,edit] of Object.entries({
  non_ntfs:d=>{d.check.reason='drive_line_12_operationstopped_runtimeexception';},
  sync_or_reparse:d=>{d.check.reason='parents_line_24_operationstopped_runtimeexception';},
  acl_error:d=>{d.check.reason='acl_line_70_permissiondenied_methodinvocationexception';},
  missing_helper:d=>{d.probe.helper_exists=false;},
  constrained:d=>{d.probe.language_mode='ConstrainedLanguage';},
  missing_report:d=>{d.probe.valid=false;},
  script_security:d=>{d.check.helper_started=false;d.check.reason='powershell_script_security_block';},
  unexpected_success:d=>{d.check.valid=true;delete d.check.reason;},
  contradictory_success:d=>{d.check.valid=true;},
  wrong_os:d=>{d.windows_access=false;d.platform='linux';}
}))test('preflight refuses '+name+' before photo selection or code writes',()=>{const d=good();edit(d);assert.equal(typeof diagnosticBlockReason(d),'string');});
test('an existing destination is never accepted by preflight',()=>assert.equal(diagnosticBlockReason(good(),{targetExists:true}),'new_empty_vault_required'));
for(const [name,probe,word] of [
  ['restricted',{effective_policy:'Restricted'},'Restricted'],
  ['all_signed',{effective_policy:'AllSigned'},'podpis'],
  ['remote_signed',{effective_policy:'RemoteSigned',zone_identifier:'zone_3'},'internetová'],
  ['unknown',{},'nie je dostatočne preukázaná']
])test('Slovak security remediation is evidence-dependent: '+name,()=>assert.match(remediationFor('powershell_script_security_block',probe),new RegExp(word)));
test('operator preview names all possible code changes and private outputs',t=>{
  const bundle=unpack(t),preview=fs.readFileSync(path.join(bundle,'PRED-SPUSTENIM.txt'),'utf8');
  for(const name of pins.install_files)assert.ok(preview.includes(name));
  for(const name of ['source-map.json','technical-report.json','capture-draft.json','DALSIE-KROKY.txt','code-backup-UUID'])assert.ok(preview.includes(name));
  assert.ok(preview.includes('captured_at=null'));assert.ok(preview.includes('ExecutionPolicy'));
});
test('packaged assistant performs the native Windows flow on a frozen PR #25 synthetic project',async t=>{
  const bundle=unpack(t),{runLocalAssistant}=await import(pathToFileURL(path.join(bundle,'scripts/windows-local-assistant.mjs')).href);
  const logs=[];
  if(process.platform!=='win32'){
    assert.equal(await runLocalAssistant(['--prepare'],{bundle,log:x=>logs.push(x)}),1);flags(JSON.parse(logs[0]));assert.equal(JSON.parse(logs[0]).windows_access,false);return;
  }
  // The loaded native Sharp DLL stays locked on Windows until process exit.
  // Keep this wholly synthetic fixture for the disposable runner to reclaim.
  const p=fs.mkdtempSync(path.join(os.tmpdir(),'NUMIS-SYNTHETIC-WINDOWS-PROJECT-')),project=path.join(p,'project'),photos=path.join(p,'photos');fs.mkdirSync(project);fs.mkdirSync(photos);
  const archive=execFileSync('git',['archive',pins.revisions.pr25],{cwd:root,maxBuffer:128*1024*1024});execFileSync('tar',['-xf','-','-C',project],{input:archive});
  fs.cpSync(path.join(root,'node_modules'),path.join(project,'node_modules'),{recursive:true});
  const sources=[];for(let i=0;i<6;i++){const file=path.join(photos,'SYNTHETIC-'+i+'.png');fs.writeFileSync(file,await sharp({create:{width:512,height:512,channels:3,background:{r:20+i*30,g:40,b:70}}}).png().toBuffer());sources.push(file);}
  const before=sources.map(f=>({bytes:fs.readFileSync(f),stat:fs.statSync(f)}));let selections=0;
  const result=await runLocalAssistant(['--prepare','--project',project],{bundle,vaultParent:p,log:x=>logs.push(x),choosePhotos:()=>{selections++;assert.ok(logs.some(x=>x.includes('read_only_diagnosis')));return sources;}});
  assert.equal(result,0);assert.equal(selections,1);
  const vault=path.join(p,fs.readdirSync(p).find(x=>x.startsWith('NUMIS-VIA-1c2020-')));assert.ok(vault);
  const read=n=>JSON.parse(fs.readFileSync(path.join(vault,n),'utf8'));
  flags(read('specimen.json'));flags(read('dossier.json'));flags(read('technical-report.json'));assert.equal(read('technical-report.json').accepted_intakes,0);
  for(const image of read('capture-draft.json').images){assert.equal(image.captured_at,null);assert.deepEqual(image.roles,[]);}
  assert.equal(read('capture-draft.json').capture_check.same_specimen_confirmed,null);assert.equal(read('dossier.json').final_decision.status,'pending');
  assert.deepEqual(fs.readdirSync(path.join(vault,'intakes')),[]);assert.ok(fs.existsSync(path.join(vault,'DALSIE-KROKY.txt')));
  for(let i=0;i<6;i++){assert.deepEqual(fs.readFileSync(sources[i]),before[i].bytes);assert.deepEqual(fs.readFileSync(path.join(vault,'incoming','PHOTO-00'+(i+1)+'.png')),before[i].bytes);assert.equal(fs.statSync(sources[i]).mtimeMs,before[i].stat.mtimeMs);assert.equal(fs.statSync(sources[i]).ctimeMs,before[i].stat.ctimeMs);}
  for(const name of RUNTIME_FILES)assert.equal(hash(Buffer.from(fs.readFileSync(path.join(project,name),'utf8').replace(/\r\n/g,'\n'))),pins.hashes[name].pr25);
  const backup=fs.readdirSync(bundle).find(x=>x.startsWith('code-backup-'));assert.ok(backup);assert.ok(fs.existsSync(path.join(bundle,backup,'scripts__intake-storage.mjs')));
});
