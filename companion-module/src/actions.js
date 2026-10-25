const modeChoices = [
	{ id: 'timer', label: 'Timer' },
	{ id: 'clock', label: 'Clock' },
	{ id: 'black', label: 'Black' },
	{ id: 'test', label: 'Test pattern' },
]

export function updateActions(self) {
	self.setActionDefinitions({
		toggle: simple('Start / pause timer', () => self.sendAction('toggle')),
		start: simple('Start or resume timer', () => self.sendAction('start')),
		pause: simple('Pause timer', () => self.sendAction('pause')),
		reset: simple('Reset timer', () => self.sendAction('reset')),
		load_preset: {
			name: 'Load stored timer preset',
			options: [
				{
					type: 'dropdown',
					id: 'index',
					label: 'Preset',
					default: 0,
					choices: Array.from({ length: 9 }, (_, index) => ({ id: index, label: `Preset ${index + 1}` })),
				},
			],
			callback: (event) => self.sendAction('preset-load', Number(event.options.index)),
		},
		set_duration: {
			name: 'Set timer duration',
			options: [
				{ type: 'number', id: 'hours', label: 'Hours', default: 0, min: 0, max: 99 },
				{ type: 'number', id: 'minutes', label: 'Minutes', default: 5, min: 0, max: 59 },
				{ type: 'number', id: 'seconds', label: 'Seconds', default: 0, min: 0, max: 59 },
			],
			callback: (event) => {
				const seconds =
					Number(event.options.hours) * 3600 + Number(event.options.minutes) * 60 + Number(event.options.seconds)
				return self.sendAction('duration', seconds)
			},
		},
		jog: {
			name: 'Adjust remaining time',
			options: [{ type: 'number', id: 'seconds', label: 'Seconds (+ / -)', default: 60, min: -3600, max: 3600 }],
			callback: (event) => self.sendAction('jog', Number(event.options.seconds)),
		},
		mode: {
			name: 'Set output mode',
			options: [{ type: 'dropdown', id: 'mode', label: 'Mode', default: 'timer', choices: modeChoices }],
			callback: (event) => self.sendAction('mode', event.options.mode),
		},
		message: {
			name: 'Set output message',
			options: [{ type: 'textinput', id: 'message', label: 'Message', default: '', useVariables: true }],
			callback: async (event, context) =>
				self.sendAction('message', await context.parseVariablesInString(event.options.message)),
		},
		clear_message: simple('Clear output message', () => self.sendAction('message', '')),
	})
}

function simple(name, callback) {
	return { name, options: [], callback }
}
