"""Check the 25-channel GDTF package and exercise it against the receiver."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json
import subprocess

root = Path(__file__).resolve().parents[1]
filename = 'StageTimer@Stage_Timer@25CH_v2.0.gdtf'
with ZipFile(root / 'fixtures' / filename) as archive:
    assert archive.testzip() is None
    xml = archive.read('description.xml')
assert xml == (root / 'fixtures/description.xml').read_bytes()
fixture = ET.fromstring(xml).find('FixtureType')
attrs = {a.get('Name'):a for a in fixture.findall('AttributeDefinitions/Attributes/Attribute')}
features = {g.get('Name')+'.'+f.get('Name') for g in fixture.findall('AttributeDefinitions/FeatureGroups/FeatureGroup') for f in g}
assert all(a.get('Feature') in features for a in attrs.values())
mode = fixture.find('DMXModes/DMXMode')
channels = mode.findall('DMXChannels/DMXChannel')
assert mode.get('Name') == '25CH'
assert [int(c.get('Offset')) for c in channels] == list(range(1,26))
assert len(attrs) == 25
summary = []
for ch in channels:
    logical = ch.find('LogicalChannel')
    function = logical.find('ChannelFunction')
    assert logical.get('Attribute') in attrs
    assert logical.get('Master') == 'None' and logical.get('Snap') == 'Yes'
    assert ch.get('Highlight') == 'None'
    assert ch.get('InitialFunction') == f"Body_{logical.get('Attribute')}.{logical.get('Attribute')}.{function.get('Name')}"
    sets = {item.get('Name'):int(item.get('DMXFrom').split('/')[0]) for item in function.findall('ChannelSet')}
    assert list(sets.values())[0] == 0
    if logical.get('Attribute') != 'TimerBrightness': assert list(sets.values())[1] == 128
    summary.append({'attribute':logical.get('Attribute'),'default':int(function.get('Default').split('/')[0]),'sets':sets})
assert [item['default'] for item in summary] == [0]*24+[255]
with ZipFile(root / 'fixtures' / 'StageTimer-grandMA3-USB.zip') as archive:
    assert archive.testzip() is None
    assert f'grandMA3/gma3_library/fixturetypes/{filename}' in archive.namelist()
subprocess.run(['node','--input-type=module','-e',r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Timer} from './timer.js';
import {Receiver} from './dmx.js';
const channels=JSON.parse(readFileSync(0,'utf8')), values=channels.map(c=>c.default);values.push(0);
const timer=new Timer({protocol:'artnet'}), receiver=new Receiver(timer);
function send(){const b=Buffer.alloc(18+values.length);b.write('Art-Net\0');b.writeUInt16LE(0x5000,8);b.writeUInt16BE(14,10);b.writeUInt16BE(values.length,16);Buffer.from(values).copy(b,18);receiver.receive(b,'127.0.0.1');}
function pulse(index){values[index]=channels[index].sets.Trigger;send();values[index]=channels[index].sets.Ready;send();}
send();assert.equal(timer.running,false);assert.equal(timer.settings.brightness,100);
for(let i=0;i<10;i++){pulse(i);assert.equal(timer.duration,(i+1)*300);}
pulse(12);assert.equal(timer.running,true);pulse(13);assert.equal(timer.running,false);pulse(14);assert.equal(timer.seconds(),timer.duration);
for(const [index,mode] of [[19,'timer'],[20,'clock'],[21,'black'],[22,'test']]){pulse(index);assert.equal(timer.mode,mode);}
values[23]=channels[23].sets.On;send();assert.equal(timer.settings.sounds,true);
console.log('GDTF ZIP, USB package, 25-channel footprint, defaults and receiver actions verified.');
'''],input=json.dumps(summary),text=True,cwd=root,check=True)
