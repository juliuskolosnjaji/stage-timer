import test from 'node:test';
import assert from 'node:assert/strict';
import {biphaseLevels,dropFrameNumber,ltcFrameBits,timecodeParts} from '../public/ltc-worklet.js';
import {formatLtc,sourceAnchor} from '../public/ltc-output.js';

test('LTC frame contains BCD time, sync word and even-zero parity',()=>{
  const bits=ltcFrameBits({hours:1,minutes:23,seconds:45,frames:13,fps:25});
  assert.equal(bits.length,80);
  assert.deepEqual(bits.slice(0,4),[1,1,0,0]);
  assert.deepEqual(bits.slice(16,20),[1,0,1,0]);
  assert.deepEqual(bits.slice(64).join(''),'0011111111111101');
  assert.equal(bits.filter(bit=>bit===0).length%2,0);
});

test('biphase mark emits a boundary transition and an extra transition for one',()=>{
  assert.deepEqual(biphaseLevels([0,1],1),[-1,-1,1,-1]);
});

test('29.97 drop-frame numbering skips frame labels at minute boundaries',()=>{
  assert.equal(dropFrameNumber(1799),1799);
  assert.equal(dropFrameNumber(1800),1802);
  assert.equal(dropFrameNumber(17982),18000);
  assert.deepEqual(timecodeParts(1800*1001/30000,'29.97'),{hours:0,minutes:1,seconds:0,frames:2,fps:30,rate:30000/1001,dropFrame:true,wallClock:false});
});

test('LTC sources cover remaining time, elapsed time and local clock',()=>{
  const state={duration:300,remaining:240,running:true};
  assert.deepEqual(sourceAnchor(state,'remaining',new Date()),{seconds:240,rate:-1,wallClock:false});
  assert.deepEqual(sourceAnchor(state,'elapsed',new Date()),{seconds:60,rate:1,wallClock:false});
  assert.equal(formatLtc(state,'remaining','25'),'00:04:00:00');
  assert.equal(formatLtc(state,'elapsed','25'),'00:01:00:00');
  const clock={getHours:()=>12,getMinutes:()=>34,getSeconds:()=>56,getMilliseconds:()=>500};
  assert.equal(formatLtc(state,'clock','25',clock),'12:34:56:12');
});
