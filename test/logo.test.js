import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('logo API saves PNG, rejects invalid uploads, and persists visibility',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stage-timer-test-'));
 let child;
 try{
  for(const file of ['server.js','timer.js','dmx.js','package.json'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  child=spawn(process.execPath,['server.js'],{cwd:dir,env:{...process.env,PORT:'18189'},stdio:['ignore','pipe','pipe']});
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),4000).unref())]);
  const base='http://127.0.0.1:18189';
  const bad=await fetch(base+'/api/logo',{method:'POST',body:'not an image'});assert.equal(bad.status,400);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=','base64');
  const good=await fetch(base+'/api/logo',{method:'POST',body:png});assert.equal(good.status,200);const state=await good.json();assert.equal(state.settings.showLogo,true);assert.ok(state.logoVersion);
  assert.deepEqual(Buffer.from(await (await fetch(base+'/logo.png')).arrayBuffer()),png);
  assert.equal(JSON.parse(await readFile(join(dir,'settings.json'),'utf8')).settings.showLogo,true);
 }finally{if(child){const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;}await rm(dir,{recursive:true,force:true});}
});
