import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {storageResult,callStorage,windowsPowerShell,sanitizeProbe,diagnoseWindowsStorage,READ_ONLY_PROBE} from '../scripts/windows-intake-diagnostics.mjs';
const helper=fileURLToPath(new URL('../scripts/private-intake-storage.ps1',import.meta.url));
const cli=fileURLToPath(new URL('../scripts/diagnose-windows-storage.mjs',import.meta.url));
for(const [code,reason] of Object.entries({ENOENT:'powershell_not_found',EACCES:'powershell_access_denied',EPERM:'powershell_access_denied',ETIMEDOUT:'powershell_timeout',ENOBUFS:'powershell_output_limit',OTHER:'powershell_spawn_failed'}))test('Windows spawn diagnostic '+code,()=>{
  assert.deepEqual(storageResult({status:null,error:{code,message:'C:\\Users\\PRIVATE\\secret'}}),{valid:false,reason,helper_started:false});
});
for(const stderr of ['PSSecurityException','FullyQualifiedErrorId : UnauthorizedAccess','ScriptNotSigned'])test('policy/security rejection distinguished: '+stderr,()=>{
  const r=storageResult({status:1,stdout:'',stderr:'C:\\Users\\PRIVATE\\secret '+stderr});assert.equal(r.reason,'powershell_script_security_block');assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
});
for(const [name,input,reason] of [
  ['empty',{status:0,stdout:''},'powershell_output_empty'],
  ['non JSON',{status:0,stdout:'PRIVATE'},'powershell_json_invalid'],
  ['truncated JSON',{status:0,stdout:'{"valid":'},'powershell_json_invalid'],
  ['wrong protocol',{status:0,stdout:'{"valid":true}'},'powershell_report_invalid'],
  ['nonzero exit',{status:1,stdout:'{"valid":true,"platform":"windows_ntfs_acl"}'},'powershell_exit_without_valid_report'],
  ['termination',{status:null,signal:'SIGTERM'},'powershell_interrupted']
])test('fail closed: '+name,()=>assert.deepEqual(storageResult(input),{valid:false,reason,helper_started:false}));
test('BOM and whitespace are accepted only with full ACL success protocol',()=>assert.equal(storageResult({status:0,stdout:'\uFEFF {"valid":true,"platform":"windows_ntfs_acl"}\r\n'}).valid,true));
test('helper diagnostic preserves sanitized stage but never raw values',()=>{
  const r=storageResult({status:1,stdout:JSON.stringify({valid:false,error:'windows_private_storage_unverified',stage:'acl',line:70,category:'PermissionDenied',exception_type:'MethodInvocationException',private_path:'PRIVATE'})});
  assert.equal(r.reason,'acl_line_70_permissiondenied_methodinvocationexception');assert.equal(r.helper_started,true);assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
});
test('malicious diagnostic words and invalid line are rejected',()=>{
  const r=storageResult({status:1,stdout:JSON.stringify({valid:false,error:'windows_private_storage_unverified',stage:'owner',line:-1,category:'PRIVATE/path',exception_type:'PRIVATE:SID'})});assert.equal(r.reason,'owner_line_0_unknown_unknown');
});
test('missing helper is distinguished before starting any process',()=>{
  const r=callStorage(helper+'.not-present','C:\\UNUSED',{run:()=>assert.fail('must not start')});assert.equal(r.reason,'helper_missing');
});
test('absolute PowerShell path covers native and WOW64 Node',()=>{
  assert.equal(windowsPowerShell({env:{SystemRoot:'C:\\Windows'},arch:'x64'}),'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.equal(windowsPowerShell({env:{SystemRoot:'C:\\Windows',PROCESSOR_ARCHITEW6432:'AMD64'},arch:'ia32'}),'C:\\Windows\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.throws(()=>windowsPowerShell({env:{SystemRoot:'relative'}}),/system_root_invalid/);
});
test('read-only policy probe cannot substitute for real ACL validation',()=>{
  let calls=0;
  const r=diagnoseWindowsStorage(helper,'C:\\MISSING',{platform:'win32',program:'TEST-POWERSHELL',run:(program,args)=>{
    assert.equal(program,'TEST-POWERSHELL');assert.equal(args.includes('-ExecutionPolicy'),false);
    if(++calls===1){assert.ok(args.includes('-Command'));assert.equal(args.at(-1),READ_ONLY_PROBE);return {status:0,stdout:JSON.stringify({schema:'numis_windows_diagnostic_v1',effective_policy:'Restricted',policies:{LocalMachine:'Restricted'},helper_exists:true})};}
    assert.ok(args.includes('-File'));assert.equal(args[args.indexOf('-Mode')+1],'Check');assert.ok(args.includes('-RequireProtected'));
    return {status:1,stderr:'PSSecurityException C:\\PRIVATE'};
  }});
  assert.equal(calls,2);assert.equal(r.probe.effective_policy,'Restricted');assert.equal(r.check.valid,false);assert.equal(r.check.helper_started,false);assert.equal(r.valuation_allowed,false);assert.equal(r.identity,null);assert.equal(r.ready_for_physical_pilot,false);assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
});
test('helper check returning missing-path error proves startup, not private storage',()=>{
  const r=callStorage(helper,'C:\\MISSING',{run:()=>({status:1,stdout:'{"valid":false,"error":"windows_private_storage_unverified","stage":"parents","line":63,"category":"ObjectNotFound","exception_type":"ItemNotFoundException"}'})});
  assert.equal(r.valid,false);assert.equal(r.helper_started,true);
});
test('untrusted probe fields are never copied to shareable output',()=>{
  const r=sanitizeProbe({status:0,stdout:JSON.stringify({schema:'numis_windows_diagnostic_v1',effective_policy:'C:\\PRIVATE',powershell_version:'PRIVATE',zone_identifier:'PRIVATE',signature:'PRIVATE',policies:{Process:'PRIVATE'},extra:'PRIVATE'})});assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
  assert.equal(sanitizeProbe({status:1,stdout:'PRIVATE',stderr:'PRIVATE'}).valid,false);
});
test('Linux diagnostic makes no false Windows-access claim or process call',()=>{
  const r=diagnoseWindowsStorage(helper,'unused',{platform:'linux',run:()=>assert.fail('must not start')});assert.equal(r.windows_access,false);assert.equal(r.ready_for_physical_pilot,false);
});
test('diagnostics do not change policy or execute helper as inline code',()=>{
  assert.doesNotMatch(READ_ONLY_PROBE,/Set-ExecutionPolicy|Unblock-File|Set-Acl|Set-Item|Invoke-Expression|ScriptBlock|EncodedCommand/i);
  for(const line of READ_ONLY_PROBE.split('\n').filter(l=>l.includes('Get-Content')))assert.match(line,/-Stream Zone\.Identifier/);
  assert.equal(fs.readFileSync(helper).includes(Buffer.from('Set-ExecutionPolicy')),false);
});
test('actual OS diagnostic and helper Check never create the proposed archive',()=>{
  const target=path.join(os.tmpdir(),'NUMIS-SYNTHETIC-DIAGNOSTIC-'+randomUUID());
  assert.equal(fs.existsSync(target),false);
  const r=diagnoseWindowsStorage(helper,target);
  assert.equal(fs.existsSync(target),false);assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);
  if(process.platform==='win32'){
    assert.equal(r.windows_access,true);assert.equal(r.probe.valid,true);assert.equal(r.probe.helper_exists,true);assert.equal(r.probe.language_mode,'FullLanguage');
    assert.notEqual(r.probe.effective_policy,'unknown');assert.notEqual(r.probe.powershell_version,'unknown');assert.equal(r.check.helper_started,true);assert.equal(r.check.valid,false);
  }else{assert.equal(r.windows_access,false);assert.equal(r.error,'windows_required');}
});
test('standalone CLI reports local OS truth without printing its target path',()=>{
  const target=path.join(os.tmpdir(),'NUMIS-SYNTHETIC-CLI-'+randomUUID());
  const r=spawnSync(process.execPath,[cli,'--vault',target],{encoding:'utf8'}),out=JSON.parse(r.stdout);
  assert.equal(fs.existsSync(target),false);assert.equal(out.operation,'read_only_diagnosis');assert.equal(out.identity,null);assert.equal(out.valuation_allowed,false);assert.equal(out.ready_for_physical_pilot,false);assert.equal(r.stdout.includes(target),false);
  assert.equal(out.diagnostic_complete,process.platform==='win32');assert.equal(r.status,process.platform==='win32'?0:1);
  if(process.platform==='win32')assert.equal(out.check.valid,false);else assert.equal(out.windows_access,false);
});
test('CLI rejects relative target before any helper call',()=>{
  const r=spawnSync(process.execPath,[cli,'--vault','SYNTHETIC-relative'],{encoding:'utf8'}),out=JSON.parse(r.stdout);
  assert.equal(r.status,1);assert.equal(out.error,'vault_absolute_path_required');assert.equal(out.diagnostic_complete,false);assert.equal(out.identity,null);assert.equal(out.valuation_allowed,false);
});
test('CLI rejects unknown arguments without disclosing them',()=>{
  const r=spawnSync(process.execPath,[cli,'--PRIVATE-ARGUMENT'],{encoding:'utf8'}),out=JSON.parse(r.stdout);
  assert.equal(r.status,1);assert.equal(out.diagnostic_complete,false);assert.equal(r.stdout.includes('PRIVATE-ARGUMENT'),false);assert.equal(out.ready_for_physical_pilot,false);
});
test('probe failure stage remains fail closed without raw system details',()=>{
  const r=sanitizeProbe({status:1,stdout:JSON.stringify({schema:'numis_windows_diagnostic_v1',valid:false,stage:'policy',line:7,category:'PermissionDenied',exception_type:'SecurityException',private_path:'PRIVATE'})});
  assert.equal(r.valid,false);assert.equal(r.reason,'policy_line_7_permissiondenied_securityexception');assert.equal(JSON.stringify(r).includes('PRIVATE'),false);
});
