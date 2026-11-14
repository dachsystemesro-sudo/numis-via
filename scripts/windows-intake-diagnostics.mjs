import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Use Windows PowerShell 5.1, not an executable in the project/current folder.
// Sysnative allows a 32-bit Node process to reach 64-bit Windows PowerShell.
export function windowsPowerShell({env=process.env,arch=process.arch}={}){
  if(!env.SystemRoot){if(process.platform==='win32')throw Error('windows_private_storage_unverified:system_root_missing');return 'powershell.exe';}
  if(!/^[A-Za-z]:\\[^\r\n]*$/.test(env.SystemRoot))throw Error('windows_private_storage_unverified:system_root_invalid');
  return path.win32.join(env.SystemRoot,arch==='ia32'&&env.PROCESSOR_ARCHITEW6432?'Sysnative':'System32','WindowsPowerShell','v1.0','powershell.exe');
}
const parse=stdout=>{try{return JSON.parse(String(stdout??'').replace(/^\uFEFF/,''));}catch{return null;}};
const stages=['path','drive','parents','create','acl','owner','rules','new_owner'];
const word=s=>typeof s==='string'&&/^[A-Za-z]{1,80}$/.test(s)?s.toLowerCase():'unknown';
// Never include raw stderr/stdout, OS messages, paths, SIDs or user names.
export function storageResult(result){
  if(result?.error){
    const codes={ENOENT:'powershell_not_found',EACCES:'powershell_access_denied',EPERM:'powershell_access_denied',ETIMEDOUT:'powershell_timeout',ENOBUFS:'powershell_output_limit'};
    return {valid:false,reason:codes[result.error.code]??'powershell_spawn_failed',helper_started:false};
  }
  if(result?.signal)return {valid:false,reason:'powershell_interrupted',helper_started:false};
  const report=parse(result?.stdout);
  if(report?.valid===true&&report.platform==='windows_ntfs_acl'&&result.status===0)return {valid:true,helper_started:true};
  if(report?.valid===false&&report.error==='windows_private_storage_unverified'&&stages.includes(report.stage)){
    const line=Number.isSafeInteger(report.line)&&report.line>=0?report.line:0;
    return {valid:false,reason:report.stage+'_line_'+line+'_'+word(report.category)+'_'+word(report.exception_type),helper_started:true};
  }
  // These stable PowerShell type/error identifiers also occur in localized errors.
  if(/PSSecurityException|UnauthorizedAccess|ScriptNotSigned/i.test(String(result?.stderr??'')))return {valid:false,reason:'powershell_script_security_block',helper_started:false};
  if(result?.status!==0)return {valid:false,reason:'powershell_exit_without_valid_report',helper_started:false};
  return {valid:false,reason:report?'powershell_report_invalid':String(result?.stdout??'').trim()?'powershell_json_invalid':'powershell_output_empty',helper_started:false};
}
export const processOptions={encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:256*1024};
export function callStorage(helper,target,{mode='Check',protectedRoot=false,run=spawnSync,program=windowsPowerShell()}={}){
  if(!fs.existsSync(helper)||!fs.statSync(helper).isFile())return {valid:false,reason:'helper_missing',helper_started:false};
  return storageResult(run(program,['-NoProfile','-NonInteractive','-File',helper,'-Mode',mode,'-TargetPath',target,...(protectedRoot?['-RequireProtected']:[])],processOptions));
}

// Read-only commands. They do not evaluate, dot-source or load the helper body.
// The helper is separately tested with -File -Mode Check, respecting its policy.
export const READ_ONLY_PROBE=String.raw`
$ErrorActionPreference = 'Stop'
$stage = 'policy'
try {
$helper = $env:NUMIS_DIAGNOSTIC_HELPER
$policies = @{}
Get-ExecutionPolicy -List | ForEach-Object { $policies[$_.Scope.ToString()] = $_.ExecutionPolicy.ToString() }
$exists = Test-Path -LiteralPath $helper -PathType Leaf
$stage = 'metadata'
$zone = 'absent'
$signature = 'unknown'
if ($exists) {
  try {
    $stream = Get-Item -LiteralPath $helper -Stream Zone.Identifier -ErrorAction SilentlyContinue
    if ($stream) {
      $zone = 'present'
      $content = Get-Content -LiteralPath $helper -Stream Zone.Identifier -ErrorAction Stop
      foreach ($line in $content) { if ($line -match '^ZoneId=([0-4])$') { $zone = 'zone_' + $Matches[1] } }
    }
  } catch { $zone = 'unknown' }
  try { $signature = (Get-AuthenticodeSignature -LiteralPath $helper -ErrorAction Stop).Status.ToString() } catch { $signature = 'unknown' }
}
$stage = 'report'
@{schema='numis_windows_diagnostic_v1';valid=$true;effective_policy=(Get-ExecutionPolicy).ToString();policies=$policies;language_mode=$ExecutionContext.SessionState.LanguageMode.ToString();powershell_version=$PSVersionTable.PSVersion.ToString();helper_exists=$exists;zone_identifier=$zone;signature=$signature} | ConvertTo-Json -Compress
} catch {
  @{schema='numis_windows_diagnostic_v1';valid=$false;stage=$stage;line=[int]$_.InvocationInfo.ScriptLineNumber;category=$_.CategoryInfo.Category.ToString();exception_type=$_.Exception.GetType().Name} | ConvertTo-Json -Compress
  exit 1
}
`;
const policyValues=['Undefined','Restricted','AllSigned','RemoteSigned','Unrestricted','Bypass','Default'];
export function sanitizeProbe(result){
  const p=parse(result?.stdout);
  if(p?.schema==='numis_windows_diagnostic_v1'&&p.valid===false){
    const stage=['policy','metadata','report'].includes(p.stage)?p.stage:'unknown',line=Number.isSafeInteger(p.line)&&p.line>=0?p.line:0;
    return {valid:false,error:'read_only_probe_unavailable',reason:stage+'_line_'+line+'_'+word(p.category)+'_'+word(p.exception_type)};
  }
  if(result?.error||result?.signal||result?.status!==0||p?.schema!=='numis_windows_diagnostic_v1')return {valid:false,error:'read_only_probe_unavailable',reason:storageResult(result).reason??'powershell_report_invalid'};
  const policies=Object.fromEntries(['MachinePolicy','UserPolicy','Process','CurrentUser','LocalMachine'].map(k=>[k,policyValues.includes(p.policies?.[k])?p.policies[k]:'unknown']));
  return {valid:true,effective_policy:policyValues.includes(p.effective_policy)?p.effective_policy:'unknown',policies,
    language_mode:['FullLanguage','RestrictedLanguage','ConstrainedLanguage','NoLanguage'].includes(p.language_mode)?p.language_mode:'unknown',
    powershell_version:/^\d+\.\d+(?:\.\d+){0,2}$/.test(p.powershell_version)?p.powershell_version:'unknown',helper_exists:p.helper_exists===true,
    zone_identifier:['absent','present','unknown','zone_0','zone_1','zone_2','zone_3','zone_4'].includes(p.zone_identifier)?p.zone_identifier:'unknown',
    signature:['Valid','UnknownError','NotSigned','HashMismatch','NotTrusted','NotSupportedFileFormat','Incompatible','unknown'].includes(p.signature)?p.signature:'unknown'};
}
export function diagnoseWindowsStorage(helper,target,{platform=process.platform,run=spawnSync,program=windowsPowerShell()}={}){
  if(platform!=='win32')return {platform,windows_access:false,error:'windows_required',identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
  const probe=sanitizeProbe(run(program,['-NoProfile','-NonInteractive','-Command',READ_ONLY_PROBE],{...processOptions,env:{...process.env,NUMIS_DIAGNOSTIC_HELPER:helper}}));
  const check=callStorage(helper,target,{run,program,protectedRoot:true});
  return {platform,windows_access:true,probe,check,identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
}
