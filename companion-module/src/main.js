import { InstanceBase, InstanceStatus } from '@companion-module/base'
import { updateActions } from './actions.js'
import { updateFeedbacks } from './feedbacks.js'
import { updatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { updateVariableDefinitions, updateVariableValues } from './variables.js'

export { UpgradeScripts }

export default class StageTimerInstance extends InstanceBase {
	timerState = undefined
	connected = false
	connectionStatus = undefined
	pollTimer = undefined
	pollController = undefined
	pollGeneration = 0

	async init(config) {
		await this.configUpdated(config)
	}

	async destroy() {
		this.stopPolling()
	}

	async configUpdated(config) {
		this.stopPolling()
		this.config = { host: '127.0.0.1', port: 8181, screenId: 'screen-1', pollInterval: 250, ...config }
		this.connected = false
		this.connectionStatus = undefined
		this.timerState = undefined
		updateActions(this)
		updateFeedbacks(this)
		updateVariableDefinitions(this)
		updatePresets(this)
		this.updateStatus(InstanceStatus.Connecting)
		await this.poll(this.pollGeneration)
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Stage Timer host',
				width: 6,
				default: '127.0.0.1',
				required: true,
				tooltip: 'IP address or hostname without http://',
			},
			{ type: 'number', id: 'port', label: 'Port', width: 3, default: 8181, min: 1, max: 65535 },
			{
				type: 'textinput',
				id: 'screenId',
				label: 'Screen ID',
				width: 3,
				default: 'screen-1',
				required: true,
				regex: '/^[a-z0-9-]{1,64}$/',
			},
			{
				type: 'number',
				id: 'pollInterval',
				label: 'Status interval (ms)',
				width: 3,
				default: 250,
				min: 100,
				max: 5000,
			},
		]
	}

	stopPolling() {
		this.pollGeneration++
		if (this.pollTimer) clearTimeout(this.pollTimer)
		this.pollTimer = undefined
		this.pollController?.abort()
		this.pollController = undefined
	}

	baseUrl() {
		const host = String(this.config.host)
			.replace(/^https?:\/\//, '')
			.replace(/\/$/, '')
		return `http://${host}:${this.config.port}`
	}

	async poll(generation) {
		const controller = new AbortController()
		this.pollController = controller
		const timeout = setTimeout(() => controller.abort(), 2000)
		try {
			const response = await fetch(`${this.baseUrl()}/api/state?screen=${encodeURIComponent(this.config.screenId)}`, {
				signal: controller.signal,
			})
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			this.timerState = await response.json()
			this.setConnected(true)
			updateVariableValues(this)
			this.checkAllFeedbacks()
		} catch (error) {
			this.setConnected(false, error)
		} finally {
			clearTimeout(timeout)
			if (this.pollController === controller) this.pollController = undefined
			if (generation === this.pollGeneration) {
				this.pollTimer = setTimeout(() => this.poll(generation), Number(this.config.pollInterval) || 250)
			}
		}
	}

	setConnected(connected, error) {
		this.connected = connected
		const status = connected ? 'connected' : 'disconnected'
		if (this.connectionStatus === status) return
		this.connectionStatus = status
		if (connected) this.updateStatus(InstanceStatus.Ok)
		else this.updateStatus(InstanceStatus.ConnectionFailure, error?.message || 'Stage Timer is unreachable')
		this.checkFeedbacks('connected')
	}

	async sendAction(type, value) {
		let response
		try {
			response = await fetch(`${this.baseUrl()}/api/action`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, value, screenId: this.config.screenId }),
			})
		} catch (error) {
			this.setConnected(false, error)
			throw error
		}
		const result = await response.json().catch(() => ({}))
		if (!response.ok) {
			const message = result.error || `HTTP ${response.status}`
			this.log('error', `Stage Timer action failed: ${message}`)
			throw new Error(message)
		}
		this.timerState = result
		this.setConnected(true)
		updateVariableValues(this)
		this.checkAllFeedbacks()
	}
}
