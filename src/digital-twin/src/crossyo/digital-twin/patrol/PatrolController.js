import { Quaternion, Vector3 } from 'three'
import { PatrolEventDispatcher } from './PatrolEventDispatcher'
import { RouteModel } from './RouteModel'
import { OBJRouteParser } from './OBJRouteParser'
import { PathPlayer } from './PathPlayer'
import { InspectionVolumeDetector } from './InspectionVolumeDetector'
import { InspectionDeviceRegistry } from './InspectionDeviceRegistry'
import { MiniMapRenderer } from './MiniMapRenderer'
import { RouteEditor } from './RouteEditor'
import { PatrolActionRegistry } from './PatrolActionRegistry'

export class PatrolController extends PatrolEventDispatcher {
	constructor(viewerOrOpts = null, opts = null) {
		super()
		const options = opts || viewerOrOpts || {}
		const viewer = opts ? viewerOrOpts : options.viewer || null

		this.viewer = viewer
		this.scene = options.scene || viewer?.scene_ || viewer?.scene || null
		this.camera = options.camera || viewer?.camera_ || viewer?.camera || null
		this.renderer = options.renderer || viewer?.renderer_ || viewer?.renderer || null
		this.controls = options.controls || viewer?.controls_ || viewer?.controls || null
		this.actor = options.actor || null
		this.actorForwardAxis = (options.actorForwardAxis || new Vector3(0, 0, 1)).clone?.() || new Vector3(0, 0, 1)
		this.actorYOffset = Number(options.actorYOffset ?? 0)
		this.syncActorY = options.syncActorY !== false
		this.detectorEnabled = options.detectorEnabled !== false
		this.oncePerDevicePerRun = options.oncePerDevicePerRun !== false
		this.hitCooldown = Math.max(0, Number(options.hitCooldown ?? options.rayCooldown ?? 0))

		const routeInput = options.route instanceof RouteModel
			? options.route
			: new RouteModel(options.route?.points || options.points || [], {
				fallbackY: Number(options.route?.fallbackY ?? options.fallbackY ?? 0),
				meta: options.route?.meta || options.pointMeta || [],
			})

		this.route = routeInput
		this.player = new PathPlayer(this.route, {
			speed: Number(options.speed ?? 1),
			loop: !!options.loop,
			resetOnStart: options.resetOnStart,
		})
		this.detector = options.detector instanceof InspectionVolumeDetector
			? options.detector
			: new InspectionVolumeDetector(Object.assign({}, options.detector || {}, options.range || {}))
		this.devices = options.devices instanceof InspectionDeviceRegistry
			? options.devices
			: new InspectionDeviceRegistry(options.devices || [])
		this.actions = options.actions instanceof PatrolActionRegistry
			? options.actions
			: new PatrolActionRegistry(options.actions || {})

		this.inspectedDeviceIds = new Set()
		this.hitDeviceIds = new Set()
		this.lastDeviceHitTime = new Map()
		this.logs = []
		this.miniMap = null
		this.routeEditor = null
		this.lastState_ = this.player.getState()
		this.bindPlayer_()
		this.syncActor_(this.lastState_)
	}

	loadRoute(pointsOrRoute, meta = []) {
		this.route = pointsOrRoute instanceof RouteModel ? pointsOrRoute : new RouteModel(pointsOrRoute || [], { meta })
		this.player.setRoute(this.route)
		if (this.miniMap) this.miniMap.setRoute(this.route)
		if (this.routeEditor) this.routeEditor.setRoute(this.route)
		this.emit('routeChange', this.getState())
		return this
	}

	loadRouteFromOBJ(objText, opts = {}) {
		return this.loadRoute(OBJRouteParser.parse(objText, opts))
	}

	setActor(actor, opts = {}) {
		this.actor = actor
		if (opts.actorForwardAxis) this.actorForwardAxis = opts.actorForwardAxis.clone()
		if (typeof opts.actorYOffset === 'number') this.actorYOffset = opts.actorYOffset
		this.syncActor_(this.player.getState())
		return this
	}

	setDevices(devices = []) {
		this.devices.setDevices(devices)
		this.emit('devicesChange', this.devices.getAll())
		return this
	}

	addDevice(device) {
		const added = this.devices.addDevice(device)
		this.emit('devicesChange', this.devices.getAll())
		return added
	}

	updateDevice(id, patch = {}) {
		const updated = this.devices.updateDevice(id, patch)
		this.emit('devicesChange', this.devices.getAll())
		return updated
	}

	removeDevice(id) {
		const removed = this.devices.removeDevice(id)
		this.emit('devicesChange', this.devices.getAll())
		return removed
	}

	registerAction(name, handler) {
		this.actions.register(name, handler)
		return this
	}

	unregisterAction(name) {
		this.actions.unregister(name)
		return this
	}

	start(opts = {}) {
		if (opts.clearSession !== false && (!this.player.distance || this.player.distance >= this.route.totalLength)) {
			this.clearSession()
		}
		return this.player.start(opts)
	}

	pause() {
		this.player.pause()
		return this
	}

	resume() {
		this.player.resume()
		return this
	}

	reset() {
		this.player.reset()
		this.clearSession()
		this.syncActor_(this.player.getState())
		this.renderMiniMap_()
		return this
	}

	stop() {
		this.player.stop()
		return this
	}

	setSpeed(speed) {
		this.player.setSpeed(speed)
		return this
	}

	seekByDistance(distance) {
		const state = this.player.seekByDistance(distance)
		this.syncActor_(state)
		this.renderMiniMap_()
		return state
	}

	seekByPercent(percent) {
		const state = this.player.seekByPercent(percent)
		this.syncActor_(state)
		this.renderMiniMap_()
		return state
	}

	setRange(range = {}) {
		this.detector.setRange(range)
		if (this.miniMap) this.miniMap.setRange(this.detector.getRange())
		this.emit('rangeChange', this.detector.getRange())
		this.renderMiniMap_()
		return this
	}

	setDetectorEnabled(enabled) {
		this.detectorEnabled = !!enabled
		this.detector.setEnabled(enabled)
		return this
	}

	update(deltaSeconds = 0) {
		return this.player.update(deltaSeconds)
	}

	getState() {
		return Object.assign({}, this.player.getState(), {
			hitCount: this.hitDeviceIds.size,
			inspectedDeviceIds: Array.from(this.inspectedDeviceIds),
			hitDeviceIds: Array.from(this.hitDeviceIds),
			devices: this.devices.getAll(),
			range: this.detector.getRange(),
			logs: this.logs.slice(),
		})
	}

	clearSession() {
		this.inspectedDeviceIds.clear()
		this.hitDeviceIds.clear()
		this.lastDeviceHitTime.clear()
		this.logs = []
		this.emit('sessionClear', this.getState())
		return this
	}

	getRouteDevices(opts = {}) {
		const sampleStep = Math.max(0.5, Number(opts.sampleStep || 1))
		const routeDevices = new Map()
		for (let distance = 0; distance <= this.route.totalLength; distance += sampleStep) {
			const sample = this.route.getPointAtDistance(distance)
			if (!sample) continue
			const hits = this.detector.detect({
				origin: sample.position,
				forward: sample.direction,
				targets: this.devices.getTargets({ onlyInspectable: opts.onlyInspectable !== false }),
				range: opts.range,
			})
			hits.forEach(hit => {
				const device = hit.device
				if (!device || routeDevices.has(device.id)) return
				routeDevices.set(device.id, {
					device,
					deviceId: device.id,
					name: device.name,
					action: device.action,
					routeDistance: distance,
					segmentIndex: sample.segmentIndex,
					pauseOnHit: device.pauseOnHit,
					pauseSeconds: device.pauseSeconds,
					skipPause: device.skipPause,
				})
			})
		}
		return Array.from(routeDevices.values())
	}

	getInspectedDevices() {
		return Array.from(this.inspectedDeviceIds).map(id => this.devices.getDevice(id)).filter(Boolean)
	}

	getUninspectedDevices() {
		return this.devices.getInspectable().filter(device => !this.inspectedDeviceIds.has(device.id))
	}

	getDeviceActions() {
		return this.devices.getAll().map(device => ({
			deviceId: device.id,
			name: device.name,
			action: device.action,
			pauseOnHit: device.pauseOnHit,
			pauseSeconds: device.pauseSeconds,
			skipPause: device.skipPause,
		}))
	}

	createMiniMap(opts = {}) {
		this.miniMap = new MiniMapRenderer(Object.assign({}, opts, {
			route: this.route,
			distance: this.player.distance,
			range: this.detector.getRange(),
		}))
		this.renderMiniMap_()
		return this.miniMap
	}

	createRouteEditor(opts = {}) {
		this.routeEditor = new RouteEditor(Object.assign({
			route: this.route,
			scene: this.scene,
			camera: this.camera,
			domElement: this.renderer?.domElement,
			controls: this.controls,
		}, opts))
		this.routeEditor.on('routeChange', () => {
			this.route.recalc()
			this.player.setRoute(this.route)
			if (this.miniMap) this.miniMap.setRoute(this.route)
			this.emit('routeChange', this.getState())
		})
		return this.routeEditor
	}

	exportConfig(opts = {}) {
		return {
			id: opts.id || 'patrol_config',
			name: opts.name || '巡检配置',
			unit: opts.unit || 'meter',
			createdAt: new Date().toISOString(),
			range: this.detector.getRange(),
			oncePerDevicePerRun: this.oncePerDevicePerRun,
			devices: this.devices.toJSON(opts),
			route: this.route.toJSON(opts),
		}
	}

	dispose() {
		this.routeEditor?.dispose?.()
		this.player.removeAllListeners()
		this.removeAllListeners()
		this.miniMap = null
	}

	bindPlayer_() {
		const reEmit = type => this.player.on(type, state => this.emit(type, this.decorateState_(state)))
		;['start', 'pause', 'resume', 'stop', 'reset', 'completed', 'stateChange', 'speedChange', 'segmentChange', 'wait'].forEach(reEmit)
		this.player.on('progress', state => {
			this.lastState_ = this.decorateState_(state)
			this.syncActor_(state)
			this.detectByState_(state)
			this.renderMiniMap_()
			this.emit('progress', this.lastState_)
		})
	}

	decorateState_(state) {
		return Object.assign({}, state, {
			hitCount: this.hitDeviceIds.size,
			inspectedDeviceIds: Array.from(this.inspectedDeviceIds),
			hitDeviceIds: Array.from(this.hitDeviceIds),
		})
	}

	syncActor_(state) {
		if (!this.actor || !state?.position) return
		const y = this.syncActorY ? state.position.y + this.actorYOffset : this.actor.position.y
		this.actor.position.set(state.position.x, y, state.position.z)
		if (state.direction && this.actor.quaternion) {
			const dir = state.direction.clone()
			dir.y = 0
			if (dir.lengthSq() > 1e-8) {
				dir.normalize()
				const axis = this.actorForwardAxis.clone()
				if (axis.lengthSq() < 1e-8) axis.set(0, 0, 1)
				axis.normalize()
				this.actor.quaternion.copy(new Quaternion().setFromUnitVectors(axis, dir))
			}
		}
	}

	detectByState_(state) {
		if (!this.detectorEnabled || !state?.position || !state?.direction) return []
		const hits = this.detector.detect({
			origin: state.position,
			forward: state.direction,
			targets: this.devices.getTargets(),
		})
		const now = this.now_()
		hits.forEach(hit => this.handleDeviceHit_(hit, state, now))
		return hits
	}

	handleDeviceHit_(hit, state, now) {
		const device = hit.device
		if (!device?.needInspection) return false
		if (this.oncePerDevicePerRun && this.inspectedDeviceIds.has(device.id)) return false
		const prev = this.lastDeviceHitTime.get(device.id) || 0
		if (this.hitCooldown > 0 && now - prev < this.hitCooldown * 1000) return false

		this.lastDeviceHitTime.set(device.id, now)
		this.inspectedDeviceIds.add(device.id)
		this.hitDeviceIds.add(device.id)

		const event = {
			id: `${device.id}-${Math.round(now)}`,
			device,
			deviceId: device.id,
			name: device.name,
			action: device.action,
			distance: hit.distance,
			routeDistance: state.distance,
			segmentIndex: state.segmentIndex,
			point: hit.point,
			hit,
			state: this.decorateState_(state),
			timestamp: new Date().toISOString(),
		}
		this.logs.unshift(event)
		this.logs = this.logs.slice(0, 200)
		this.emit('deviceHit', event)

		if (device.action && this.actions.has(device.action)) {
			try {
				const result = this.actions.run(device.action, event)
				if (result?.then) {
					result.then(actionResult => this.emit('actionComplete', Object.assign({}, event, { actionResult })))
						.catch(error => this.emit('actionError', Object.assign({}, event, { error })))
				} else {
					this.emit('actionComplete', Object.assign({}, event, { actionResult: result }))
				}
			} catch (error) {
				this.emit('actionError', Object.assign({}, event, { error }))
			}
		}

		if (!device.skipPause && device.pauseOnHit && device.pauseSeconds > 0) {
			this.player.wait(device.pauseSeconds)
		}
		return true
	}

	renderMiniMap_() {
		if (!this.miniMap) return
		const state = this.player.getState()
		this.miniMap
			.setProgress(state.distance)
			.setActor(state.position, state.direction)
			.setRange(this.detector.getRange())
			.render()
	}

	now_() {
		if (typeof performance !== 'undefined' && performance.now) return performance.now()
		return Date.now()
	}
}
