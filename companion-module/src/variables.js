export function updateVariableDefinitions(self) {
	const definitions = {
		remaining: { name: 'Remaining time (HH:MM:SS)' },
		remaining_seconds: { name: 'Remaining time in seconds' },
		duration: { name: 'Loaded duration (HH:MM:SS)' },
		duration_seconds: { name: 'Loaded duration in seconds' },
		state: { name: 'Timer state' },
		mode: { name: 'Output mode' },
		screen_name: { name: 'Selected screen name' },
		message: { name: 'Current message' },
	}
	for (let index = 1; index <= 9; index++) definitions[`preset_${index}`] = { name: `Preset ${index} duration` }
	self.setVariableDefinitions(definitions)
}

export function updateVariableValues(self) {
	const state = self.timerState
	if (!state) return
	const values = {
		remaining: formatTime(state.remaining),
		remaining_seconds: Math.round(state.remaining),
		duration: formatTime(state.duration),
		duration_seconds: state.duration,
		state: state.running ? 'Running' : state.remaining === state.duration ? 'Ready' : 'Paused',
		mode: state.mode,
		screen_name: state.screenName,
		message: state.message,
	}
	state.presets.forEach((seconds, index) => (values[`preset_${index + 1}`] = formatTime(seconds)))
	self.setVariableValues(values)
}

function formatTime(value) {
	const raw = Number(value) || 0
	const seconds = Math.sign(raw) * Math.ceil(Math.abs(raw))
	const sign = seconds < 0 ? '-' : ''
	const absolute = Math.abs(seconds)
	const hours = Math.floor(absolute / 3600)
	const minutes = Math.floor((absolute % 3600) / 60)
	const remainder = absolute % 60
	return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
