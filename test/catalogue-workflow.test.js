import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';

const script=fileURLToPath(new URL('../scripts/persist-catalogue.sh',import.meta.url));
const cleanEnv={...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0'};
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'numis-workflow-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const origin=join(root,'origin.git'),seed=join(root,'seed'),checkout=join(root,'checkout');
  const git=(cwd,...args)=>execFileSync('git',args,{cwd,env:cleanEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git(root,'init','--bare',origin);git(root,'init','-b','main',seed);
  git(seed,'config','user.name','Fixture');git(seed,'config','user.email','fixture@example.invalid');
  mkdirSync(join(seed,'data','staging'),{recursive:true});
  writeFileSync(join(seed,'data','import-state.json'),'old-state\n');
  writeFileSync(join(seed,'data','staging','ocre.json'),'old-staging\n');
  writeFileSync(join(seed,'package.json'),JSON.stringify({scripts:{check:'node check.cjs'}}));
  writeFileSync(join(seed,'check.cjs'),"if(process.env.FIXTURE_CHECK_FAIL)process.exit(1);\n");
  git(seed,'add','.');git(seed,'commit','-m','Baseline');git(seed,'remote','add','origin',origin);git(seed,'push','origin','main');
  git(root,'--git-dir',origin,'symbolic-ref','HEAD','refs/heads/main');git(root,'clone',origin,checkout);
  git(checkout,'config','user.name','Fixture');git(checkout,'config','user.email','fixture@example.invalid');
  const head=()=>git(root,'--git-dir',origin,'rev-parse','main');
  const before=head();
  const change=()=>{writeFileSync(join(checkout,'data','import-state.json'),'new-state\n');writeFileSync(join(checkout,'data','staging','ocre.json'),'new-staging\n');};
  const run=(env={})=>spawnSync('bash',[script],{cwd:checkout,env:{...cleanEnv,GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',...env},encoding:'utf8'});
  return {root,origin,seed,checkout,git,head,before,change,run};
}
for(const event of ['schedule','workflow_dispatch','push'])test(`${event} on main publishes only catalogue files to a local bare remote`,t=>{
  const f=fixture(t);f.change();const r=f.run({GITHUB_EVENT_NAME:event});assert.equal(r.status,0,r.stderr);
  assert.notEqual(f.head(),f.before);
  assert.equal(f.git(f.root,'--git-dir',f.origin,'show','main:data/import-state.json'),'new-state');
  assert.deepEqual(f.git(f.root,'--git-dir',f.origin,'diff-tree','--no-commit-id','--name-only','-r','main').split('\n').sort(),['data/import-state.json','data/staging/ocre.json']);
});
for(const env of [
  {GITHUB_REF:'refs/heads/feature',GITHUB_EVENT_NAME:'workflow_dispatch'},
  {GITHUB_REF:'refs/heads/feature',GITHUB_EVENT_NAME:'push'},
  {GITHUB_REF:'refs/pull/99/merge',GITHUB_EVENT_NAME:'pull_request'},
  {GITHUB_EVENT_NAME:'workflow_run'},
])test(`forbidden context ${JSON.stringify(env)} cannot write the remote`,t=>{
  const f=fixture(t);f.change();const r=f.run(env);assert.notEqual(r.status,0);assert.equal(f.head(),f.before);
});
test('feature checkout cannot publish even with a forged main environment ref',t=>{
  const f=fixture(t);f.git(f.checkout,'switch','-c','feature');f.change();assert.notEqual(f.run().status,0);assert.equal(f.head(),f.before);
});
test('commits outside remote main cannot be published from a local branch named main',t=>{
  const f=fixture(t);writeFileSync(join(f.checkout,'feature.txt'),'feature');f.git(f.checkout,'add','.');f.git(f.checkout,'commit','-m','Feature commit');f.change();
  assert.notEqual(f.run().status,0);assert.equal(f.head(),f.before);
});
test('staged non-catalogue files cannot be carried into the catalogue commit',t=>{
  const f=fixture(t);writeFileSync(join(f.checkout,'feature.txt'),'feature');f.git(f.checkout,'add','.');f.change();
  assert.notEqual(f.run().status,0);assert.equal(f.head(),f.before);
});
test('failed validation after rebase cannot push the import',t=>{
  const f=fixture(t);f.change();writeFileSync(join(f.seed,'new-main.txt'),'concurrent main change');f.git(f.seed,'add','.');f.git(f.seed,'commit','-m','Concurrent main change');f.git(f.seed,'push','origin','main');
  const current=f.head();assert.notEqual(current,f.before);
  const r=f.run({FIXTURE_CHECK_FAIL:'1'});assert.notEqual(r.status,0);assert.equal(f.head(),current);
  assert.equal(f.git(f.checkout,'show','HEAD:new-main.txt'),'concurrent main change');
  assert.equal(f.git(f.root,'--git-dir',f.origin,'show','main:data/import-state.json'),'old-state');
});
test('no-op import does not create or push a commit',t=>{
  const f=fixture(t);assert.equal(f.run().status,0);assert.equal(f.head(),f.before);
});
