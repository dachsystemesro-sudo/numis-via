import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {syntheticFixture,sealFixture,syntheticRun} from '../fixtures/pilot-synthetic.mjs';
import {sha256} from '../scripts/pilot-contract.mjs';
import {inspectAssets,preflightFromFiles} from '../scripts/pilot-preflight.mjs';
import {collectPilot,casePayload} from '../scripts/run-pilot.mjs';
import {evaluatePilot} from '../scripts/pilot-benchmark.mjs';

let root,base;
const files=()=>Object.fromEntries(['manifest','labels','config','separation','runtime'].map(k=>[k,path.join(root,k+'.json')]));
const writeBundle=f=>{sealFixture(f);for(const [k,p] of Object.entries(files()))fs.writeFileSync(p,f.raw[k],{mode:0o600});};
const fixture=()=>structuredClone(base);
const restoreFile=(t,file)=>{const original=fs.readFileSync(file);t.after(()=>{if(fs.existsSync(file))fs.unlinkSync(file);fs.writeFileSync(file,original,{mode:0o600});});};
const args=opts=>Object.entries(opts).flatMap(([k,v])=>['--'+k,v]);
const cli=(script,opts)=>spawnSync(process.execPath,[script,...args(opts)],{cwd:path.resolve('.'),encoding:'utf8',timeout:15000});
before(async()=>{
  root=fs.mkdtempSync(path.join(os.tmpdir(),'numis-synthetic-private-'));fs.mkdirSync(path.join(root,'images'),{mode:0o700});
  base=syntheticFixture();let i=0;
  for(const sample of base.input.manifest.cases)for(const image of sample.images){
    const pixels=Buffer.alloc(16*16*4);for(let p=0;p<pixels.length;p+=4){pixels[p]=i%256;pixels[p+1]=Math.floor(i/256);pixels[p+2]=17;pixels[p+3]=255;}
    const bytes=await sharp(pixels,{raw:{width:16,height:16,channels:4}}).png().toBuffer();
    image.sha256=sha256(bytes);image.pixel_sha256=sha256(Buffer.concat([Buffer.from('16x16:rgba\0'),pixels]));
    fs.writeFileSync(path.join(root,image.path),bytes,{mode:0o600});i++;
  }
  writeBundle(base);
});
after(()=>fs.rmSync(root,{recursive:true,force:true}));

test('full decode of abstract synthetic pixels validates files without measuring photo accuracy',async()=>{
  const f=fixture();writeBundle(f);const p=await preflightFromFiles(files());
  assert.equal(p.report.valid,true,JSON.stringify(p.report.errors));assert.equal(p.report.assets_checked,true);assert.equal(p.report.ready_for_execution,false);assert.equal(p.report.measurement_status,'NOT_MEASURED');
});
test('truncated PNG with a matching declared file hash still fails actual decoding',async t=>{
  const f=fixture(),image=f.input.manifest.cases[0].images[0],file=path.join(root,image.path);restoreFile(t,file);
  const bytes=fs.readFileSync(file).subarray(0,40);fs.writeFileSync(file,bytes);image.sha256=sha256(bytes);
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('asset_missing_corrupt_or_unsafe'));
});
test('MIME declarations cannot disguise another actual image format',async()=>{
  const f=fixture();f.input.manifest.cases[0].images[0].mime='image/jpeg';
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('asset_mime_or_animation_invalid'));
});
test('different PNG encodings of the same pixels cannot masquerade as front and back',async t=>{
  const f=fixture(),first=f.input.manifest.cases[0].images[0],second=f.input.manifest.cases[0].images[1],file=path.join(root,second.path);restoreFile(t,file);
  const bytes=await sharp(fs.readFileSync(path.join(root,first.path))).png({compressionLevel:0}).toBuffer();
  assert.notEqual(sha256(bytes),first.sha256);fs.writeFileSync(file,bytes);second.sha256=sha256(bytes);
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('asset_pixels_mismatch_or_duplicate'));
});
test('embedded EXIF is rejected even when the image decodes',async t=>{
  const f=fixture(),image=f.input.manifest.cases[0].images[0],file=path.join(root,image.path);restoreFile(t,file);
  const bytes=await sharp(fs.readFileSync(file)).withExif({IFD0:{Artist:'SYNTHETIC PRIVATE UNIT TEST'}}).png().toBuffer();fs.writeFileSync(file,bytes);image.sha256=sha256(bytes);
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('embedded_private_metadata'));
});
test('symlink cannot escape private dataset storage',async t=>{
  const f=fixture(),image=f.input.manifest.cases[0].images[0],file=path.join(root,image.path);restoreFile(t,file);
  const outside=path.join(path.dirname(root),path.basename(root)+'-outside.png');fs.copyFileSync(file,outside);t.after(()=>fs.rmSync(outside,{force:true}));fs.unlinkSync(file);fs.symlinkSync(outside,file);
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('asset_missing_corrupt_or_unsafe'));
});
test('oversized asset is rejected before decoding',async t=>{
  const f=fixture(),file=path.join(root,f.input.manifest.cases[0].images[0].path);restoreFile(t,file);fs.writeFileSync(file,Buffer.alloc(10*1024*1024+1));
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('asset_missing_corrupt_or_unsafe'));
});
test('encoded API request size is checked before inference',async t=>{
  const f=fixture(),image=f.input.manifest.cases[0].images[0],file=path.join(root,image.path);restoreFile(t,file);
  const pixels=Buffer.alloc(1024*1024*4,100);for(let p=3;p<pixels.length;p+=4)pixels[p]=255;
  const bytes=await sharp(pixels,{raw:{width:1024,height:1024,channels:4}}).png({compressionLevel:0}).toBuffer();fs.writeFileSync(file,bytes);image.sha256=sha256(bytes);image.pixel_sha256=sha256(Buffer.concat([Buffer.from('1024x1024:rgba\0'),pixels]));
  const r=await inspectAssets(f.input.manifest,root);assert.equal(r.valid,false);assert.ok(r.errors.includes('request_payload_too_large'));
});
test('private file permissions are required for labels and assets',async t=>{
  writeBundle(fixture());const labelFile=files().labels;fs.chmodSync(labelFile,0o644);t.after(()=>fs.chmodSync(labelFile,0o600));
  const r=await preflightFromFiles(files());assert.equal(r.report.valid,false);assert.ok(r.report.errors.includes('labels_private_file_required'));
});
test('a corrupt LAST image prevents every network request',async t=>{
  const f=fixture(),file=path.join(root,f.input.manifest.cases.at(-1).images[0].path);restoreFile(t,file);fs.writeFileSync(file,'SYNTHETIC corrupt bytes');writeBundle(f);
  const p=await preflightFromFiles(files());let sends=0,saves=0;
  await assert.rejects(()=>collectPilot(p,async()=>{sends++;},()=>{saves++;}));assert.equal(sends,0);assert.equal(saves,0);
});
test('asset changed after preflight is not sent',async t=>{
  const f=fixture();writeBundle(f);const p=await preflightFromFiles(files());assert.equal(p.report.valid,true);
  const file=path.join(root,f.input.manifest.cases[0].images[0].path);restoreFile(t,file);fs.writeFileSync(file,'CHANGED SYNTHETIC PIXELS');let sends=0;
  const run=await collectPilot(p,async()=>{sends++;},()=>{});assert.equal(sends,0);assert.equal(evaluatePilot(p.input,run,p.report).accepted,false);
});
test('rights are checked again immediately before payload construction',()=>{
  const f=fixture(),sample=f.input.manifest.cases[0];sample.rights.retention_until='2000-01-01T00:00:00Z';
  assert.throws(()=>casePayload(sample,root),/rights_expired/);
});
test('collector sends only images and measurements; synthetic transport never produces real acceptance',async()=>{
  const f=fixture();writeBundle(f);const p=await preflightFromFiles(files()),expected=syntheticRun(f,p.report);let i=0;
  const run=await collectPilot(p,async(_endpoint,payload)=>{
    assert.deepEqual(Object.keys(payload).sort(),['images','measurements']);assert.equal(Object.hasOwn(payload,'expected_catalogue_id'),false);
    const result=expected.results[i++];return {status:result.http_status,body:result.body};
  },()=>{});
  assert.equal(i,120);const report=evaluatePilot(p.input,run,p.report);assert.equal(report.accepted,true,JSON.stringify(report.errors));assert.equal(report.empirical_accepted,false);assert.equal(report.measurement_status,'SYNTHETIC_ONLY');
});
test('CLI validates synthetic files but cannot execute them or overwrite existing evidence',()=>{
  writeBundle(fixture());const result=cli('scripts/pilot-preflight.mjs',files());assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).measurement_status,'NOT_MEASURED');
  const output=path.join(root,'run-existing.json');fs.writeFileSync(output,'PRESERVE',{mode:0o600});
  const run=spawnSync(process.execPath,['scripts/run-pilot.mjs',...args(files()),'--output',output,'--execute'],{encoding:'utf8',timeout:15000});
  assert.equal(run.status,1);assert.equal(JSON.parse(run.stdout).execution,'BLOCKED');assert.equal(fs.readFileSync(output,'utf8'),'PRESERVE');
});
test('CLI errors do not disclose paths, sample IDs, review names or image contents',()=>{
  const f=fixture();f.input.manifest.cases[0].case_id='PRIVATE_CASE_IDENTIFIER';f.input.labels.cases[0].case_id='PRIVATE_CASE_IDENTIFIER';f.input.labels.cases[0].reason='PRIVATE_LABEL_TEXT';f.input.config.endpoint='https://example.invalid/api?PRIVATE_TOKEN=123';writeBundle(f);
  const result=cli('scripts/pilot-preflight.mjs',files());assert.equal(result.status,1);
  for(const secret of [root,'PRIVATE_CASE_IDENTIFIER','PRIVATE_LABEL_TEXT','PRIVATE_TOKEN','SYNTHETIC_REVIEWER','data:image/'])assert.equal(result.stdout.includes(secret)||result.stderr.includes(secret),false);
});
test('default empty manifest reports NOT MEASURED, no readiness and no empirical acceptance',()=>{
  const p=spawnSync(process.execPath,['scripts/pilot-preflight.mjs'],{encoding:'utf8'});assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).measurement_status,'NOT_MEASURED');
  const e=spawnSync(process.execPath,['scripts/evaluate-pilot.mjs'],{encoding:'utf8'});assert.equal(e.status,1);const r=JSON.parse(e.stdout);assert.equal(r.measurement_status,'NOT_MEASURED');assert.equal(r.empirical_accepted,false);assert.equal(r.ready_for_physical_pilot,false);
});

test('offline evaluator and readiness audit never promote a decoded synthetic run',async()=>{
  const f=fixture();writeBundle(f);const p=await preflightFromFiles(files());
  const runFile=path.join(root,'run.json');fs.writeFileSync(runFile,JSON.stringify(syntheticRun(f,p.report)),{mode:0o600});
  const result=cli('scripts/evaluate-pilot.mjs',{...files(),run:runFile});assert.equal(result.status,1);
  const report=JSON.parse(result.stdout);assert.equal(report.accepted,true);assert.equal(report.empirical_accepted,false);assert.equal(report.measurement_status,'SYNTHETIC_ONLY');
  const audit=spawnSync(process.execPath,['scripts/audit-readiness.mjs','--benchmark-dir',root],{encoding:'utf8',timeout:15000});
  assert.equal(audit.status,0,audit.stderr);const readiness=JSON.parse(audit.stdout);assert.equal(readiness.benchmark.measurement_status,'SYNTHETIC_ONLY');assert.equal(readiness.readiness.ready_for_physical_pilot,false);
});
