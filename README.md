# Stage Timer

Lokale Countdown-App nach den bereitgestellten Vorlagen, mit separater Browser-Ausgabe und grandMA3-Steuerung über sACN oder Art-Net. Keine npm-Abhängigkeiten; Node.js 22 oder neuer.

## Fertige Downloads

Unter **Releases** stehen ein Setup-Assistent für Windows (x64) sowie portable Pakete für Windows (x64), Linux (x64) und macOS (Intel und Apple Silicon) bereit. Unter Windows ist die Datei mit der Endung `-setup.exe` der einfachste Weg; sie erstellt einen Startmenü-Eintrag, optional eine Desktop-Verknüpfung und bringt einen Deinstaller mit. Für die portablen Pakete das Archiv entpacken und **Start Stage Timer.bat**, **start-stage-timer.sh** oder **Start Stage Timer.command** ausführen. Alle Pakete bringen ihre eigene Node.js-Laufzeit mit; eine separate Installation ist nicht nötig. Auf macOS kann beim ersten Start ein Rechtsklick auf die Datei und anschließend **Öffnen** erforderlich sein.

## Start

```sh
npm start
```

Bedienpult: http://localhost:8181 · Screen-Viewer: http://localhost:8181/viewer · Ausgabe: http://localhost:8181/display

Ausgabe auf den zweiten Bildschirm ziehen und „Vollbild“ anklicken. Weitere Geräte im gleichen LAN öffnen `http://<IP-des-Timer-Rechners>:8181/display`. Der Server muss weiterlaufen. Mit Strg+C beenden. Abweichender HTTP-Port: `PORT=8182 npm start`.

Die Uhrzeit kommt vom jeweiligen Anzeigegerät, die Countdowns zentral vom Server. Screens, Presets, geplante Starts und Einstellungen werden in `settings.json` gespeichert. Laufende Timer werden nach einem Neustart nicht automatisch fortgesetzt; ein noch ausstehender geplanter Start bleibt erhalten und wird zum festgelegten Zeitpunkt ausgelöst. War der Server zu diesem Zeitpunkt kurz offline, wird die bereits verstrichene Zeit beim nächsten Start berücksichtigt. Bei Verlust des DMX-Signals läuft der Timer weiter; bei Verlust der Browserverbindung friert die Ausgabe ein und zeigt einen Verbindungshinweis. Der Server stellt den Zustand beim Wiederverbinden wieder her.

## Bedienung

- Dauer eingeben und übernehmen oder eines der neun Presets wählen.
- Start/Pause: Schaltfläche oder Leertaste; Reset: Schaltfläche oder R.
- Strg/⌘ + Preset-Klick speichert die eingegebene Dauer als Preset.
- Zeitkorrektur ±1 / ±5 Minuten funktioniert auch während des Countdowns.
- Über **Screen → Neu** lassen sich mehrere unabhängige Timer anlegen. Jeder Screen erhält einen eigenen Ausgabe-Link, ein frei wählbares Icon, eigene Anzeigeeinstellungen, ein eigenes Logo und einen eigenen Zeitplan.
- Der **Screen-Viewer** zeigt alle Screens als Kacheln mit Icon, Status und Restzeit. Ein Klick öffnet die gewählte Ausgabe in einem eigenen Fenster; das Icon wird über die Icon-Schaltfläche neben der Screen-Auswahl geändert.
- Unter **Geplanter Start** wird die aktuell eingestellte Dauer an einem lokalen Datum mit Uhrzeit automatisch gestartet. Pro Screen kann ein Start geplant oder wieder gelöscht werden.
- Nachrichten erscheinen auf der Ausgabe; ✕ blendet sie aus.
- Timer, Uhr, Black und Testbild stehen als Ausgabemodi bereit.
- Warnschwellen, Stundenanzeige, Hintergrund, Helligkeit, Fortschrittsbalken und Stoppen bei Null sind einstellbar.
- Der Signalton wird im Bedienpult erzeugt. Vor der Show einmal den Testton anklicken, damit der Browser Audio freigibt. Bei mehreren geöffneten Bedienpulten kann der Ton mehrfach ertönen.
- Logo-Upload, Sichtbarkeit, Deckkraft, Skalierung von 5–50 % und Position werden pro Screen unter **Einstellungen → Logo-Wasserzeichen** verwaltet.

## grandMA3 anschließen

DMX steuert immer den ersten, in der Oberfläche mit **DMX** markierten Haupt-Screen. Weitere Screens haben unabhängige Timer und Zeitpläne, werden aber manuell beziehungsweise über ihren geplanten Start gesteuert. So kann das DMX-Ziel nicht durch einen versehentlichen Screen-Wechsel am Bedienpult verändert werden.

1. Timer-Rechner und grandMA3 ins gleiche erreichbare Show-Netz verbinden. Die Rechner-IP steht unten im Bedienpult. Bei mehreren Netzwerkadaptern am besten Unicast verwenden.
2. In der App unter **Einstellungen → grandMA3 / DMX-Eingang** sACN oder Art-Net wählen, Universum und Startadresse setzen. Beispiel: Universum 1, Adresse 1.
3. In grandMA3 unter **DMX Protocols** das entsprechende Protokoll aktivieren und eine Output-Konfiguration für das gewünschte lokale MA-Universum anlegen; den passenden Netzwerkadapter in der Output Configuration wählen. Output aktivieren.
4. sACN: Output Unicast an die IP des Timer-Rechners, sACN-Universum 1, Amount 1. Alternativ Output Multicast. Art-Net: gezieltes Unicast oder Broadcast konfigurieren; Net 0, Sub-Net 0, Universe 0 entspricht App-Universum 1. Automatische ArtPoll-Erkennung wird nicht implementiert.
5. 25 aufeinanderfolgende 8-Bit-Steuerkanäle patchen. Für den Showbetrieb das importierbare Profil `fixtures/StageTimer@Stage_Timer@25CH_v2.0.gdtf` verwenden; siehe [Import-Anleitung](fixtures/IMPORT-grandMA3.md). Es verhindert, dass Grand Master oder Blackout die Steuerbefehle skalieren.
6. Alle Tasterkanäle auf 0 und Helligkeit auf 255 setzen. Im Bedienpult muss der Empfang samt Quell-IP erscheinen.

### 25-Kanal-Patch

| Kanal ab Startadresse | Funktion |
| --- | --- |
| 1–10 | 5, 10, 15 … 50 Minuten laden |
| 11 / 12 | +5 / −5 Minuten |
| 13 / 14 / 15 | Start / Pause / Reset |
| 16 / 17 | +1 / −1 Minute |
| 18 / 19 | +2 / −2 Minuten |
| 20–23 | Timer / Uhr / Black / Testbild |
| 24 | Signalton: 0–127 aus, 128–255 an |
| 25 | Helligkeit: 0 = manuelle Einstellung, 1–255 → 10–100 % |

Alle Tasterkanäle reagieren auf die steigende Flanke: 0–127 ist bereit, 128–255 löst aus. Vor einer Wiederholung muss der Kanal unter 128 zurückkehren. Eine Zeitwahl pausiert den Timer. Korrekturen funktionieren pausiert und laufend. Ton ist ein Pegelkanal. Kanal 25 überschreibt die Helligkeit nur bei Werten über 0; bei 0 gilt die manuelle Einstellung. Gleichzeitige Befehle werden in der Reihenfolge Zeitwahl/Korrektur, Transport, Ausgabe verarbeitet.

### Beispiel: 30 Minuten per Cues starten

Alle Taster zunächst auf 0, Fade und Delay auf 0. Kanal 6 (`TimerPreset30`) kurz auf 255 und zurück auf 0 setzen. Danach Kanal 13 (`TimerStart`) kurz auf 255 und zurück auf 0 setzen. Pause, Weiter und Reset werden genauso über die Kanäle 14, 13 und 15 gepulst. Jeder Zustand muss mindestens ein DMX-Paket lang anliegen.

## Netzwerk und Grenzen

- UDP 5568 (sACN) oder UDP 6454 (Art-Net); HTTP TCP 8181. Eingehende Verbindungen für Node in der lokalen Firewall zulassen.
- App-Universen sind 1-basiert; sACN 1–63999, Art-Net 1–32768. Art-Net auf dem Netzwerk verwendet Port-Address 0–32767.
- Ein Universum und ein Protokoll gleichzeitig. sACN nimmt Daten mit Startcode 0 an; Preview-Pakete werden ignoriert. Synchronisierte sACN-Streams, Per-Address Priority und ArtPoll werden nicht unterstützt.
- Bei mehreren sACN-Sendern gewinnt die höchste Universe-Priorität; Gleichstand wird deterministisch nach Quellkennung aufgelöst, kein HTP-Merge. Quell-Timeout 2,5 Sekunden. Duplikate und alte Sequenzen werden verworfen.
- grandMA3 onPC benötigt freigeschaltete Parameter über entsprechende MA-Hardware auch für Netzwerkausgabe. Eine Konsole oder ein passend freigeschaltetes onPC-System muss DMX tatsächlich senden.
- Die App empfängt direkt Netzwerk-DMX; ein USB-DMX-Treiber wird nicht benötigt und ist nicht enthalten.
- Für ein vertrauenswürdiges lokales Show-Netz ausgelegt: keine Anmeldung oder TLS. Alle Geräte mit Zugriff auf den HTTP-Port können das Bedienpult nutzen.

## Prüfung

`npm test` prüft Timer-Lebenszyklus, Eingabevalidierung, Paketvalidierung, DMX-Flanken, Source-Priorität und echte UDP-Empfangssockets für beide Protokolle. Browserbedienung separat geprüft. Der Test mit einer physischen grandMA3-Konsole steht noch aus.

## Protokoll- und MA-Referenzen

- [ESTA E1.31](https://tsp.esta.org/tsp/documents/docs/ANSI_E1-31-2018.pdf)
- [Art-Net Spezifikation](https://art-net.org.uk/downloads/art-net.pdf)
- [grandMA3 Ethernet DMX](https://help.malighting.com/grandMA3/2.2/HTML/dmx_ethernet.html)
- [grandMA3 Art-Net-Konfiguration](https://help.malighting.com/grandMA3/2.4/HTML/dmx_ethernet_artnet.html)
- [MA-Hardware / Parameterfreischaltung](https://help2.malighting.com/grandMA3/2.4/HTML/qsg_output_dmx.html)

## Steuerung umschalten und Wasserzeichen

Der Schalter in der Netzwerkleiste aktiviert/deaktiviert den DMX-Empfang, ohne Protokoll, Universum oder Startadresse zu löschen. Bei der ersten Aktivierung wird sACN gewählt, sofern bisher kein Protokoll eingestellt war. Ein bereits gewähltes Art-Net bleibt erhalten. Deaktivieren stoppt den UDP-Empfang; der Timer läuft unverändert weiter und lässt sich manuell bedienen. Beim erneuten Aktivieren wird das erste empfangene Paket als neuer Steuerzustand ausgewertet.

Unter Einstellungen lässt sich **DMX-Status auf der Ausgabe anzeigen** aktivieren. Die Ausgabe zeigt manuelle Steuerung oder sACN/Art-Net mit Signalstatus. Das Wasserzeichen kennzeichnet die gewählte Steuerung; „warte auf Signal“ bedeutet, dass keine aktuellen Pakete empfangen werden.

Unter **Logo-Wasserzeichen** PNG, JPEG oder WebP hochladen (Quelldatei bis 10 MB). Das Bild wird im Browser auf maximal 2048 Pixel verkleinert und als PNG gespeichert (maximal 2 MB). Transparenz bei PNG bleibt erhalten. Ein Logo kann unabhängig vom Steuerungsstatus ein-/ausgeblendet werden, mit 5–100 % Deckkraft, 5–50 % Bildbreite und fünf Positionen. Ein weiterer Upload ersetzt das Logo. Logo und Einstellungen bleiben nach Neustarts erhalten. Black und Test blenden beide Wasserzeichen aus.
