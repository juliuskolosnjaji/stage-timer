import {biphaseLevels,ltcFrameBits,timecodeParts} from './ltc-worklet.js';

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

export function fillLtcSamples(output,startTime,sampleRate,config,stream={frame:-1,levels:Array(160).fill(0)}){
  const fpsRate=String(config.fps)==='29.97'?30000/1001:Number(config.fps);
  for(let index=0;index<output.length;index++){
    const audioTime=startTime+index/sampleRate,position=audioTime*fpsRate,frame=Math.floor(position);
    if(frame!==stream.frame){const sourceSeconds=Math.max(0,config.baseSeconds+config.rate*(audioTime-config.anchorTime)),parts=timecodeParts(sourceSeconds,config.fps,config.wallClock);stream.levels=biphaseLevels(ltcFrameBits(parts));stream.frame=frame;}
    output[index]=stream.levels[Math.min(159,Math.floor((position-frame)*160))]*config.level;
  }
  return stream;
}

export class LtcOutput{
  constructor(){this.context=null;this.node=null;this.active=false;this.config=null;this.stream={frame:-1,levels:Array(160).fill(0)};}
  async start(config,state){
    if(this.active)return;const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)throw Error('Dieser Browser unterstützt keine Web-Audio-Ausgabe.');
    this.context=new Context({latencyHint:'interactive'});let workletReady=false;
    if(this.context.audioWorklet&&typeof globalThis.AudioWorkletNode==='function'){try{await this.context.audioWorklet.addModule('/ltc-worklet.js');this.node=new AudioWorkletNode(this.context,'stage-timer-ltc',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});workletReady=true;}catch{}}
    if(!workletReady){if(typeof this.context.createScriptProcessor!=='function')throw Error('Dieser Browser unterstützt keine kompatible LTC-Audioausgabe.');this.node=this.context.createScriptProcessor(1024,0,1);this.node.onaudioprocess=event=>{if(this.config)this.stream=fillLtcSamples(event.outputBuffer.getChannelData(0),event.playbackTime,this.context.sampleRate,this.config,this.stream);};}
    this.node.connect(this.context.destination);await this.context.resume();this.active=true;this.update(config,state);
  }
  update(config,state){
    if(!this.active||!this.node||!state)return;const anchor=sourceAnchor(state,config.source),payload={baseSeconds:anchor.seconds,rate:anchor.rate,wallClock:anchor.wallClock,anchorTime:this.context.currentTime,fps:config.fps,level:config.level/100};if(this.node.port)this.node.port.postMessage(payload);else this.config=payload;
  }
  async stop(){if(this.node){this.node.onaudioprocess=null;this.node.disconnect();this.node=null;}if(this.context){await this.context.close();this.context=null;}this.config=null;this.stream={frame:-1,levels:Array(160).fill(0)};this.active=false;}
}
