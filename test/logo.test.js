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
  assert.deepEqual(Buffer.from(await (await fetch(base+'/logo.png?screen=screen-1')).arrayBuffer()),png);
  assert.equal(JSON.parse(await readFile(join(dir,'settings.json'),'utf8')).screens[0].settings.showLogo,true);
 }finally{if(child){const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;}await rm(dir,{recursive:true,force:true});}
});
test('screens have independent timers and scheduled starts',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stage-timer-screens-'));let child;
 try{
  for(const file of ['server.js','timer.js','dmx.js','package.json'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  child=spawn(process.execPath,['server.js'],{cwd:dir,env:{...process.env,PORT:'18190'},stdio:['ignore','pipe','pipe']});
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),4000).unref())]);
  const base='http://127.0.0.1:18190',post=async(type,value,screenId='screen-1')=>{const response=await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,value,screenId})});assert.equal(response.status,200);return response.json();};
  await post('duration',120);const created=await post('screen-create','Bühne rechts'),second=created.screenId;assert.notEqual(second,'screen-1');assert.equal(created.screens.length,2);const resized=await post('settings',{logoSize:33},second);assert.equal(resized.settings.logoSize,33);
  const startAt=Date.now()+1800;const scheduled=await post('schedule',{startAt,duration:20},second);assert.equal(scheduled.scheduleAt,startAt);assert.equal(scheduled.running,false);
  const primary=await (await fetch(base+'/api/state?screen=screen-1')).json();assert.equal(primary.duration,120);assert.equal(primary.running,false);assert.equal(primary.settings.logoSize,18);
  const persisted=JSON.parse(await readFile(join(dir,'settings.json'),'utf8'));assert.equal(persisted.screens.length,2);assert.equal(persisted.screens[1].scheduleAt,startAt);
  let stopped=once(child,'exit');child.kill('SIGTERM');await stopped;child=undefined;
  child=spawn(process.execPath,['server.js'],{cwd:dir,env:{...process.env,PORT:'18190'},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server restart timeout')),4000).unref())]);
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,startAt-Date.now()+350)));const started=await (await fetch(base+'/api/state?screen='+second)).json();assert.equal(started.running,true);assert.equal(started.scheduleAt,null);assert.ok(started.remaining>17&&started.remaining<20);
 }finally{if(child){const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;}await rm(dir,{recursive:true,force:true});}
});
