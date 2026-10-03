import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {Timer,validateSettings} from './timer.js';
import {Receiver} from './dmx.js';
const config=new URL('./settings.json',import.meta.url);let saved={};try{saved=JSON.parse(await readFile(config,'utf8'));}catch{}
const timer=new Timer();try{Object.assign(timer.settings,validateSettings(saved.settings||{}));if(Array.isArray(saved.presets))saved.presets.forEach((seconds,index)=>timer.action('preset',{index,seconds}));}catch(e){console.warn('Einstellungen verworfen:',e.message);}
const receiver=new Receiver(timer);receiver.configure();const clients=new Set();
const port=Number(process.env.PORT)||8181;const urls=Object.values(networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${port}`);
let logoVersion=0;try{await readFile(new URL('./logo.png',import.meta.url));logoVersion=Date.now();}catch{}
const state=()=>({...timer.snapshot(),network:receiver.status,urls,logoVersion});
let saving=Promise.resolve();function save(){const data=JSON.stringify({settings:timer.settings,presets:timer.presets},null,2);saving=saving.catch(()=>{}).then(async()=>{await writeFile(new URL('./settings.json.tmp',import.meta.url),data);await rename(new URL('./settings.json.tmp',import.meta.url),config);});return saving;}
const files={'/':'index.html','/display':'display.html','/app.js':'app.js','/display.js':'display.js','/style.css':'style.css'};
const server=http.createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/logo.png'&&req.method==='GET'){try{const logo=await readFile(new URL('./logo.png',import.meta.url));res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-cache'});res.end(logo);}catch{res.writeHead(404);res.end();}return;}
 if(path==='/api/logo'&&req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('Logo maximal 2 MB');chunks.push(chunk);}const data=Buffer.concat(chunks);
  if(data.length<24||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.toString('ascii',12,16)!=='IHDR'||data.readUInt32BE(16)>2048||data.readUInt32BE(20)>2048)throw Error('Ungültiges PNG-Logo');
  await writeFile(new URL('./logo.png.tmp',import.meta.url),data);await rename(new URL('./logo.png.tmp',import.meta.url),new URL('./logo.png',import.meta.url));logoVersion=Date.now();timer.settings.showLogo=true;await save();res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state()));return;
 }
 if(path==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});clients.add(res);res.write(`data: ${JSON.stringify(state())}\n\n`);req.on('close',()=>clients.delete(res));return;}
 if(path==='/api/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state()));return;}
 if(req.method==='POST'&&path==='/api/action'){
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('Anfrage zu groß');}const {type,value}=JSON.parse(body);
  if(type==='settings'){const settings={...timer.settings,...validateSettings(value)};if(settings.red>settings.amber)throw Error('Rot muss kleiner oder gleich Gelb sein');if(settings.protocol==='artnet'&&settings.universe>32768)throw Error('Art-Net: Universum maximal 32768');const reconnect=['protocol','universe','address','controlEnabled'].some(k=>settings[k]!==timer.settings[k]);timer.settings=settings;if(reconnect)receiver.configure();await save();}
  else {timer.action(type,value);if(type==='preset')await save();}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state()));return;
 }
 if(req.method!=='GET'||!files[path]){res.writeHead(404);res.end('Nicht gefunden');return;}
 const name=files[path];res.setHeader('Content-Type',name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(await readFile(new URL('./public/'+name,import.meta.url)));
 }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
setInterval(()=>{const payload=`data: ${JSON.stringify(state())}\n\n`;for(const c of clients)c.write(payload);},100);
server.listen(port,'0.0.0.0',()=>console.log(`Stage Timer → http://localhost:${port}\nAusgabe → http://localhost:${port}/display\n${urls.join('\n')}`));
function close(){for(const c of clients)c.end();if(receiver.socket)receiver.socket.close();server.close(()=>process.exit());}process.on('SIGINT',close);process.on('SIGTERM',close);
