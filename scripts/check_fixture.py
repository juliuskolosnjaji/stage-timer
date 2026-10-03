"""Check the packaged profile's references and exercise its values against the receiver."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json
import subprocess

root = Path(__file__).resolve().parents[1]
with ZipFile(root / 'fixtures/StageTimer@Stage_Timer@7CH_v1.0.gdtf') as archive:
    assert archive.testzip() is None
    xml = archive.read('description.xml')
assert xml == (root / 'fixtures/description.xml').read_bytes()
fixture = ET.fromstring(xml).find('FixtureType')
attrs = {a.get('Name'):a for a in fixture.findall('AttributeDefinitions/Attributes/Attribute')}
features = {g.get('Name')+'.'+f.get('Name') for g in fixture.findall('AttributeDefinitions/FeatureGroups/FeatureGroup') for f in g}
assert all(a.get('Feature') in features for a in attrs.values())
mode = fixture.find('DMXModes/DMXMode')
channels = mode.findall('DMXChannels/DMXChannel')
assert [int(c.get('Offset')) for c in channels] == list(range(1,8))
assert len(attrs) == 7
summary = []
def raw(value):
    n, size = value.split('/')
    assert size == '1'
    assert 0 <= int(n) <= 255
    return int(n)
for ch in channels:
    logical = ch.find('LogicalChannel')
    assert logical.get('Attribute') in attrs
    assert logical.get('Master') == 'None'
    assert logical.get('Snap') == 'Yes'
    assert ch.get('Highlight') == 'None'
    functions = logical.findall('ChannelFunction')
    starts = [raw(f.get('DMXFrom')) for f in functions]
    assert starts[0] == 0 and starts == sorted(set(starts))
    initial = None
    for i, f in enumerate(functions):
        end = starts[i+1]-1 if i+1 < len(starts) else 255
        assert starts[i] <= raw(f.get('Default')) <= end
        assert f.get('Attribute') == logical.get('Attribute')
        sets = [raw(s.get('DMXFrom')) for s in f.findall('ChannelSet')]
        assert sets == sorted(set(sets))
        assert all(starts[i] <= v <= end for v in sets)
        ref = f"{ch.get('Geometry')}_{logical.get('Attribute')}.{logical.get('Attribute')}.{f.get('Name')}"
        if ref == ch.get('InitialFunction'):
            initial = raw(f.get('Default'))
    assert initial is not None
    summary.append({'attribute':logical.get('Attribute'),'default':initial,'sets':{s.get('Name'):raw(s.get('DMXFrom')) for s in ch.findall('.//ChannelSet')}})
assert [s['default'] for s in summary] == [0,0,5,0,0,0,255]
subprocess.run(['node','--input-type=module','-e',r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Timer} from './timer.js';
import {Receiver} from './dmx.js';
const channels=JSON.parse(readFileSync(0,'utf8'));
const t=new Timer({protocol:'artnet'}), receiver=new Receiver(t);
const values=channels.map(c=>c.default);
function send(){const b=Buffer.alloc(26);b.write('Art-Net\0');b.writeUInt16LE(0x5000,8);b.writeUInt16BE(14,10);b.writeUInt16BE(8,16);Buffer.from(values).copy(b,18);receiver.receive(b,'127.0.0.1');}
send();assert.equal(t.running,false);assert.equal(t.settings.brightness,100);assert.equal(t.mode,'timer');
for(const [slot,max] of [[1,99],[2,59],[3,59]]){
 for(let n=0;n<=max;n++){
  values[1]=0;values[2]=0;values[3]=1;values[slot]=channels[slot].sets[String(n).padStart(2,'0')];
  values[4]=channels[4].sets.Ready;send();values[4]=channels[4].sets['Load Time'];send();
  const expected=values[1]*3600+values[2]*60+values[3];if(expected)assert.equal(t.duration,expected);
 }
}
values[0]=channels[0].sets['Start Resume'];send();assert.equal(t.running,true);
const deadline=t.deadline;send();assert.equal(t.deadline,deadline);
values[0]=channels[0].sets.Pause;send();assert.equal(t.running,false);
values[0]=channels[0].sets.Reset;send();assert.equal(t.seconds(),t.duration);
values[0]=channels[0].sets.Neutral;send();
for(const [label,mode] of [['Clock','clock'],['Black','black'],['Test','test'],['Timer','timer']]){
 values[5]=channels[5].sets[label];send();assert.equal(t.mode,mode);
}
values[0]=channels[0].sets['Black Override'];send();assert.equal(t.mode,'black');
console.log('GDTF ZIP, references, defaults, 7-channel footprint, all time sets and receiver commands verified.');
'''],input=json.dumps(summary),text=True,cwd=root,check=True)
