export const defaults = {brightness:100, showProgress:true, showClock:true, alwaysHours:true, whiteOnly:false, stopAtZero:false, background:'#000000', amber:300, red:120, sounds:false, controlEnabled:true, showControlWatermark:false, showLogo:false, logoOpacity:20, logoSize:18, logoPosition:'bottom-right', protocol:'off', universe:1, address:1};
export class Timer {
  constructor(settings={}) { this.settings={...defaults,...settings}; this.duration=300; this.remaining=300; this.running=false; this.deadline=0; this.mode='timer'; this.message=''; this.presets=[300,600,900,1200,1500,1800,2100,2400,2700]; }
  seconds() { return this.running ? (this.settings.stopAtZero?Math.max(0,(this.deadline-performance.now())/1000):(this.deadline-performance.now())/1000) : this.remaining; }
  snapshot() { if(this.running && this.settings.stopAtZero && this.seconds()<=0){this.remaining=0;this.running=false;} return {duration:this.duration,remaining:this.seconds(),running:this.running,mode:this.mode,message:this.message,presets:this.presets,settings:this.settings}; }
  action(type,value) {
    if(type==='start'&&!this.running){this.deadline=performance.now()+this.remaining*1000;this.running=true;}
    else if(type==='pause'){this.remaining=this.seconds();this.running=false;}
    else if(type==='reset'){this.running=false;this.remaining=this.duration;}
    else if(type==='duration'){if(!Number.isInteger(value)||value<1||value>359999)throw Error('Dauer: 1–359999 Sekunden');this.duration=value;this.remaining=value;this.running=false;}
    else if(type==='jog'){if(!Number.isFinite(value)||Math.abs(value)>3600)throw Error('Ungültige Zeitkorrektur');this.remaining=this.seconds()+value;if(this.running)this.deadline=performance.now()+this.remaining*1000;}
    else if(type==='mode'){if(!['timer','clock','black','test'].includes(value))throw Error('Ungültige Ausgabe');this.mode=value;}
    else if(type==='message'){if(typeof value!=='string'||value.length>300)throw Error('Nachricht zu lang');this.message=value;}
    else if(type==='preset'){if(!value||!Number.isInteger(value.index)||value.index<0||value.index>8||!Number.isInteger(value.seconds)||value.seconds<1||value.seconds>359999)throw Error('Ungültiges Preset');this.presets[value.index]=value.seconds;}
    else if(!['start','pause','reset','duration','jog','mode','message','preset'].includes(type)) throw Error('Unbekannter Befehl');
  }
}
export function validateSettings(input) {
  const out={}; for(const [k,v] of Object.entries(input)) { if(!Object.hasOwn(defaults,k))throw Error('Unbekannte Einstellung');
    if(typeof defaults[k]==='boolean'){if(typeof v!=='boolean')throw Error(k);}
    else if(k==='protocol'){if(!['off','sacn','artnet'].includes(v))throw Error(k);}
    else if(k==='logoPosition'){if(!['top-left','top-right','bottom-left','bottom-right','center'].includes(v))throw Error(k);}
    else if(k==='background'){if(!/^#[0-9a-f]{6}$/i.test(v))throw Error(k);}
    else {const ranges={logoOpacity:[5,100],logoSize:[5,50],brightness:[10,100],amber:[0,359999],red:[0,359999],universe:[1,63999],address:[1,506]};if(!Number.isInteger(v)||v<ranges[k][0]||v>ranges[k][1])throw Error('Ungültig: '+k);}
    out[k]=v;
  } return out;
}
