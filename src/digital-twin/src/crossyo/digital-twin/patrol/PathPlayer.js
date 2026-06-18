import { MathUtils } from 'three'
import { PatrolEventDispatcher } from './PatrolEventDispatcher'
import { RouteModel } from './RouteModel'

export class PathPlayer extends PatrolEventDispatcher {
	constructor(route = null, opts = {}) {
		super()
		this.route = route instanceof RouteModel ? route : new RouteModel(route || [])
		this.speed = Number(opts.speed ?? 1)
		this.distance = Number(opts.distance ?? 0)
		this.state = 'idle'
		this.loop = !!opts.loop
		this.waitUntil_ = 0
		this.prevSegmentIndex_ = -1
		this.resetOnStart_ = opts.resetOnStart !== false
	}

	setRoute(route) {
		this.route = route instanceof RouteModel ? route : new RouteModel(route || [])
		this.seekByDistance(Math.min(this.distance, this.route.totalLength), false)
		this.emit('routeChange', this.getState())
		return this
	}

	setSpeed(speed) {
		this.speed = Math.max(0, Number(speed || 0))
		this.emit('speedChange', this.getState())
		return this
	}

	start(opts = {}) {
		if (this.route.pointCount < 2) return false
		if (opts.reset || (this.resetOnStart_ && this.distance >= this.route.totalLength)) {
			this.distance = 0
		}
		this.waitUntil_ = 0
		this.state = 'playing'
		this.emit('start', this.getState())
		this.emit('stateChange', this.getState())
		return true
	}

	pause() {
		if (this.state === 'playing' || this.state === 'waiting') {
			this.state = 'paused'
			this.waitUntil_ = 0
			this.emit('pause', this.getState())
			this.emit('stateChange', this.getState())
		}
		return this
	}

	resume() {
		if (this.state === 'paused') {
			this.state = 'playing'
			this.emit('resume', this.getState())
			this.emit('stateChange', this.getState())
		}
		return this
	}

	stop() {
		this.state = 'stopped'
		this.waitUntil_ = 0
		this.emit('stop', this.getState())
		this.emit('stateChange', this.getState())
		return this
	}

	reset() {
		this.distance = 0
		this.state = 'idle'
		this.waitUntil_ = 0
		this.prevSegmentIndex_ = -1
		this.emit('reset', this.getState())
		this.emit('stateChange', this.getState())
		return this
	}

	wait(seconds = 0) {
		const duration = Math.max(0, Number(seconds || 0))
		if (duration <= 0) return this
		this.waitUntil_ = this.now_() + duration * 1000
		if (this.state === 'playing') this.state = 'waiting'
		this.emit('wait', this.getState())
		this.emit('stateChange', this.getState())
		return this
	}

	seekByDistance(distance = 0, emit = true) {
		this.distance = MathUtils.clamp(Number(distance || 0), 0, this.route.totalLength)
		const state = this.getState()
		if (emit) this.emitProgress_(state)
		return state
	}

	seekByPercent(percent = 0) {
		return this.seekByDistance(this.route.totalLength * MathUtils.clamp(Number(percent || 0), 0, 1))
	}

	update(deltaSeconds = 0) {
		if (this.state !== 'playing' && this.state !== 'waiting') return this.getState()

		if (this.state === 'waiting') {
			if (this.now_() < this.waitUntil_) {
				const state = this.getState()
				this.emit('progress', state)
				return state
			}
			this.waitUntil_ = 0
			this.state = 'playing'
			this.emit('resume', this.getState())
			this.emit('stateChange', this.getState())
		}

		this.distance += Math.max(0, Number(deltaSeconds || 0)) * this.speed
		if (this.distance >= this.route.totalLength) {
			if (this.loop && this.route.totalLength > 0) {
				this.distance = this.distance % this.route.totalLength
			} else {
				this.distance = this.route.totalLength
				this.state = 'completed'
				const completedState = this.getState()
				this.emitProgress_(completedState)
				this.emit('completed', completedState)
				this.emit('stateChange', completedState)
				return completedState
			}
		}

		const state = this.getState()
		this.emitProgress_(state)
		return state
	}

	getState() {
		const sample = this.route.getPointAtDistance(this.distance)
		return Object.assign({
			state: this.state,
			distance: this.distance,
			totalLength: this.route.totalLength,
			progress: this.route.totalLength > 0 ? this.distance / this.route.totalLength : 0,
			progressPercent: this.route.totalLength > 0 ? this.distance / this.route.totalLength * 100 : 0,
			speed: this.speed,
			pointCount: this.route.pointCount,
			waiting: this.state === 'waiting',
			waitRemain: this.state === 'waiting' ? Math.max(0, (this.waitUntil_ - this.now_()) / 1000) : 0,
		}, sample || {})
	}

	emitProgress_(state) {
		if (state.segmentIndex !== this.prevSegmentIndex_) {
			this.prevSegmentIndex_ = state.segmentIndex
			this.emit('segmentChange', state)
		}
		this.emit('progress', state)
	}

	now_() {
		if (typeof performance !== 'undefined' && performance.now) return performance.now()
		return Date.now()
	}
}
