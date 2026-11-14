import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {diagnoseWindowsStorage,windowsPowerShell,processOptions} from './windows-intake-diagnostics.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const normalizedHash=b=>hash(Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n')));
const flags={identity:null,valuation_allowed:false,ready_for_physical_pilot:false};
// Pin every unchanged project file imported by the preparation path. A local
// modification must not silently replace the fail-closed runtime after diagnosis.
export const RUNTIME_FILES=['package.json','package-lock.json','scripts/private-intake-storage.ps1','scripts/specimen-intake.mjs','scripts/pilot-contract.mjs','api/pilot-reference.js','api/catalogue.js','data/pilot/sources.json','data/catalogue.json','data/euro-denominations.json'];
const folderDialog=String.raw`
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
$dialog=New-Object Windows.Forms.FolderBrowserDialog
$dialog.Description='Vyberte existujuci projekt NUMIS VIA (obsahuje package.json a scripts)'
if ($dialog.ShowDialog() -ne [Windows.Forms.DialogResult]::OK) { exit 2 }
ConvertTo-Json -Compress -InputObject $dialog.SelectedPath
`;
const photoDialog=String.raw`
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
$dialog=New-Object Windows.Forms.OpenFileDialog
$dialog.Title='Vyberte presne 6 fotografii tej istej mince; originaly sa nemenia'
$dialog.InitialDirectory=[Environment]::GetFolderPath('MyPictures')
$dialog.Filter='Fotografie JPEG, PNG, WebP|*.jpg;*.jpeg;*.png;*.webp'
$dialog.Multiselect=$true
if ($dialog.ShowDialog() -ne [Windows.Forms.DialogResult]::OK) { exit 2 }
ConvertTo-Json -Compress -InputObject @($dialog.FileNames)
`;
export const SOURCE_CHECK=String.raw`
$ErrorActionPreference='Stop'
try {
  $files=ConvertFrom-Json -InputObject $env:NUMIS_SELECTED_PHOTOS
  if (@($files).Count -ne 6) { throw 'six_required' }
  foreach ($file in $files) {
    $full=[IO.Path]::GetFullPath($file)
    if ($full -notmatch '^[A-Za-z]:\\' -or $full.Substring(2).Contains(':')) { throw 'local_file_required' }
    $drive=New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($full))
    if ($drive.DriveType -ne 'Fixed' -or $drive.DriveFormat -ne 'NTFS') { throw 'local_ntfs_required' }
    $cursor=$full
    while ($cursor) {
      $item=Get-Item -LiteralPath $cursor -Force
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or ($item.Attributes -band [IO.FileAttributes]::Offline)) { throw 'local_plain_file_required' }
      $parent=[IO.Path]::GetDirectoryName($cursor.TrimEnd([char]92))
      if ($parent -eq $cursor) { break }; $cursor=$parent
    }
  }
  @{valid=$true} | ConvertTo-Json -Compress
} catch { @{valid=$false} | ConvertTo-Json -Compress; exit 1 }
`;
function commandJSON(command,{env=process.env,dialog=false}={}){
  const r=spawnSync(windowsPowerShell(),['-NoProfile','-NonInteractive',...(dialog?['-STA']:[]),'-Command',command],{...processOptions,timeout:dialog?undefined:30000,env});
  if(r.error||r.status!==0)throw Error(dialog?'selection_cancelled_or_dialog_unavailable':'source_local_file_check_failed');
  try{return JSON.parse(r.stdout.replace(/^\uFEFF/,''));}catch{throw Error('powershell_selection_report_invalid');}
}
function inside(root,relative,{runtime=false}={}){
  if(typeof relative!=='string'||(runtime?!RUNTIME_FILES.includes(relative):!/^(scripts|test|docs)\/[A-Za-z0-9_.-]+$/.test(relative)))throw Error('fix_manifest_path_invalid');
  let cursor=path.join(root,relative);
  while(cursor!==path.dirname(root)){
    if(fs.existsSync(cursor)){
      const s=fs.lstatSync(cursor);
      if(s.isSymbolicLink()||(s.isFile()&&s.nlink!==1))throw Error('code_link_forbidden');
    }
    if(cursor===root)break;cursor=path.dirname(cursor);
  }
  return path.join(root,relative);
}
function bundleOutsideProject(project,bundle){
  const relative=path.relative(fs.realpathSync.native(project),fs.realpathSync.native(bundle));
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('bundle_must_be_outside_project');
}
export function installLocalFix(project,bundle){
  bundleOutsideProject(project,bundle);
  const manifest=JSON.parse(fs.readFileSync(path.join(bundle,'fix-manifest.json'),'utf8'));
  if(manifest.base_commit!=='86bc8cc3b6a4217e56783b6bc3585e1729ba3d90'||!Array.isArray(manifest.files))throw Error('fix_manifest_invalid');
  if(!Array.isArray(manifest.runtime)||manifest.runtime.length!==RUNTIME_FILES.length||new Set(manifest.runtime.map(f=>f.path)).size!==RUNTIME_FILES.length)throw Error('fix_runtime_manifest_invalid');
  for(const entry of manifest.runtime){
    const filename=inside(project,entry.path,{runtime:true});
    if(!fs.existsSync(filename)||normalizedHash(fs.readFileSync(filename))!==entry.base_normalized_sha256)throw Error('project_runtime_differs_no_files_changed');
  }
  const changes=[];
  for(const entry of manifest.files){
    const target=inside(project,entry.path),source=inside(bundle,entry.path),bytes=fs.readFileSync(source);
    if(hash(bytes)!==entry.sha256)throw Error('fix_bundle_integrity_failed');
    if(fs.existsSync(target)){
      const before=fs.readFileSync(target),digest=normalizedHash(before);
      if(digest===entry.normalized_sha256)continue;
      if(!entry.base_normalized_sha256||digest!==entry.base_normalized_sha256)throw Error('project_version_differs_no_files_changed');
      changes.push({target,bytes,before,name:entry.path.replaceAll('/','__')});
    }else{
      if(entry.base_normalized_sha256)throw Error('project_incomplete_no_files_changed');
      changes.push({target,bytes,name:entry.path.replaceAll('/','__')});
    }
  }
  // Validate all files first. Back up code only; never copy photographs here.
  const backup=changes.some(c=>c.before)?path.join(bundle,'code-backup-'+randomUUID()):null;
  if(backup)fs.mkdirSync(backup);
  for(const c of changes)if(c.before)fs.writeFileSync(path.join(backup,c.name),c.before,{flag:'wx'});
  for(const c of changes){
    if(c.before){if(!fs.readFileSync(c.target).equals(c.before))throw Error('code_changed_during_fix');fs.writeFileSync(c.target,c.bytes);}
    else fs.writeFileSync(c.target,c.bytes,{flag:'wx'});
  }
  return {changed_files:changes.length,code_backup_created:!!backup};
}
export async function runLocalAssistant(args,{bundle}={}){
  const {values}=parseArgs({args,options:{project:{type:'string'},prepare:{type:'boolean',default:false}}});
  if(process.platform!=='win32'){console.log(JSON.stringify({error:'windows_required',windows_access:false,...flags}));return 1;}
  const project=path.resolve(values.project??commandJSON(folderDialog,{dialog:true}));
  bundleOutsideProject(project,bundle);
  const helper=inside(project,'scripts/private-intake-storage.ps1');
  const local=process.env.LOCALAPPDATA;
  if(!local||!fs.statSync(local).isDirectory())throw Error('localappdata_parent_required');
  const vault=path.join(local,'NUMIS-VIA-1c2020-'+randomUUID());
  // Never run a changed or unrecognized helper from an unrelated checkout.
  const manifest=JSON.parse(fs.readFileSync(path.join(bundle,'fix-manifest.json'),'utf8'));
  if(!fs.existsSync(helper))throw Error('windows_private_storage_unverified:helper_missing');
  if(normalizedHash(fs.readFileSync(helper))!==manifest.helper_normalized_sha256)throw Error('helper_version_differs_review_required');
  const diagnostic=diagnoseWindowsStorage(helper,vault);
  console.log(JSON.stringify({operation:'read_only_diagnosis',...diagnostic},null,2));
  if(!values.prepare)return 0;
  // A missing target is expected. A structured failure proves the script ran;
  // only the subsequent Create + real ACL checks authorize private storage.
  if(!diagnostic.probe.valid||diagnostic.probe.language_mode!=='FullLanguage'||!diagnostic.probe.helper_exists||!diagnostic.check.helper_started)throw Error('diagnostic_blocked_no_settings_changed');
  if(fs.existsSync(vault))throw Error('new_empty_vault_required');
  const files=commandJSON(photoDialog,{dialog:true});
  if(!Array.isArray(files)||files.length!==6)throw Error('select_exactly_six_photos');
  if(commandJSON(SOURCE_CHECK,{env:{...process.env,NUMIS_SELECTED_PHOTOS:JSON.stringify(files)}})?.valid!==true)throw Error('source_local_file_check_failed');
  const fix=installLocalFix(project,bundle);
  const {prepareLocalPhotos}=await import(pathToFileURL(path.join(project,'scripts/specimen-local-prepare.mjs')).href);
  const prepared=await prepareLocalPhotos(vault,files);
  console.log(JSON.stringify({operation:'private_copy_and_draft',...fix,...prepared},null,2));
  // This path is displayed only locally. Do not share source-map.json or photos.
  console.log('SUKROMNY ARCHIV (nezverejnovat): '+vault);
  return 0;
}
export function safeLocalError(error){return {valid:false,error:/^[a-z_0-9]+(?::[a-z_0-9]+)?$/.test(error?.message)?error.message:'local_operation_failed',partial_files_may_remain:true,automatic_cleanup:false,...flags};}
