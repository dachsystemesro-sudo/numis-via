import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const REPO=fileURLToPath(new URL('../',import.meta.url));
export const sha256=b=>createHash('sha256').update(b).digest('hex');
export function noLinks(target){
 let p=path.resolve(target);
 while(true){if(fs.existsSync(p)){const s=fs.lstatSync(p);if(s.isSymbolicLink()||s.isFile()&&s.nlink!==1)throw Error('storage_link_forbidden');}const next=path.dirname(p);if(next===p)break;p=next;}
}
export function buildNative(){
 if(process.platform!=='win32')throw Error('windows_required');
 const source=path.join(REPO,'native/CollectionStorage.cs'),sourceHash=sha256(fs.readFileSync(source));
 const dir=path.join(REPO,'.local-runtime');noLinks(dir);if(!fs.existsSync(dir))fs.mkdirSync(dir);
 const exe=path.join(dir,'collection-'+sourceHash.slice(0,16)+'.exe'),manifest=exe+'.json';
 if(fs.existsSync(exe)||fs.existsSync(manifest)){
  noLinks(exe);noLinks(manifest);const m=JSON.parse(fs.readFileSync(manifest));
  if(m.source_sha256!==sourceHash||sha256(fs.readFileSync(exe))!==m.executable_sha256)throw Error('native_integrity_failed');return exe;
 }
 const system=process.env.SystemRoot;if(!system||!path.win32.isAbsolute(system))throw Error('system_root_required');
 const compiler=path.join(system,'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
 const temp=path.join(dir,'build-'+randomUUID()+'.exe');
 const r=spawnSync(compiler,['/nologo','/target:exe','/platform:x64','/optimize+','/r:System.Windows.Forms.dll','/r:System.Web.Extensions.dll','/out:'+temp,source],{encoding:'utf8',windowsHide:true,timeout:30000});
 if(r.error||r.status!==0)throw Error('native_build_failed');
 fs.copyFileSync(temp,exe,fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(manifest,JSON.stringify({source_sha256:sourceHash,executable_sha256:sha256(fs.readFileSync(exe)),authenticode_signed:false},null,2)+'\n',{flag:'wx'});
 return exe;
}
export function native(mode,target,{input,dialog=false}={}){
 const exe=buildNative();
 const r=spawnSync(exe,[mode,...(target?[target]:[])],{encoding:'utf8',input,windowsHide:!dialog,timeout:dialog?undefined:30000,maxBuffer:256*1024});
 let result;try{result=JSON.parse(r.stdout);}catch{}
 if(r.error||r.status!==0||!result||!dialog&&result.valid!==true)throw Error(/^[a-z_]+$/.test(result?.error)?result.error:'native_storage_failed');return result;
}
export function checkPrivate(target,{root=false}={}){
 noLinks(target);const stat=fs.lstatSync(target);if(!stat.isDirectory()&&!stat.isFile())throw Error('storage_type_invalid');
 if(process.platform==='win32'){
  const exe=buildNative(),r=spawnSync(exe,['check',path.resolve(target),...(root?['protected']:[])],{encoding:'utf8',windowsHide:true,timeout:30000});
  if(r.error||r.status!==0||JSON.parse(r.stdout).valid!==true)throw Error('private_ntfs_required');
 }else if(stat.uid!==process.getuid()||(stat.mode&0o077)!==0)throw Error('private_storage_required');
 return true;
}
export function outsideCode(target){
 const full=path.resolve(target);noLinks(full);let parent=full;const suffix=[];
 while(!fs.existsSync(parent)){suffix.unshift(path.basename(parent));const next=path.dirname(parent);if(next===parent)throw Error('parent_required');parent=next;}
 const canonical=path.join(fs.realpathSync.native(parent),...suffix),relative=path.relative(fs.realpathSync.native(REPO),canonical);
 if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('collection_must_be_outside_repository');
 return full;
}
export function createRoot(value){const full=outsideCode(value);if(fs.existsSync(full))throw Error('new_collection_required');if(!fs.statSync(path.dirname(full)).isDirectory())throw Error('parent_required');
 if(process.platform==='win32')native('create-root',full);else fs.mkdirSync(full,{mode:0o700});checkPrivate(full,{root:true});return full;
}
export function inside(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\')||relative.includes(':')||relative.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('unsafe_collection_path');
 return path.join(root,...relative.split('/'));
}
export function readPrivate(root,relative,max=2*1024*1024){
 checkPrivate(root,{root:true});const target=inside(root,relative);let cursor=target;
 while(cursor!==root){checkPrivate(cursor);cursor=path.dirname(cursor);}
 const s=fs.statSync(target);if(!s.isFile()||s.size<1||s.size>max)throw Error('private_file_size');return fs.readFileSync(target);
}
export function writeNew(root,relative,bytes){
 checkPrivate(root,{root:true});const target=inside(root,relative);checkPrivate(path.dirname(target));const b=Buffer.from(bytes);
 if(fs.existsSync(target))throw Error('exclusive_write_required');
 if(process.platform==='win32')native('write-new',target,{input:b.toString('base64')});else fs.writeFileSync(target,b,{flag:'wx',mode:0o600});
 checkPrivate(target);if(sha256(fs.readFileSync(target))!==sha256(b))throw Error('new_file_hash_mismatch');return target;
}
export function mkdirNew(root,relative){checkPrivate(root,{root:true});const p=inside(root,relative);checkPrivate(path.dirname(p));if(fs.existsSync(p))throw Error('exclusive_directory_required');if(process.platform==='win32')native('create-dir',p);else fs.mkdirSync(p,{mode:0o700});checkPrivate(p,{root:true});return p;}
export function checkSource(file){
 if(!path.isAbsolute(file))throw Error('absolute_source_required');noLinks(file);
 if(process.platform==='win32')native('check-source',file);
 const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
 try{
  const before=fs.fstatSync(fd);if(!before.isFile()||before.nlink!==1||before.size<1||before.size>10*1024*1024)throw Error('source_size_or_type_invalid');
  const bytes=Buffer.alloc(before.size+1);let used=0,n;do{n=fs.readSync(fd,bytes,used,bytes.length-used,null);used+=n;}while(n&&used<bytes.length);
  const after=fs.fstatSync(fd);if(used!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs)throw Error('source_changed_during_read');
  return {bytes:bytes.subarray(0,used),mtime:before.mtimeMs,ctime:before.ctimeMs};
 }finally{fs.closeSync(fd);}
}
