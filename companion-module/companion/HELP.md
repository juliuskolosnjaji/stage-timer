# Stage Timer

This module controls a Stage Timer instance over the local network and supplies ready-made Stream Deck presets with live feedback.

## Configuration

1. Start Stage Timer and note the timer computer's IP address in the control UI.
2. Enter that address as **Host**. Do not include `http://`.
3. Keep port **8181** unless Stage Timer was started with a different `PORT`.
4. Enter the Screen ID. `screen-1` is the main screen. Additional screen IDs are shown in their output URL after `?screen=`.

Companion and Stage Timer must be able to reach each other over TCP on the configured port.

## Presets

- **Transport:** live remaining-time display, Start/Pause, Start, Pause, and Reset.
- **Timer presets:** the nine durations stored in Stage Timer. Button labels follow changes made in the Stage Timer UI.
- **Adjust:** add or subtract one or five minutes.
- **Output:** Timer, Clock, Black, and Test with active-mode feedback.
- **Messages:** clear the current output message.

The module also exposes actions for custom durations, time corrections, output modes, and messages. Variables include remaining time, state, selected screen, mode, and all nine stored preset durations.

## Troubleshooting

- **Connection failure:** verify Stage Timer is running and use the timer computer's LAN address, not `localhost`, when Companion runs on another computer.
- **Wrong screen:** use `screen-1` for the main screen or copy the ID from the desired screen's output URL.
- **Stream Deck not visible:** configure the Stream Deck as a Surface in Companion; this module is the Stage Timer connection.
