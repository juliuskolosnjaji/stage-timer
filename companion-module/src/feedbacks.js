import { combineRgb } from '@companion-module/base'

export function updateFeedbacks(self) {
	self.setFeedbackDefinitions({
		connected: {
			type: 'boolean',
			name: 'Stage Timer is connected',
			description: 'Changes style while the Stage Timer server is reachable',
			options: [],
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 120, 70) },
			callback: () => self.connected,
		},
		running: {
			type: 'boolean',
			name: 'Timer is running',
			description: 'Changes style while the selected timer is running',
			options: [],
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 150, 80) },
			callback: () => Boolean(self.timerState?.running),
		},
		mode: {
			type: 'boolean',
			name: 'Output mode is active',
			description: 'Changes style when the selected output mode is active',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'timer',
					choices: [
						{ id: 'timer', label: 'Timer' },
						{ id: 'clock', label: 'Clock' },
						{ id: 'black', label: 'Black' },
						{ id: 'test', label: 'Test pattern' },
					],
				},
			],
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(25, 100, 190) },
			callback: (event) => self.timerState?.mode === event.options.mode,
		},
		preset_loaded: {
			type: 'boolean',
			name: 'Stored timer preset is loaded',
			description: 'Changes style when the preset duration is the loaded duration',
			options: [
				{
					type: 'dropdown',
					id: 'index',
					label: 'Preset',
					default: 0,
					choices: Array.from({ length: 9 }, (_, index) => ({ id: index, label: `Preset ${index + 1}` })),
				},
			],
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(25, 100, 190) },
			callback: (event) => {
				const index = Number(event.options.index)
				return self.timerState?.duration === self.timerState?.presets?.[index]
			},
		},
		overtime: {
			type: 'boolean',
			name: 'Timer is in overtime',
			description: 'Changes style after the timer passes zero',
			options: [],
			defaultStyle: { color: combineRgb(255, 255, 255), bgcolor: combineRgb(190, 25, 25) },
			callback: () => Number(self.timerState?.remaining) < 0,
		},
	})
}
