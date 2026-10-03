# Stage Timer – grandMA3 Fixture

Datei: **StageTimer@Stage_Timer@7CH_v1.0.gdtf**
Hersteller: **StageTimer** · Fixture: **Stage Timer** · Mode: **7CH**
Ziel: grandMA3 2.5, aktuell 2.5.1.0 laut MA-Downloadseite am 02.10.2026.

## Import

1. Die `.gdtf` unverändert auf einen USB-Stick nach `grandMA3/gma3_library/fixturetypes/` kopieren. Nicht entpacken.
2. In grandMA3 **Menu → Patch → Fixture Types → Import** öffnen.
3. Oben rechts den USB-Stick auswählen, ggf. auf die User-Bibliothek wechseln, **StageTimer / Stage Timer** auswählen und importieren.
4. Ein Fixture im Mode **7CH** patchen. Es belegt sieben aufeinanderfolgende Adressen, z. B. **1.001–1.007**.
5. In der Timer-App dasselbe Netzwerkuniversum und die Startadresse einstellen und den sACN-/Art-Net-Schalter einschalten. Den Netzwerk-Output am Pult separat aktivieren; der Fixture-Import konfiguriert keine Netzwerkverbindung.

Das ZIP-Paket enthält den passenden USB-Ordnerbaum: den enthaltenen Ordner `grandMA3` auf den USB-Stick kopieren.

## Attribute

Die Attribute liegen in der Feature-Gruppe **Control**, unter TimerTransport, TimerDuration und TimerOutput. Alle Kanäle sind 8-Bit, `Snap=Yes`, `Master=None`, ohne Highlight-Wert. Es gibt keinen Dimmer-Kanal; Befehle sollen nicht vom Grand Master skaliert werden. Die tatsächliche Übernahme dieser Eigenschaften beim Import ist am Pult zu prüfen.

| Kanal | Attribut | Standard | Funktion / rohe DMX-Werte |
| --- | --- | --- | --- |
| 1 | TimerCommand | 0 | Neutral 0–31; Start/Resume 32–95; Pause 96–159; Reset 160–223; Black Override 224–255 |
| 2 | TimerHours | 0 | 0–99 Stunden, einzelne benannte Channel Sets |
| 3 | TimerMinutes | 5 | 0–59 Minuten, einzelne benannte Channel Sets |
| 4 | TimerSeconds | 0 | 0–59 Sekunden, einzelne benannte Channel Sets |
| 5 | TimerLoad | 0 | Ready 0–127; Load Time 128–255 |
| 6 | TimerOutput | 0 | Timer 0–63; Clock 64–127; Black 128–191; Test 192–255 |
| 7 | TimerBrightness | 255 | Volle Helligkeit als Standard; App begrenzt auf mindestens 10 % |

Die Zeitwerte sind **keine Prozentangaben**. Am einfachsten die benannten Channel Sets im Calculator wählen oder auf DMX-Readout umschalten. Die Zahlen 00–59 bzw. 00–99 entsprechen direkt den Zeitwerten. Werte darüber sind als „Clamped“ gekennzeichnet, weil die App sie begrenzt. Die Helligkeit wird in der App auf ganze Prozent gerundet.

## Erste Cue-Folge: 5 Minuten

Alle sieben Attribute explizit speichern. Fade und Delay auf 0. Mindestens 0,1 s zwischen Vorbereitung, Laden und Start lassen, damit jeder Zustand übertragen wird.

| Cue | Command | Hours | Minutes | Seconds | Load | Output | Brightness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Prepare | Neutral | 00 | 05 | 00 | Ready | Timer | 100 % |
| Load | Neutral | 00 | 05 | 00 | Load Time | Timer | 100 % |
| Go | Start Resume | 00 | 05 | 00 | Ready | Timer | 100 % |
| Pause | Pause | 00 | 05 | 00 | Ready | Timer | 100 % |
| Continue | Start Resume | 00 | 05 | 00 | Ready | Timer | 100 % |
| Reset | Reset | 00 | 05 | 00 | Ready | Timer | 100 % |

Ein gehaltener Start-Befehl startet nicht erneut. Vor einem erneuten gleichen Befehl einmal Neutral senden. Load muss vor der nächsten Zeitübernahme erst auf Ready zurückkehren. Load pausiert den Timer. Nicht einfach Hours/Minutes/Seconds ändern und erwarten, dass die laufende Zeit springt.

Zum Abdunkeln vorzugsweise **TimerOutput → Black** nutzen. **Black Override** auf TimerCommand hat Vorrang und erfordert zum Verlassen zusätzlich einen Wechsel auf dem Output-Kanal (z. B. Clock, danach Timer).

## Was dieses Fixture nicht steuert

Logo, Nachrichten, Wasserzeichen und den lokalen Netzwerk-An/Aus-Schalter bedienst du weiterhin in der App. Dafür sind im bestehenden 7-Kanal-Protokoll keine DMX-Kanäle vorgesehen.

## Validierung

- GDTF 1.2 XML gegen das XSD des GDTF/MVR-Entwicklerprojekts validiert.
- ZIP-Inhalt, interne Referenzen, sieben Offsets und sichere Standardwerte geprüft.
- Alle Stunden-/Minuten-/Sekunden-Channel-Sets und Steuerbefehle gegen den tatsächlichen App-Empfänger geprüft.
- Noch kein bestätigter Import- oder Hardwaretest in grandMA3 2.5.1.0. Eigene Attribute und Snap/Master-Verhalten nach dem Import zunächst in einer Testshow prüfen.

Neu erstellen: `python3 scripts/build_fixture.py`
Profilprüfung: `python3 scripts/check_fixture.py`
Schema separat herunterladen: https://raw.githubusercontent.com/mvrdevelopment/tools/main/gdtf.xsd
XML prüfen: `xmllint --noout --schema /pfad/gdtf.xsd fixtures/description.xml`

## Quellen

- [Aktuelle grandMA3-Version](https://www.malighting.com/downloads/products/grandma3/)
- [MA-Anleitung: GDTF-Import in 2.5](https://help.malighting.com/grandMA3/2.5/HTML/ft_import_gdtf.html)
- [GDTF-Spezifikation](https://gdtf-development.com/help/developers/gdtf_1_2/file-format-definition/index.html)
- [GDTF-XSD](https://github.com/mvrdevelopment/tools/blob/main/gdtf.xsd)
