# Stage Timer

Lokale Countdown-App nach den bereitgestellten Vorlagen, mit separater Browser-Ausgabe und grandMA3-Steuerung über sACN oder Art-Net. Keine npm-Abhängigkeiten; Node.js 22 oder neuer.

## Fertige Downloads

Unter **Releases** stehen portable Pakete für Windows (x64), Linux (x64) sowie macOS (Intel und Apple Silicon) bereit. Archiv entpacken und **Start Stage Timer.bat**, **start-stage-timer.sh** oder **Start Stage Timer.command** ausführen. Die Pakete bringen ihre eigene Node.js-Laufzeit mit; eine separate Installation ist nicht nötig. Auf macOS kann beim ersten Start ein Rechtsklick auf die Datei und anschließend **Öffnen** erforderlich sein.

## Start

```sh
npm start
```

Bedienpult: http://localhost:8181 · Ausgabe: http://localhost:8181/display

Ausgabe auf den zweiten Bildschirm ziehen und „Vollbild“ anklicken. Weitere Geräte im gleichen LAN öffnen `http://<IP-des-Timer-Rechners>:8181/display`. Der Server muss weiterlaufen. Mit Strg+C beenden. Abweichender HTTP-Port: `PORT=8182 npm start`.

Die Uhrzeit kommt vom jeweiligen Anzeigegerät, der Countdown zentral vom Server. Presets und Einstellungen werden in `settings.json` gespeichert. Laufende Timer werden nach einem Neustart nicht automatisch fortgesetzt. Bei Verlust des DMX-Signals läuft der Timer weiter; bei Verlust der Browserverbindung friert die Ausgabe ein und zeigt einen Verbindungshinweis. Der Server stellt den Zustand beim Wiederverbinden wieder her.

## Bedienung

- Dauer eingeben und übernehmen oder eines der neun Presets wählen.
- Start/Pause: Schaltfläche oder Leertaste; Reset: Schaltfläche oder R.
- Strg/⌘ + Preset-Klick speichert die eingegebene Dauer als Preset.
- Zeitkorrektur ±1 / ±5 Minuten funktioniert auch während des Countdowns.
- Nachrichten erscheinen auf der Ausgabe; ✕ blendet sie aus.
- Timer, Uhr, Black und Testbild stehen als Ausgabemodi bereit.
- Warnschwellen, Stundenanzeige, Hintergrund, Helligkeit, Fortschrittsbalken und Stoppen bei Null sind einstellbar.
- Der Signalton wird im Bedienpult erzeugt. Vor der Show einmal den Testton anklicken, damit der Browser Audio freigibt. Bei mehreren geöffneten Bedienpulten kann der Ton mehrfach ertönen.

## grandMA3 anschließen

1. Timer-Rechner und grandMA3 ins gleiche erreichbare Show-Netz verbinden. Die Rechner-IP steht unten im Bedienpult. Bei mehreren Netzwerkadaptern am besten Unicast verwenden.
2. In der App unter **Einstellungen → grandMA3 / DMX-Eingang** sACN oder Art-Net wählen, Universum und Startadresse setzen. Beispiel: Universum 1, Adresse 1.
3. In grandMA3 unter **DMX Protocols** das entsprechende Protokoll aktivieren und eine Output-Konfiguration für das gewünschte lokale MA-Universum anlegen; den passenden Netzwerkadapter in der Output Configuration wählen. Output aktivieren.
4. sACN: Output Unicast an die IP des Timer-Rechners, sACN-Universum 1, Amount 1. Alternativ Output Multicast. Art-Net: gezieltes Unicast oder Broadcast konfigurieren; Net 0, Sub-Net 0, Universe 0 entspricht App-Universum 1. Automatische ArtPoll-Erkennung wird nicht implementiert.
5. Sieben aufeinanderfolgende 8-Bit-Steuerkanäle patchen (z. B. eigener Fixture Type mit sieben ungefilterten Steuerattributen). Die Werte unten sind **rohe DMX-Werte, keine Prozentwerte**. Bei Verwendung von sieben Generic-Dimmern beeinflussen Grand Master, Blackout und Dimmer-Master die Werte; für den Showbetrieb einen eigenen Steuer-Fixture-Type verwenden. Ein importierbares GDTF-Profil liegt unter `fixtures/StageTimer@Stage_Timer@7CH_v1.0.gdtf`; siehe [Import-Anleitung](fixtures/IMPORT-grandMA3.md).
6. Kanal für Helligkeit auf 255 setzen, Ausgabemodus auf 0. Im Bedienpult muss der Empfang samt Quell-IP erscheinen.

### 7-Kanal-Patch

| Offset | Bei Adresse 1 | Funktion | DMX-Wert |
| --- | --- | --- | --- |
| +0 | 1 | Befehl | 0–31 neutral; 32–95 Start; 96–159 Pause; 160–223 Reset; 224–255 Black |
| +1 | 2 | Stunden | 0–99, höhere Werte werden auf 99 begrenzt |
| +2 | 3 | Minuten | 0–59, höhere Werte werden auf 59 begrenzt |
| +3 | 4 | Sekunden | 0–59, höhere Werte werden auf 59 begrenzt |
| +4 | 5 | Dauer übernehmen | Wechsel von 0–127 auf 128–255 |
| +5 | 6 | Ausgabemodus | 0–63 Timer; 64–127 Uhr; 128–191 Black; 192–255 Test |
| +6 | 7 | Helligkeit | 0–255 → 10–100 %, Mindesthelligkeit 10 % |

Befehle reagieren auf den Wechsel in einen Wertebereich. Für einen erneuten Start-Befehl zuerst Neutral senden. Zeitübernahme setzt den Timer auf die neue Dauer und pausiert ihn. Gleichzeitige Lade- und Startflanke lädt zuerst und startet danach. Der Black-Befehl hat Vorrang vor dem Ausgabemodus; zum Verlassen Black abwählen und Ausgabekanal ändern. UI-Befehle gelten bis zum nächsten relevanten DMX-Wertwechsel; Helligkeit wird mit jedem Paket übernommen.

### Beispiel: 5 Minuten per Cues starten

Alle Kanäle explizit speichern, Fade und Delay auf 0 setzen (keine Überblendungen auf Steuerkanälen).

| Cue | Befehl | Std | Min | Sek | Laden | Ausgabe | Helligkeit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vorbereiten | 0 | 0 | 5 | 0 | 0 | 0 | 255 |
| Laden | 0 | 0 | 5 | 0 | 255 | 0 | 255 |
| Start | 64 | 0 | 5 | 0 | 0 | 0 | 255 |
| Pause | 128 | 0 | 5 | 0 | 0 | 0 | 255 |
| Weiter | 64 | 0 | 5 | 0 | 0 | 0 | 255 |
| Reset | 192 | 0 | 5 | 0 | 0 | 0 | 255 |

Vorbereiten und Laden jeweils mindestens ca. 0,1 s ausgeben, sodass tatsächlich ein DMX-Paket jeder Flanke übertragen wird. Zum Wiederholen der Show die Vorbereitungs-Cue erneut ausgeben.

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

Der Schalter in der Netzwerkleiste aktiviert/deaktiviert die Netzwerksteuerung, ohne Universum oder Startadresse zu löschen. Bei der ersten Aktivierung wird sACN gewählt, sofern bisher kein Protokoll eingestellt war. Ein bereits gewähltes Art-Net bleibt erhalten. Deaktivieren stoppt den UDP-Empfang; der Timer läuft unverändert weiter und lässt sich manuell bedienen. Beim erneuten Aktivieren wird das erste empfangene Paket als neuer Steuerzustand ausgewertet.

Unter Einstellungen lässt sich **Steuerungsstatus als Wasserzeichen** aktivieren. Die Ausgabe zeigt manuelle Steuerung oder sACN/Art-Net mit Signalstatus. Das Wasserzeichen kennzeichnet die gewählte Steuerung; „warte auf Signal“ bedeutet, dass keine aktuellen Pakete empfangen werden.

Unter **Logo-Wasserzeichen** PNG, JPEG oder WebP hochladen (Quelldatei bis 10 MB). Das Bild wird im Browser auf maximal 2048 Pixel verkleinert und als PNG gespeichert (maximal 2 MB). Transparenz bei PNG bleibt erhalten. Ein Logo kann unabhängig vom Steuerungsstatus ein-/ausgeblendet werden, mit 5–100 % Deckkraft, 5–50 % Bildbreite und fünf Positionen. Ein weiterer Upload ersetzt das Logo. Logo und Einstellungen bleiben nach Neustarts erhalten. Black und Test blenden beide Wasserzeichen aus.
