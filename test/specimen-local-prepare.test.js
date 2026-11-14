import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {prepareLocalPhotos} from '../scripts/specimen-local-prepare.mjs';
import {privateRead,checkVault} from '../scripts/intake-storage.mjs';
function area(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'numis-local-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return p;}
async function images(t){const root=area(t),sources=[];for(let i=0;i<6;i++){const file=path.join(root,'SYNTHETIC-'+i+'.png');fs.writeFileSync(file,await sharp({create:{width:512,height:512,channels:3,background:{r:i*30,g:40,b:20}}}).png().toBuffer());sources.push(file);}return {root,sources,vault:path.join(root,'new-vault')};}
test('six synthetic images copy exactly without changing sources or asserting facts',async t=>{
  const f=await images(t),before=f.sources.map(p=>({bytes:fs.readFileSync(p),stat:fs.statSync(p)}));
  const r=await prepareLocalPhotos(f.vault,f.sources);assert.equal(r.photos,6);assert.equal(r.accepted_intakes,0);assert.equal(r.identity,null);assert.equal(r.valuation_allowed,false);assert.equal(r.ready_for_physical_pilot,false);checkVault(f.vault);
  for(let i=0;i<6;i++){assert.deepEqual(privateRead(f.vault,'incoming/PHOTO-00'+(i+1)+'.png'),before[i].bytes);assert.deepEqual(fs.readFileSync(f.sources[i]),before[i].bytes);assert.equal(fs.statSync(f.sources[i]).mtimeMs,before[i].stat.mtimeMs);assert.equal(fs.statSync(f.sources[i]).ctimeMs,before[i].stat.ctimeMs);}
  const plan=JSON.parse(privateRead(f.vault,'capture-draft.json'));for(const p of plan.images){assert.equal(p.captured_at,null);assert.deepEqual(p.roles,[]);}assert.equal(plan.capture_check.same_specimen_confirmed,null);assert.equal(plan.capture_check.local_processing_authorized,null);
  assert.deepEqual(fs.readdirSync(path.join(f.vault,'intakes')),[]);assert.equal(JSON.parse(privateRead(f.vault,'dossier.json')).final_decision.status,'pending');
});
test('duplicate pixels reject entire batch before vault creation',async t=>{
  const f=await images(t);fs.writeFileSync(f.sources[5],await sharp(f.sources[0]).png({compressionLevel:0}).toBuffer());await assert.rejects(prepareLocalPhotos(f.vault,f.sources),/duplicate/);assert.equal(fs.existsSync(f.vault),false);
});
test('corrupt sixth photo creates no partial archive',async t=>{
  const f=await images(t);fs.writeFileSync(f.sources[5],'SYNTHETIC BROKEN');await assert.rejects(prepareLocalPhotos(f.vault,f.sources));assert.equal(fs.existsSync(f.vault),false);
});
test('wrong count and repeated selection create no vault',async t=>{
  const f=await images(t);await assert.rejects(prepareLocalPhotos(f.vault,f.sources.slice(0,5)),/six/);await assert.rejects(prepareLocalPhotos(f.vault,[...f.sources.slice(0,5),f.sources[0]]),/six/);assert.equal(fs.existsSync(f.vault),false);
});
test('existing destination and files remain untouched',async t=>{
  const f=await images(t);fs.mkdirSync(f.vault);const mode=fs.statSync(f.vault).mode;fs.writeFileSync(path.join(f.vault,'keep'),'SYNTHETIC KEEP');await assert.rejects(prepareLocalPhotos(f.vault,f.sources),/new_empty/);assert.equal(fs.statSync(f.vault).mode,mode);assert.equal(fs.readFileSync(path.join(f.vault,'keep'),'utf8'),'SYNTHETIC KEEP');
});
test('linked sources cannot be imported as originals',async t=>{
  const f=await images(t);const link=path.join(f.root,'link.png');fs.linkSync(f.sources[0],link);f.sources[0]=link;await assert.rejects(prepareLocalPhotos(f.vault,f.sources),/source_type/);assert.equal(fs.existsSync(f.vault),false);
});
