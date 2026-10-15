import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {randomUUID} from 'node:crypto';
import {Timer,validateSettings} from './timer.js';
import {Receiver} from './dmx.js';

const config=new URL('./settings.json',import.meta.url),networkKeys=new Set(['protocol','universe','address','controlEnabled','showControlWatermark']);
let saved={};try{saved=JSON.parse(await readFile(config,'utf8'));}catch{}
const validId=id=>typeof id==='string'&&/^[a-z0-9-]{1,64}$/.test(id);
const screenIcons=['◷','🎭','🎤','🎬','📺','💡','🎟️','🎪'];
function hydrate(data={},index=0){
 const timer=new Timer();
 try{Object.assign(timer.settings,validateSettings(data.settings||{}));if(Array.isArray(data.presets))data.presets.forEach((seconds,i)=>timer.action('preset',{index:i,seconds}));if(Number.isInteger(data.duration))timer.action('duration',data.duration);if(data.mode)timer.action('mode',data.mode);if(data.message)timer.action('message',data.message);}catch(e){console.warn('Screen-Einstellungen verworfen:',e.message);}
 const validSchedule=Number.isFinite(data.scheduleAt)&&Number.isInteger(data.scheduleDuration)&&data.scheduleDuration>=1&&data.scheduleDuration<=359999;
 return {id:validId(data.id)?data.id:`screen-${index+1}`,name:typeof data.name==='string'&&data.name.trim()?data.name.trim().slice(0,40):`Screen ${index+1}`,icon:typeof data.icon==='string'&&data.icon.trim()?data.icon.trim().slice(0,8):screenIcons[index%screenIcons.length],timer,scheduleAt:validSchedule?data.scheduleAt:null,scheduleDuration:validSchedule?data.scheduleDuration:null,logoVersion:0};
}
const screens=Array.isArray(saved.screens)&&saved.screens.length?saved.screens.map(hydrate):[hydrate({...saved,id:'screen-1',name:'Haupt-Screen'},0)];
for(const screen of screens){try{await readFile(new URL(`./logo-${screen.id}.png`,import.meta.url));screen.logoVersion=Date.now();}catch{}}
if(!screens[0].logoVersion){try{await readFile(new URL('./logo.png',import.meta.url));screens[0].logoVersion=Date.now();screens[0].legacyLogo=true;}catch{}}
const receiver=new Receiver(screens[0].timer);receiver.configure();const clients=new Map();
const port=Number(process.env.PORT)||8181,urls=Object.values(networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${port}`);
const findScreen=id=>screens.find(screen=>screen.id===id)||screens[0];
const requireScreen=id=>{const screen=screens.find(item=>item.id===id);if(!screen)throw Error('Screen nicht gefunden');return screen;};
const state=id=>{const screen=findScreen(id);return {...screen.timer.snapshot(),screenId:screen.id,screenName:screen.name,screenIcon:screen.icon,scheduleAt:screen.scheduleAt,scheduleDuration:screen.scheduleDuration,logoVersion:screen.logoVersion,network:receiver.status,urls,screens:screens.map((item,index)=>({id:item.id,name:item.name,icon:item.icon,running:item.timer.running,remaining:item.timer.seconds(),scheduleAt:item.scheduleAt,sounds:item.timer.settings.sounds,isDmx:index===0}))};};
const serialise=()=>({screens:screens.map(screen=>({id:screen.id,name:screen.name,icon:screen.icon,settings:screen.timer.settings,presets:screen.timer.presets,duration:screen.timer.duration,mode:screen.timer.mode,message:screen.timer.message,scheduleAt:screen.scheduleAt,scheduleDuration:screen.scheduleDuration}))});
let saving=Promise.resolve();function save(){const data=JSON.stringify(serialise(),null,2);saving=saving.catch(()=>{}).then(async()=>{await writeFile(new URL('./settings.json.tmp',import.meta.url),data);await rename(new URL('./settings.json.tmp',import.meta.url),config);});return saving;}
function setSchedule(screen,value){const startAt=Number(value?.startAt),duration=Number(value?.duration);if(!Number.isInteger(startAt)||startAt<Date.now()+1000||startAt>Date.now()+10*365*24*3600*1000)throw Error('Startzeit muss zwischen einer Sekunde und zehn Jahren in der Zukunft liegen');screen.timer.action('duration',duration);screen.scheduleAt=startAt;screen.scheduleDuration=duration;}
function applySchedule(screen,now=Date.now()){if(!screen.scheduleAt||screen.scheduleAt>now)return false;const remaining=screen.scheduleDuration-(now-screen.scheduleAt)/1000;screen.timer.duration=screen.scheduleDuration;screen.timer.remaining=screen.timer.settings.stopAtZero?Math.max(0,remaining):remaining;screen.timer.running=false;if(screen.timer.remaining>0||!screen.timer.settings.stopAtZero)screen.timer.action('start');screen.scheduleAt=null;screen.scheduleDuration=null;return true;}
if(screens.some(screen=>applySchedule(screen)))await save();
const files={'/':'index.html','/display':'display.html','/viewer':'viewer.html','/favicon.ico':'assets/stagetimer.ico','/app.js':'app.js','/display.js':'display.js','/viewer.js':'viewer.js','/style.css':'style.css','/viewer.css':'viewer.css','/assets/stagetimer-logo.png':'assets/stagetimer-logo.png','/assets/stagetimer-icon.png':'assets/stagetimer-icon.png','/assets/stagetimer.ico':'assets/stagetimer.ico'};
const server=http.createServer(async(req,res)=>{try{
 const requestUrl=new URL(req.url,'http://localhost'),path=requestUrl.pathname,screenId=requestUrl.searchParams.get('screen')||screens[0].id;
 if(path==='/logo.png'&&req.method==='GET'){const screen=requireScreen(screenId);try{const file=screen.legacyLogo?new URL('./logo.png',import.meta.url):new URL(`./logo-${screen.id}.png`,import.meta.url);const logo=await readFile(file);res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-cache'});res.end(logo);}catch{res.writeHead(404);res.end();}return;}
 if(path==='/api/logo'&&req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}const screen=requireScreen(screenId);
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('Logo maximal 2 MB');chunks.push(chunk);}const data=Buffer.concat(chunks);
  if(data.length<24||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.toString('ascii',12,16)!=='IHDR'||data.readUInt32BE(16)>2048||data.readUInt32BE(20)>2048)throw Error('Ungültiges PNG-Logo');
  const target=new URL(`./logo-${screen.id}.png`,import.meta.url);await writeFile(new URL(`./logo-${screen.id}.png.tmp`,import.meta.url),data);await rename(new URL(`./logo-${screen.id}.png.tmp`,import.meta.url),target);screen.legacyLogo=false;screen.logoVersion=Date.now();screen.timer.settings.showLogo=true;await save();res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state(screen.id)));return;
 }
 if(path==='/events'){const selected=findScreen(screenId);res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});clients.set(res,selected.id);res.write(`data: ${JSON.stringify(state(selected.id))}\n\n`);req.on('close',()=>clients.delete(res));return;}
 if(path==='/api/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state(screenId)));return;}
 if(req.method==='POST'&&path==='/api/action'){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('Anfrage zu groß');}const {type,value,screenId:bodyScreenId}=JSON.parse(body);let screen=findScreen(bodyScreenId);
  if(type==='screen-create'){const name=typeof value==='string'?value.trim():'';if(!name||name.length>40)throw Error('Screen-Name: 1–40 Zeichen');const settings={...screen.timer.settings};screen=hydrate({id:`screen-${randomUUID().slice(0,8)}`,name,settings},screens.length);screens.push(screen);await save();}
  else if(type==='screen-rename'){screen=requireScreen(bodyScreenId);const name=typeof value==='string'?value.trim():'';if(!name||name.length>40)throw Error('Screen-Name: 1–40 Zeichen');screen.name=name;await save();}
  else if(type==='screen-icon'){screen=requireScreen(bodyScreenId);const icon=typeof value==='string'?value.trim():'';if(!icon||icon.length>8||/[\p{Cc}\p{Cs}]/u.test(icon))throw Error('Icon: ein Emoji oder bis zu 8 Zeichen');screen.icon=icon;await save();}
  else if(type==='screen-delete'){screen=requireScreen(bodyScreenId);if(screen===screens[0])throw Error('Der DMX-Haupt-Screen kann nicht gelöscht werden');screens.splice(screens.indexOf(screen),1);await save();screen=screens[0];}
  else if(type==='schedule'){screen=requireScreen(bodyScreenId);setSchedule(screen,value);await save();}
  else if(type==='schedule-cancel'){screen=requireScreen(bodyScreenId);screen.scheduleAt=null;screen.scheduleDuration=null;await save();}
  else {screen=requireScreen(bodyScreenId);if(type==='settings'){const incoming=validateSettings(value),old={...screens[0].timer.settings},selectedNext={...screen.timer.settings,...incoming},primaryNext={...screens[0].timer.settings,...Object.fromEntries(Object.entries(incoming).filter(([key])=>networkKeys.has(key)))};if(selectedNext.red>selectedNext.amber)throw Error('Rot muss kleiner oder gleich Gelb sein');if(primaryNext.protocol==='artnet'&&primaryNext.universe>32768)throw Error('Art-Net: Universum maximal 32768');for(const [key,val] of Object.entries(incoming)){if(networkKeys.has(key))for(const item of screens)item.timer.settings[key]=val;else screen.timer.settings[key]=val;}if(['protocol','universe','address','controlEnabled'].some(key=>old[key]!==screens[0].timer.settings[key]))receiver.configure();await save();}else{screen.timer.action(type,value);if(['preset','duration','mode','message'].includes(type))await save();}}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state(screen.id)));return;
 }
 if(req.method!=='GET'||!files[path]){res.writeHead(404);res.end('Nicht gefunden');return;}const name=files[path];res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':name.endsWith('.png')?'image/png':name.endsWith('.ico')?'image/x-icon':'text/html; charset=utf-8');res.end(await readFile(new URL('./public/'+name,import.meta.url)));
 }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
setInterval(()=>{if(screens.some(screen=>applySchedule(screen)))save();for(const [client,id] of clients)client.write(`data: ${JSON.stringify(state(id))}\n\n`);},100);
server.listen(port,'0.0.0.0',()=>console.log(`Stage Timer → http://localhost:${port}\nAusgabe → http://localhost:${port}/display\n${urls.join('\n')}`));
function close(){for(const client of clients.keys())client.end();if(receiver.socket)receiver.socket.close();server.close(()=>process.exit());}process.on('SIGINT',close);process.on('SIGTERM',close);
