import { combineRgb } from '@companion-module/base'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const GRAY = combineRgb(45, 50, 58)
const BLUE = combineRgb(25, 75, 145)
const AMBER = combineRgb(190, 115, 0)
const RED = combineRgb(155, 25, 25)

export function updatePresets(self) {
	const presets = {
		time: button('Remaining time', '$(this:remaining)', GRAY, [], [feedback('overtime')]),
		toggle: button('Start / pause', 'START\nPAUSE', BLUE, [action('toggle')], [feedback('running')]),
		start: button('Start', 'START', BLUE, [action('start')], [feedback('running')]),
		pause: button('Pause', 'PAUSE', AMBER, [action('pause')]),
		reset: button('Reset', 'RESET', RED, [action('reset')]),
		minus_5: button('Subtract 5 minutes', '-5 MIN', GRAY, [action('jog', { seconds: -300 })]),
		minus_1: button('Subtract 1 minute', '-1 MIN', GRAY, [action('jog', { seconds: -60 })]),
		plus_1: button('Add 1 minute', '+1 MIN', GRAY, [action('jog', { seconds: 60 })]),
		plus_5: button('Add 5 minutes', '+5 MIN', GRAY, [action('jog', { seconds: 300 })]),
		clear_message: button('Clear message', 'CLEAR\nMESSAGE', GRAY, [action('clear_message')]),
	}

	for (let index = 0; index < 9; index++) {
		presets[`preset_${index + 1}`] = button(
			`Load preset ${index + 1}`,
			`P${index + 1}\n$(this:preset_${index + 1})`,
			GRAY,
			[action('load_preset', { index })],
			[feedback('preset_loaded', { index })],
		)
	}

	for (const [mode, label] of [
		['timer', 'TIMER'],
		['clock', 'CLOCK'],
		['black', 'BLACK'],
		['test', 'TEST'],
	]) {
		presets[`mode_${mode}`] = button(
			`${label} output`,
			label,
			mode === 'black' ? BLACK : GRAY,
			[action('mode', { mode })],
			[feedback('mode', { mode })],
		)
	}

	const structure = [
		section('transport', 'Transport', ['time', 'toggle', 'start', 'pause', 'reset']),
		section(
			'timer-presets',
			'Timer presets',
			Array.from({ length: 9 }, (_, index) => `preset_${index + 1}`),
		),
		section('adjust', 'Adjust time', ['minus_5', 'minus_1', 'plus_1', 'plus_5']),
		section('output', 'Output', ['mode_timer', 'mode_clock', 'mode_black', 'mode_test']),
		section('messages', 'Messages', ['clear_message']),
	]
	self.setPresetDefinitions(structure, presets)
}

function button(name, text, bgcolor, actions, feedbacks = []) {
	return {
		type: 'simple',
		name,
		style: { text, size: 'auto', color: WHITE, bgcolor },
		steps: [{ down: actions, up: [] }],
		feedbacks,
	}
}

function action(actionId, options = {}) {
	return { actionId, options }
}

function feedback(feedbackId, options = {}) {
	return { feedbackId, options }
}

function section(id, name, presets) {
	return { id, name, definitions: [{ id: `${id}-buttons`, name, type: 'simple', presets }] }
}
