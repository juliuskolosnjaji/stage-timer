"""Build Stage Timer's 25-channel GDTF 1.2 profile using the standard library."""
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'fixtures'
FILENAME = 'StageTimer@Stage_Timer@25CH_v2.0.gdtf'

def node(parent, tag, **attrs):
    return ET.SubElement(parent, tag, {k: str(v) for k, v in attrs.items()})

def channel(name, pretty, feature, active='Trigger', default=0):
    return {'name': name, 'pretty': pretty, 'feature': feature, 'active': active, 'default': default}

def build():
    channels = [channel(f'TimerPreset{minutes:02d}', f'{minutes} Minutes', 'TimerDuration') for minutes in range(5, 55, 5)]
    channels += [
        channel('TimerPlus5', '+5 Minutes', 'TimerCorrection'), channel('TimerMinus5', '-5 Minutes', 'TimerCorrection'),
        channel('TimerStart', 'Start', 'TimerTransport'), channel('TimerPause', 'Pause', 'TimerTransport'),
        channel('TimerReset', 'Reset', 'TimerTransport'), channel('TimerPlus1', '+1 Minute', 'TimerCorrection'),
        channel('TimerMinus1', '-1 Minute', 'TimerCorrection'), channel('TimerPlus2', '+2 Minutes', 'TimerCorrection'),
        channel('TimerMinus2', '-2 Minutes', 'TimerCorrection'), channel('OutputTimer', 'Timer Output', 'TimerOutput'),
        channel('OutputClock', 'Clock Output', 'TimerOutput'), channel('OutputBlack', 'Black Output', 'TimerOutput'),
        channel('OutputTest', 'Test Output', 'TimerOutput'), channel('TimerSound', 'End Sound', 'TimerAudio', 'On'),
        channel('TimerBrightness', 'Brightness', 'TimerOutput', 'Brightness', 255),
    ]
    root = ET.Element('GDTF', DataVersion='1.2')
    fixture = node(root, 'FixtureType', Name='Stage Timer', ShortName='StageTimer',
        LongName='Stage Timer Network Countdown', Manufacturer='StageTimer',
        Description='25-channel countdown control via sACN or Art-Net. Button channels trigger at DMX 128 and require zero fade.',
        FixtureTypeID='820c4542-6847-4c49-9357-cfc31e170d04', CanHaveChildren='No')
    definitions = node(fixture, 'AttributeDefinitions')
    groups = node(definitions, 'FeatureGroups')
    control = node(groups, 'FeatureGroup', Name='Control', Pretty='Control')
    for name in ['TimerDuration', 'TimerCorrection', 'TimerTransport', 'TimerOutput', 'TimerAudio']:
        node(control, 'Feature', Name=name)
    attrs = node(definitions, 'Attributes')
    for spec in channels:
        node(attrs, 'Attribute', Name=spec['name'], Pretty=spec['pretty'], Feature='Control.'+spec['feature'],
             PhysicalUnit='Percent' if spec['name']=='TimerBrightness' else 'None')
    models = node(fixture, 'Models')
    node(models, 'Model', Name='Screen', Length='0.48', Width='0.04', Height='0.27', PrimitiveType='Cube')
    geometries = node(fixture, 'Geometries')
    node(geometries, 'Geometry', Name='Body', Model='Screen', Position='{1,0,0,0}{0,1,0,0}{0,0,1,0}{0,0,0,1}')
    modes = node(fixture, 'DMXModes')
    mode = node(modes, 'DMXMode', Name='25CH', Geometry='Body', Description='Network timer - 25 consecutive 8-bit channels')
    dmx = node(mode, 'DMXChannels')
    for offset, spec in enumerate(channels, 1):
        name, pretty, default = spec['name'], spec['pretty'], spec['default']
        ch = node(dmx, 'DMXChannel', DMXBreak=1, Offset=offset, Geometry='Body', Highlight='None',
                  InitialFunction=f'Body_{name}.{name}.{name}')
        logical = node(ch, 'LogicalChannel', Attribute=name, Snap='Yes', Master='None', MibFade=0, DMXChangeTimeLimit=0)
        function = node(logical, 'ChannelFunction', Name=name, Attribute=name, OriginalAttribute=pretty,
                        DMXFrom='0/1', Default=f'{default}/1', PhysicalFrom=0, PhysicalTo=100,
                        RealFade=0, RealAcceleration=0)
        if name == 'TimerBrightness':
            node(function, 'ChannelSet', Name='Brightness', DMXFrom='0/1', PhysicalFrom=10, PhysicalTo=100)
        else:
            node(function, 'ChannelSet', Name='Ready' if spec['active']=='Trigger' else 'Off', DMXFrom='0/1', PhysicalFrom=0, PhysicalTo=0)
            node(function, 'ChannelSet', Name=spec['active'], DMXFrom='128/1', PhysicalFrom=100, PhysicalTo=100)
    revisions = node(fixture, 'Revisions')
    node(revisions, 'Revision', Text='v2.0 - Stage Timer 25CH individual control channels', Date='2026-10-14T00:00:00', UserID=0, ModifiedBy='Stage Timer fixture builder')
    protocols = node(fixture, 'Protocols')
    node(protocols, 'Art-Net'); node(protocols, 'sACN')
    ET.indent(root, space='  ')
    xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    OUT.mkdir(exist_ok=True)
    (OUT / 'description.xml').write_bytes(xml)
    gdtf = OUT / FILENAME
    with ZipFile(gdtf, 'w', ZIP_DEFLATED) as archive:
        info = ZipInfo('description.xml', date_time=(2026,10,14,0,0,0)); info.compress_type = ZIP_DEFLATED
        archive.writestr(info, xml)
    usb = OUT / 'StageTimer-grandMA3-USB.zip'
    with ZipFile(usb, 'w', ZIP_DEFLATED) as archive:
        for source, target in [(gdtf, f'grandMA3/gma3_library/fixturetypes/{FILENAME}'),
                               (OUT/'IMPORT-grandMA3.md', 'IMPORT-grandMA3.md')]:
            info = ZipInfo(target, date_time=(2026,10,14,0,0,0)); info.compress_type = ZIP_DEFLATED
            archive.writestr(info, source.read_bytes())
    print(gdtf)

if __name__ == '__main__':
    build()
