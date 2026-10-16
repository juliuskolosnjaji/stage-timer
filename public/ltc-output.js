import {timecodeParts} from './ltc-worklet.js';

export const LTC_SOURCES=['remaining','elapsed','clock'];
export const LTC_FPS=['24','25','29.97','30'];

export function sourceAnchor(state,source,now=new Date()){
  if(source==='clock')return {seconds:now.getHours()*3600+now.getMinutes()*60+now.getSeconds()+now.getMilliseconds()/1000,rate:1,wallClock:true};
  if(source==='elapsed')return {seconds:Math.max(0,state.duration-state.remaining),rate:state.running?1:0,wallClock:false};
  return {seconds:Math.max(0,state.remaining),rate:state.running?-1:0,wallClock:false};
}

export function formatLtc(state,source='remaining',fps='25',now=new Date()){
  const anchor=sourceAnchor(state,source,now),parts=timecodeParts(anchor.seconds,fps,anchor.wallClock),separator=parts.dropFrame?';':':',pad=value=>String(value).padStart(2,'0');
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}${separator}${pad(parts.frames)}`;
}

export class LtcOutput{
  constructor(){this.context=null;this.node=null;this.active=false;}
  async start(config,state){
    if(this.active)return;const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('Dieser Browser unterstützt keine Web-Audio-Ausgabe.');
    this.context=new Context({latencyHint:'interactive'});await this.context.audioWorklet.addModule('/ltc-worklet.js');this.node=new AudioWorkletNode(this.context,'stage-timer-ltc',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});this.node.connect(this.context.destination);await this.context.resume();this.active=true;this.update(config,state);
  }
  update(config,state){
    if(!this.active||!this.node||!state)return;const anchor=sourceAnchor(state,config.source);this.node.port.postMessage({baseSeconds:anchor.seconds,rate:anchor.rate,wallClock:anchor.wallClock,anchorTime:this.context.currentTime,fps:config.fps,level:config.level/100});
  }
  async stop(){if(this.node){this.node.disconnect();this.node=null;}if(this.context){await this.context.close();this.context=null;}this.active=false;}
}
