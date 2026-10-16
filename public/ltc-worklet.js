const SYNC_WORD='0011111111111101';

function writeBits(bits,start,count,value){for(let index=0;index<count;index++)bits[start+index]=(value>>index)&1;}

export function ltcFrameBits({hours=0,minutes=0,seconds=0,frames=0,fps=25,dropFrame=false,wallClock=false}={}){
  const bits=Array(80).fill(0);
  writeBits(bits,0,4,frames%10);writeBits(bits,8,2,Math.floor(frames/10));bits[10]=dropFrame?1:0;
  writeBits(bits,16,4,seconds%10);writeBits(bits,20,3,Math.floor(seconds/10));
  writeBits(bits,32,4,minutes%10);writeBits(bits,40,3,Math.floor(minutes/10));
  writeBits(bits,48,4,hours%10);writeBits(bits,56,2,Math.floor(hours/10));bits[58]=wallClock?1:0;
  for(let index=0;index<16;index++)bits[64+index]=Number(SYNC_WORD[index]);
  const parityBit=fps===25?59:27;bits[parityBit]=0;
  if(bits.filter(bit=>bit===0).length%2)bits[parityBit]=1;
  return bits;
}

export function dropFrameNumber(frameNumber){
  const framesPer24Hours=2589408,framesPer10Minutes=17982,framesPerMinute=1798;
  frameNumber=((frameNumber%framesPer24Hours)+framesPer24Hours)%framesPer24Hours;
  const tenMinuteBlocks=Math.floor(frameNumber/framesPer10Minutes),remainder=frameNumber%framesPer10Minutes;
  return frameNumber+18*tenMinuteBlocks+2*Math.floor(Math.max(0,remainder-2)/framesPerMinute);
}

export function timecodeParts(valueSeconds,fpsValue=25,wallClock=false){
  const dropFrame=String(fpsValue)==='29.97',fps=dropFrame?30:Number(fpsValue),rate=dropFrame?30000/1001:fps;
  const daySeconds=24*3600,value=((Number(valueSeconds)||0)%daySeconds+daySeconds)%daySeconds;
  let totalFrames=Math.floor(value*rate+1e-7);if(dropFrame)totalFrames=dropFrameNumber(totalFrames);
  const frames=totalFrames%fps,totalSeconds=Math.floor(totalFrames/fps),seconds=totalSeconds%60,minutes=Math.floor(totalSeconds/60)%60,hours=Math.floor(totalSeconds/3600)%24;
  return {hours,minutes,seconds,frames,fps,rate,dropFrame,wallClock};
}

export function biphaseLevels(bits,initial=1){
  let level=initial;const result=[];
  for(const bit of bits){level=-level;result.push(level);if(bit)level=-level;result.push(level);}
  return result;
}

const WorkletBase=globalThis.AudioWorkletProcessor||class{};
export class LtcProcessor extends WorkletBase{
  constructor(){
    super();this.config={baseSeconds:0,rate:0,anchorTime:0,fps:25,level:.2,wallClock:false};this.streamFrame=-1;this.levels=Array(160).fill(0);
    if(this.port)this.port.onmessage=event=>{this.config={...this.config,...event.data};};
  }
  process(_inputs,outputs){
    const output=outputs[0]?.[0];if(!output)return true;const c=this.config,fpsRate=String(c.fps)==='29.97'?30000/1001:Number(c.fps);
    for(let index=0;index<output.length;index++){
      const audioTime=currentTime+index/sampleRate,position=audioTime*fpsRate,streamFrame=Math.floor(position);
      if(streamFrame!==this.streamFrame){const sourceSeconds=Math.max(0,c.baseSeconds+c.rate*(audioTime-c.anchorTime)),parts=timecodeParts(sourceSeconds,c.fps,c.wallClock);this.levels=biphaseLevels(ltcFrameBits(parts));this.streamFrame=streamFrame;}
      const half=Math.min(159,Math.floor((position-streamFrame)*160));output[index]=this.levels[half]*c.level;
    }
    return true;
  }
}

if(typeof registerProcessor==='function')registerProcessor('stage-timer-ltc',LtcProcessor);
