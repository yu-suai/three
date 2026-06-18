export class PatrolEventDispatcher {
	constructor() {
		this.listeners_ = new Map()
	}

	on(type, listener) {
		if (!type || typeof listener !== 'function') return () => {}
		if (!this.listeners_.has(type)) this.listeners_.set(type, new Set())
		this.listeners_.get(type).add(listener)
		return () => this.off(type, listener)
	}

	off(type, listener) {
		const listeners = this.listeners_.get(type)
		if (!listeners) return this
		listeners.delete(listener)
		if (!listeners.size) this.listeners_.delete(type)
		return this
	}

	once(type, listener) {
		const off = this.on(type, (...args) => {
			off()
			listener(...args)
		})
		return off
	}

	emit(type, payload) {
		const listeners = this.listeners_.get(type)
		if (!listeners) return this
		Array.from(listeners).forEach(listener => listener(payload))
		return this
	}

	removeAllListeners(type = null) {
		if (type) this.listeners_.delete(type)
		else this.listeners_.clear()
		return this
	}
}
