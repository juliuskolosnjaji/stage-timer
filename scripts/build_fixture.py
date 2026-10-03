"""Build Stage Timer's GDTF 1.2 profile using only Python's standard library."""
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'fixtures'
FILENAME = 'StageTimer@Stage_Timer@7CH_v1.0.gdtf'

def node(parent, tag, **attrs):
    return ET.SubElement(parent, tag, {k: str(v) for k, v in attrs.items()})

def build():
    root = ET.Element('GDTF', DataVersion='1.2')
    fixture = node(root, 'FixtureType', Name='Stage Timer', ShortName='StageTimer',
        LongName='Stage Timer Network Countdown', Manufacturer='StageTimer',
        Description='7-channel countdown control via sACN or Art-Net. Use zero fade for control cues. Load and commands are edge-triggered.',
        FixtureTypeID='820c4542-6847-4c49-9357-cfc31e170d04', CanHaveChildren='No')
    definitions = node(fixture, 'AttributeDefinitions')
    groups = node(definitions, 'FeatureGroups')
    control = node(groups, 'FeatureGroup', Name='Control', Pretty='Control')
    for name in ['TimerTransport', 'TimerDuration', 'TimerOutput']:
        node(control, 'Feature', Name=name)
    attrs = node(definitions, 'Attributes')
    channels = [
        ('TimerCommand', 'Command', 'TimerTransport', 'None', 0),
        ('TimerHours', 'Hours', 'TimerDuration', 'None', 0),
        ('TimerMinutes', 'Minutes', 'TimerDuration', 'None', 5),
        ('TimerSeconds', 'Seconds', 'TimerDuration', 'None', 0),
        ('TimerLoad', 'Load Time', 'TimerTransport', 'None', 0),
        ('TimerOutput', 'Output', 'TimerOutput', 'None', 0),
        ('TimerBrightness', 'Brightness', 'TimerOutput', 'Percent', 255),
    ]
    for name, pretty, feature, unit, default in channels:
        node(attrs, 'Attribute', Name=name, Pretty=pretty, Feature='Control.'+feature, PhysicalUnit=unit)
    models = node(fixture, 'Models')
    node(models, 'Model', Name='Screen', Length='0.48', Width='0.04', Height='0.27', PrimitiveType='Cube')
    geometries = node(fixture, 'Geometries')
    node(geometries, 'Geometry', Name='Body', Model='Screen', Position='{1,0,0,0}{0,1,0,0}{0,0,1,0}{0,0,0,1}')
    modes = node(fixture, 'DMXModes')
    mode = node(modes, 'DMXMode', Name='7CH', Geometry='Body', Description='Network timer - 7 consecutive 8-bit channels')
    dmx = node(mode, 'DMXChannels')
    for offset, (name, pretty, feature, unit, default) in enumerate(channels, 1):
        ch = node(dmx, 'DMXChannel', DMXBreak=1, Offset=offset, Geometry='Body', Highlight='None',
                  InitialFunction=f'Body_{name}.{name}.{name}')
        logical = node(ch, 'LogicalChannel', Attribute=name, Snap='Yes', Master='None', MibFade=0, DMXChangeTimeLimit=0)
        # Physical numbers match literal time values; do not scale 0..255 to 0..59.
        upper = 99 if offset == 2 else 59 if offset in (3, 4) else 255
        physical_from, physical_to = (10, 10) if offset == 7 else (0, upper)
        function = node(logical, 'ChannelFunction', Name=name, Attribute=name, OriginalAttribute=pretty,
                        DMXFrom='0/1', Default=f'{default}/1', PhysicalFrom=physical_from, PhysicalTo=physical_to,
                        RealFade=0, RealAcceleration=0)
        if offset in (2,3,4):
            for value in range(upper+1):
                node(function, 'ChannelSet', Name=f'{value:02d}', DMXFrom=f'{value}/1', PhysicalFrom=value, PhysicalTo=value)
            cap = node(logical, 'ChannelFunction', Name=name+'Clamped', Attribute=name, OriginalAttribute=pretty,
                       DMXFrom=f'{upper+1}/1', Default=f'{upper+1}/1', PhysicalFrom=upper, PhysicalTo=upper)
            node(cap, 'ChannelSet', Name=f'Clamped to {upper}', DMXFrom=f'{upper+1}/1', PhysicalFrom=upper, PhysicalTo=upper)
        elif offset == 7:
            # Below ~10% the app enforces minimum brightness; above it uses raw/255.
            part = node(logical, 'ChannelFunction', Name='Brightness', Attribute=name,
                        DMXFrom='26/1', Default='255/1', PhysicalFrom=26/255*100, PhysicalTo=100)
            node(part, 'ChannelSet', Name='Brightness', DMXFrom='26/1', PhysicalFrom=26/255*100, PhysicalTo=100)
            ch.set('InitialFunction', f'Body_{name}.{name}.Brightness')
            function.set('Default', '0/1')
            node(function, 'ChannelSet', Name='10 pct minimum', DMXFrom='0/1', PhysicalFrom=10, PhysicalTo=10)
        else:
            sets = {1:[('Neutral',0),('Start Resume',32),('Pause',96),('Reset',160),('Black Override',224)],
                    5:[('Ready',0),('Load Time',128)],
                    6:[('Timer',0),('Clock',64),('Black',128),('Test',192)]}[offset]
            for label, start in sets:
                node(function, 'ChannelSet', Name=label, DMXFrom=f'{start}/1', PhysicalFrom=start, PhysicalTo=start)
    revisions = node(fixture, 'Revisions')
    node(revisions, 'Revision', Text='v1.0 - Stage Timer 7CH network protocol', Date='2026-10-02T00:00:00', UserID=0, ModifiedBy='Stage Timer fixture builder')
    protocols = node(fixture, 'Protocols')
    node(protocols, 'Art-Net')
    node(protocols, 'sACN')
    ET.indent(root, space='  ')
    xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    OUT.mkdir(exist_ok=True)
    (OUT / 'description.xml').write_bytes(xml)
    with ZipFile(OUT / FILENAME, 'w', ZIP_DEFLATED) as z:
        info = ZipInfo('description.xml', date_time=(2026,10,2,0,0,0))
        info.compress_type = ZIP_DEFLATED
        z.writestr(info, xml)
    print(OUT / FILENAME)

if __name__ == '__main__':
    build()
