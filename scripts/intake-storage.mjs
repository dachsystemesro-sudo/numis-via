import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const REPO=fileURLToPath(new URL('../',import.meta.url));
const helper=fileURLToPath(new URL('./private-intake-storage.ps1',import.meta.url));
export function outsideRepository(value){
  const target=path.resolve(value),relative=path.relative(REPO,target);
  if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('vault_must_be_outside_repository');
  // Also resolve existing parents (Windows short names, aliases and junctions)
  // before deciding that a not-yet-created archive is outside the checkout.
  let parent=target;const suffix=[];
  while(!fs.existsSync(parent)){suffix.unshift(path.basename(parent));const next=path.dirname(parent);if(next===parent)throw Error('parent_required');parent=next;}
  const canonical=path.join(fs.realpathSync.native(parent),...suffix),canonicalRelative=path.relative(fs.realpathSync.native(REPO),canonical);
  if(canonicalRelative===''||(!canonicalRelative.startsWith('..'+path.sep)&&canonicalRelative!=='..'&&!path.isAbsolute(canonicalRelative)))throw Error('vault_must_be_outside_repository');
  return target;
}
export function windowsStorage(target,{create=false,claimNew=false,protectedRoot=false,run=spawnSync}={}){
  const args=['-NoProfile','-NonInteractive','-File',helper,'-Mode',create?'Create':claimNew?'ClaimNew':'Check','-TargetPath',target,...(protectedRoot?['-RequireProtected']:[])];
  const r=run('powershell.exe',args,{encoding:'utf8',timeout:30000,windowsHide:true});
  let report;try{report=JSON.parse(r.stdout.replace(/^\uFEFF/,''));}catch{}
  if(r.status!==0||report?.valid!==true){
    const stage=['path','drive','parents','create','acl','owner','rules','new_owner'].includes(report?.stage)?report.stage:'probe';
    const line=Number.isInteger(report?.line)?report.line:0;
    const category=typeof report?.category==='string'&&/^[A-Za-z]+$/.test(report.category)?report.category.toLowerCase():'unknown';
    const kind=typeof report?.exception_type==='string'&&/^[A-Za-z]+$/.test(report.exception_type)?report.exception_type.toLowerCase():'unknown';
    throw Error('windows_private_storage_unverified:'+stage+'_line_'+line+'_'+category+'_'+kind);
  }
}
function noLinks(target){
  let cursor=path.resolve(target);
  while(true){if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw Error('unsafe_storage_link');const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;}
}
export function checkStorage(target,{root=false}={}){
  noLinks(target);
  const stat=fs.lstatSync(target);
  if(!stat.isFile()&&!stat.isDirectory())throw Error('unsafe_storage_type');
  if(stat.isFile()&&stat.nlink!==1)throw Error('unsafe_storage_link');
  if(process.platform==='win32')windowsStorage(path.resolve(target),{protectedRoot:root});
  else if((stat.mode&0o077)!==0||stat.uid!==process.getuid()||(stat.isFile()&&stat.nlink!==1))throw Error('private_storage_required');
  return true;
}
export function createVault(value){
  const target=outsideRepository(value);noLinks(target);
  if(fs.existsSync(target))throw Error('new_empty_vault_required');
  if(process.platform==='win32')windowsStorage(target,{create:true});
  else fs.mkdirSync(target,{mode:0o700});
  checkStorage(target,{root:true});return target;
}
export function checkVault(value){
  const target=outsideRepository(value);checkStorage(target,{root:true});
  if(!fs.statSync(target).isDirectory())throw Error('vault_directory_required');return target;
}
export function privateRead(root,relative,max=2*1024*1024){
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes(':')||relative.split('/').some(p=>p==='..'||p==='')||path.isAbsolute(relative))throw Error('unsafe_private_path');
  const target=path.join(root,relative);checkStorage(target);
  let parent=path.dirname(target);while(parent!==root){checkStorage(parent);const next=path.dirname(parent);if(next===parent)throw Error('unsafe_private_path');parent=next;}
  const stat=fs.statSync(target);if(!stat.isFile()||stat.size>max||stat.size===0)throw Error('private_file_size');
  return fs.readFileSync(target);
}
export function privateWrite(root,relative,content){
  const target=path.join(root,relative);checkStorage(path.dirname(target));
  fs.writeFileSync(target,content,{flag:'wx',mode:0o600});
  if(process.platform==='win32')windowsStorage(target,{claimNew:true});
  checkStorage(target);
}
export function privateDir(root,name){const target=path.join(root,name);fs.mkdirSync(target,{mode:0o700});if(process.platform==='win32')windowsStorage(target,{claimNew:true});checkStorage(target);return target;}
