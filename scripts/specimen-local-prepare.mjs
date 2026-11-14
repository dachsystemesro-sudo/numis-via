import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkVault,privateWrite,privateRead} from './intake-storage.mjs';
import {initIntake,prepareCapture,decodePhoto} from './specimen-intake.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const flags={identity:null,valuation_allowed:false,ready_for_physical_pilot:false,verification_state:'needs_reference_review'};
const json=x=>JSON.stringify(x,null,2)+'\n';
// Source files are read only. No chmod, ACL edits, metadata writes or renames.
function readSource(filename){
  if(!path.isAbsolute(filename))throw Error('absolute_photo_path_required');
  let cursor=filename;
  while(true){if(fs.lstatSync(cursor).isSymbolicLink())throw Error('source_link_forbidden');const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;}
  const fd=fs.openSync(filename,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  try{
    const before=fs.fstatSync(fd);
    if(!before.isFile()||before.nlink!==1||before.size===0||before.size>10*1024*1024)throw Error('source_type_or_size_invalid');
    // Bounded read, even if another program grows the source after fstat.
    const buffer=Buffer.alloc(before.size+1);let offset=0,read;
    do{read=fs.readSync(fd,buffer,offset,buffer.length-offset,null);offset+=read;}while(read&&offset<buffer.length);
    const after=fs.fstatSync(fd);
    if(offset!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ctimeMs!==before.ctimeMs)throw Error('source_changed_during_read');
    return {bytes:buffer.subarray(0,offset),stat:before};
  }finally{fs.closeSync(fd);}
}
export async function prepareLocalPhotos(vault,filenames){
  if(!Array.isArray(filenames)||filenames.length!==6||new Set(filenames.map(f=>path.resolve(f))).size!==6)throw Error('select_exactly_six_photos');
  const photos=[],byteHashes=new Set(),pixelHashes=new Set();
  // Decode the entire selected batch before creating or copying anything.
  for(const [index,source] of filenames.entries()){
    const ext=path.extname(source).toLowerCase();
    if(!['.jpg','.jpeg','.png','.webp'].includes(ext))throw Error('photo_format_animation_or_resolution');
    const {bytes,stat}=readSource(source);let decoded;
    try{decoded=await decodePhoto(bytes,'source'+ext);}catch(error){throw Error(/^photo_[a-z_]+$/.test(error.message)?error.message:'photo_decode_failed');}
    if(byteHashes.has(decoded.original_sha256)||pixelHashes.has(decoded.pixel_sha256))throw Error('duplicate_photo_bytes_or_pixels');
    byteHashes.add(decoded.original_sha256);pixelHashes.add(decoded.pixel_sha256);
    const {working,...technical}=decoded;
    photos.push({source,bytes,stat,technical,filename:'PHOTO-'+String(index+1).padStart(3,'0')+ext});
  }
  initIntake(vault);checkVault(vault);
  for(const p of photos){
    privateWrite(vault,'incoming/'+p.filename,p.bytes);
    if(hash(privateRead(vault,'incoming/'+p.filename,10*1024*1024))!==p.technical.original_sha256)throw Error('copied_photo_hash_mismatch');
    const after=readSource(p.source);
    if(hash(after.bytes)!==p.technical.original_sha256||after.stat.mtimeMs!==p.stat.mtimeMs||after.stat.ctimeMs!==p.stat.ctimeMs)throw Error('source_changed_after_copy');
  }
  const report={schema_version:'1.0',operation:'copy_and_draft_only',recorded_at:new Date().toISOString(),photos:photos.map(p=>({filename:p.filename,bytes:p.bytes.length,...p.technical})),
    duplicate_bytes:0,duplicate_pixels:0,source_hashes_after_copy_match:true,source_mtime_ctime_after_copy_match:true,
    source_provenance:'USER_SELECTED_FILES_NOT_AUTHENTICATED_PHONE_ORIGINALS',capture_times_verified:false,coin_identity_verified:false,accepted_intakes:0,...flags};
  privateWrite(vault,'source-map.json',json({private_do_not_share:true,files:photos.map(p=>({source:p.source,copy:'incoming/'+p.filename,sha256:p.technical.original_sha256}))}));
  const draft=prepareCapture(vault);
  privateWrite(vault,'technical-report.json',json(report));
  privateWrite(vault,'DALSIE-KROKY.txt','NUMIS VIA – iba príprava, identita ani ocenenie nie sú potvrdené.\n\nŠesť kópií je v incoming; SHA-256 a technické kontroly sú v technical-report.json. Súkromnú source-map.json nezverejňujte.\n\nV capture-draft.json ostávajú časy snímania null a roly prázdne. Človek musí overiť pôvod, dátumy, rovnaký exemplár, líce/rub, čitateľnosť 2020, značky, symboly a hranu. Čas operácie nie je čas fotografovania.\n\nDossier vyžaduje skutočné práva/súhlasy, merania a nezávislé odborné posudky. Neznáme údaje nevymýšľajte. intakes zostáva prázdny; žiadny finálny import ani modelový request neprebehol.\n\nidentity=null; valuation_allowed=false; ready_for_physical_pilot=false.\n');
  return {created:true,photos:photos.length,duplicates:0,capture_file:draft.capture_file,accepted_intakes:0,...flags};
}
