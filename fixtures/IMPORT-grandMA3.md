# Stage Timer – grandMA3 Fixture

Datei: **StageTimer@Stage_Timer@25CH_v2.0.gdtf**

Hersteller: **StageTimer** · Fixture: **Stage Timer** · Mode: **25CH**

## Import

1. Die `.gdtf` unverändert auf einen USB-Stick nach `grandMA3/gma3_library/fixturetypes/` kopieren.
2. In grandMA3 **Menu → Patch → Fixture Types → Import** öffnen.
3. USB-Stick auswählen, **StageTimer / Stage Timer** importieren und ein Fixture im Mode **25CH** patchen.
4. Bei Startadresse 1 belegt das Fixture **1.001–1.025**. In der Timer-App dasselbe Universum und dieselbe Startadresse einstellen.
5. sACN oder Art-Net in App und Pult aktivieren. Der Fixture-Import konfiguriert die Netzwerkverbindung nicht.

Das ZIP-Paket enthält den passenden USB-Ordnerbaum. Den enthaltenen Ordner `grandMA3` auf den USB-Stick kopieren.

## Kanalbelegung

Alle Tasterkanäle arbeiten mit **0–127 = Ready** und **128–255 = Trigger**. Nach jedem Auslösen muss der Kanal zuerst auf Ready zurückkehren. Fade und Delay auf 0 setzen.

| Kanal | Attribut | Funktion |
| --- | --- | --- |
| 1–10 | TimerPreset05 … TimerPreset50 | 5, 10, 15 … 50 Minuten laden; Timer pausiert |
| 11 | TimerPlus5 | Verbleibende Zeit +5 Minuten |
| 12 | TimerMinus5 | Verbleibende Zeit −5 Minuten |
| 13 | TimerStart | Start / Weiter |
| 14 | TimerPause | Pause |
| 15 | TimerReset | Auf geladene Dauer zurücksetzen |
| 16 | TimerPlus1 | Verbleibende Zeit +1 Minute |
| 17 | TimerMinus1 | Verbleibende Zeit −1 Minute |
| 18 | TimerPlus2 | Verbleibende Zeit +2 Minuten |
| 19 | TimerMinus2 | Verbleibende Zeit −2 Minuten |
| 20 | OutputTimer | Timer anzeigen |
| 21 | OutputClock | Uhr anzeigen |
| 22 | OutputBlack | Ausgabe schwarz |
| 23 | OutputTest | Testbild anzeigen |
| 24 | TimerSound | 0–127 Signalton aus; 128–255 Signalton bei Ablauf an |
| 25 | TimerBrightness | 0–255 → 10–100 % Helligkeit |

Die Zeitkorrekturen funktionieren im pausierten und laufenden Zustand. Beim laufenden Timer wird die Deadline entsprechend verschoben. Werden mehrere Trigger im selben DMX-Paket aktiviert, verarbeitet die App zuerst Zeitwahl/Korrektur, danach Transport und zuletzt den Ausgabemodus.

Der Ablauf-Signalton entsteht im geöffneten Bedienbrowser. Der Browser muss Audio einmal durch eine Benutzeraktion freigegeben haben; dafür vor der Show **♫** im Bedienpult anklicken. Bei mehreren Bedienpulten kann der Ton mehrfach erklingen.

## Beispiel: 30 Minuten starten

1. Alle Taster auf Ready, Helligkeit auf 255.
2. `TimerPreset30` auf Trigger, mindestens ein DMX-Paket senden, danach zurück auf Ready.
3. `TimerStart` auf Trigger, mindestens ein Paket senden, danach zurück auf Ready.
4. Für Pause und Weiter jeweils `TimerPause` beziehungsweise `TimerStart` pulsen.

Logo, Nachrichten, Wasserzeichen und Netzwerk-An/Aus bleiben lokale App-Einstellungen.

## Validierung

- GDTF-ZIP, interner XML-Verweis und 25 lückenlose Offsets werden automatisch geprüft.
- Sichere Standards: alle Taster Ready, Signalton aus, Helligkeit 100 %.
- Presets, Transport, Ausgabe und Ton wurden gegen den tatsächlichen App-Empfänger geprüft.
- Ein Hardwaretest mit einer physischen grandMA3 steht weiterhin aus.

Neu erstellen: `python3 scripts/build_fixture.py`

Profilprüfung: `python3 scripts/check_fixture.py`
