import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('candidate inventory omits private files and never mistakes a blank key for the next comment',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'liquidity-release-'));
 try{
  for(const dir of ['scripts','apps/server','.data','docs/handoff'])mkdirSync(path.join(root,dir),{recursive:true});
  copyFileSync(new URL('../scripts/submission-check.mjs',import.meta.url),path.join(root,'scripts/submission-check.mjs'));
  writeFileSync(path.join(root,'submission.json'),JSON.stringify({project:'test',track:'test'}));
  writeFileSync(path.join(root,'apps/server/.env.local'),'CMC_API_KEY=\n# Comment that also exists in example\n');
  writeFileSync(path.join(root,'apps/server/.env.example'),'CMC_API_KEY=\n# Comment that also exists in example\n');
  writeFileSync(path.join(root,'.data/private.json'),'private');writeFileSync(path.join(root,'docs/handoff/private.md'),'private');
  const run=spawnSync(process.execPath,[path.join(root,'scripts/submission-check.mjs')],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
  const manifest=JSON.parse(readFileSync(path.join(root,'release/source-manifest.json'),'utf8')) as {path:string}[];
  assert.ok(manifest.some(f=>f.path.endsWith('.env.example')));assert.ok(!manifest.some(f=>f.path.includes('.env.local')||f.path.startsWith('.data/')||f.path.includes('handoff')));
  const status=JSON.parse(readFileSync(path.join(root,'release/submission-status.json'),'utf8'));assert.equal(status.readyForSubmission,false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('candidate export refuses a configured key leaked into source without printing it',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'liquidity-release-')),fake='fixture-credential-not-a-real-key';
 try{
  for(const dir of ['scripts','apps/server'])mkdirSync(path.join(root,dir),{recursive:true});
  copyFileSync(new URL('../scripts/submission-check.mjs',import.meta.url),path.join(root,'scripts/submission-check.mjs'));
  writeFileSync(path.join(root,'submission.json'),'{}');writeFileSync(path.join(root,'apps/server/.env.local'),`CMC_API_KEY=${fake}`);writeFileSync(path.join(root,'leaked.txt'),fake);
  const run=spawnSync(process.execPath,[path.join(root,'scripts/submission-check.mjs')],{encoding:'utf8'});assert.notEqual(run.status,0);assert.ok(run.stderr.includes('export stopped'));assert.ok(!run.stderr.includes(fake));
 }finally{rmSync(root,{recursive:true,force:true});}
});
