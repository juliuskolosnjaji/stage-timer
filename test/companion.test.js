import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('Companion actions control a selected screen through the HTTP API',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'stage-timer-companion-'));let child;
 try{
  for(const file of ['server.js','timer.js','dmx.js','package.json'])await copyFile(new URL('../'+file,import.meta.url),join(dir,file));
  child=spawn(process.execPath,['server.js'],{cwd:dir,env:{...process.env,PORT:'18191'},stdio:['ignore','pipe','pipe']});
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),4000).unref())]);
  const base='http://127.0.0.1:18191',post=async(type,value,screenId='screen-1')=>{const response=await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,value,screenId})});assert.equal(response.status,200);return response.json();};
  await post('preset',{index:0,seconds:42});
  const loaded=await post('preset-load',0);assert.equal(loaded.duration,42);assert.equal(loaded.remaining,42);
  const running=await post('toggle');assert.equal(running.running,true);
  const paused=await post('toggle');assert.equal(paused.running,false);assert.ok(paused.remaining<=42);
  const created=await post('screen-create','Zweiter Screen'),second=created.screenId;
  await post('message-target',{target:second,message:'Nur rechts'});const primary=await (await fetch(base+'/api/state?screen=screen-1')).json(),targeted=await (await fetch(base+'/api/state?screen='+second)).json();assert.equal(primary.message,'');assert.equal(targeted.message,'Nur rechts');assert.equal(targeted.screens.find(screen=>screen.id===second).message,'Nur rechts');
  await post('message-target',{target:'all',message:'An alle'});assert.equal((await (await fetch(base+'/api/state?screen=screen-1')).json()).message,'An alle');assert.equal((await (await fetch(base+'/api/state?screen='+second)).json()).message,'An alle');
 }finally{if(child){const stopped=once(child,'exit');child.kill('SIGTERM');await stopped;}await rm(dir,{recursive:true,force:true});}
});
