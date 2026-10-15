import dgram from 'node:dgram';
export const DMX_CHANNELS=25;
export function parsePacket(b,protocol) {
  if(protocol==='artnet'){
    if(b.length<20||b.subarray(0,8).toString()!=='Art-Net\0'||b.readUInt16LE(8)!==0x5000||b.readUInt16BE(10)<14)return null;
    const length=b.readUInt16BE(16);if(length<2||length>512||length%2||b.length<18+length)return null;
    return {universe:b.readUInt16LE(14)+1,sequence:b[12],priority:100,cid:'artnet',data:b.subarray(18,18+length)};
  }
  if(b.length<126||b.readUInt16BE(0)!==16||b.readUInt16BE(2)!==0||b.subarray(4,16).toString()!=='ASC-E1.17\0\0\0'||b.readUInt32BE(18)!==4||b.readUInt32BE(40)!==2||b[117]!==2||b[118]!==0xa1||b.readUInt16BE(119)!==0||b.readUInt16BE(121)!==1||b[125]!==0)return null;
  const count=b.readUInt16BE(123);if(count<2||count>513||b.length<125+count||b[108]>200)return null;
  for(const offset of [16,38,115])if((b.readUInt16BE(offset)&0xf000)!==0x7000||(b.readUInt16BE(offset)&0xfff)!==125+count-offset)return null;
  if(b[112]&0x80||b.readUInt16BE(109)!==0||b[112]&0x20)return null;
  return {universe:b.readUInt16BE(113),sequence:b[111],priority:b[108],cid:b.subarray(22,38).toString('hex'),terminated:!!(b[112]&0x40),data:b.subarray(126,125+count)};
}
export class Receiver {
  constructor(timer){this.timer=timer;this.socket=null;this.sources=new Map();this.previous=null;this.openedAt=0;this.lastRecovery=0;this.status={state:'off',packets:0,lastSeen:null,error:null};}
  configure({recovering=false,now=Date.now()}={}){
    const retained=recovering?{previous:this.previous,packets:this.status.packets,lastSeen:this.status.lastSeen,source:this.status.source}:null;
    if(this.socket){try{this.socket.close();}catch{}this.socket=null;}this.sources.clear();this.previous=retained?.previous||null;this.openedAt=now;
    const s=this.timer.settings;this.status={state:s.protocol==='off'||!s.controlEnabled?'off':recovering?'reconnecting':'binding',packets:retained?.packets||0,lastSeen:retained?.lastSeen||null,error:null,...(retained?.source?{source:retained.source}:{})};if(s.protocol==='off'||!s.controlEnabled)return;
    const socket=dgram.createSocket({type:'udp4',reuseAddr:true});this.socket=socket;
    socket.on('error',e=>{if(this.socket===socket){this.status.state='error';this.status.error=e.message;}});
    socket.on('message',(b,r)=>this.receive(b,r.address));
    socket.bind(s.protocol==='sacn'?5568:6454,'0.0.0.0',()=>{if(this.socket!==socket)return;try{if(s.protocol==='sacn')socket.addMembership(`239.255.${s.universe>>8}.${s.universe&255}`);this.status.state='listening';}catch(e){this.status.state='error';this.status.error=e.message;}});
  }
  maintain(now=Date.now()){
    const s=this.timer.settings;if(!s.controlEnabled||s.protocol==='off')return false;
    const lastActivity=this.status.lastSeen||this.openedAt;
    if(now-lastActivity<4000||now-this.lastRecovery<4000)return false;
    this.lastRecovery=now;this.configure({recovering:true,now});return true;
  }
  receive(b,ip){
    const s=this.timer.settings;if(!s.controlEnabled||s.protocol==='off')return;const p=parsePacket(b,s.protocol);if(!p||p.universe!==s.universe)return;
    const now=Date.now(),key=ip+':'+p.cid;for(const [k,v]of this.sources)if(now-v.time>2500)this.sources.delete(k);
    if(p.terminated){this.sources.delete(key);return;}
    const old=this.sources.get(key);if(old&&(s.protocol==='sacn'||p.sequence!==0)){const delta=(p.sequence-old.sequence+256)%256;if(delta===0||delta>127)return;}
    this.sources.set(key,{time:now,sequence:p.sequence,priority:p.priority});
    const winner=[...this.sources.entries()].sort((a,b)=>b[1].priority-a[1].priority||a[0].localeCompare(b[0]))[0]?.[0];if(winner!==key)return;
    if(p.data.length<s.address+DMX_CHANNELS-1)return;
    this.status={state:'receiving',packets:this.status.packets+1,lastSeen:now,error:null,source:ip};
    const d=p.data.subarray(s.address-1,s.address-1+DMX_CHANNELS),prev=this.previous;
    // Button channels trigger only on a low-to-high edge. Held values never repeat.
    const trigger=(index,action,value)=>{if(d[index]>=128&&(!prev||prev[index]<128))this.timer.action(action,value);};
    for(let index=0;index<10;index++)trigger(index,'duration',(index+1)*300);
    trigger(10,'jog',300);trigger(11,'jog',-300);
    trigger(15,'jog',60);trigger(16,'jog',-60);trigger(17,'jog',120);trigger(18,'jog',-120);
    trigger(12,'start');trigger(13,'pause');trigger(14,'reset');
    for(const [index,mode] of [[19,'timer'],[20,'clock'],[21,'black'],[22,'test']])trigger(index,'mode',mode);
    this.timer.settings.sounds=d[23]>=128;
    this.timer.settings.brightness=Math.max(10,Math.round(d[24]/255*100));
    this.previous=Buffer.from(d);
  }
}
