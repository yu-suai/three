export class PatrolActionRegistry {
	constructor(actions = {}) {
		this.actions_ = new Map()
		Object.keys(actions || {}).forEach(name => this.register(name, actions[name]))
	}

	register(name, handler) {
		if (!name || typeof handler !== 'function') return this
		this.actions_.set(name, handler)
		return this
	}

	unregister(name) {
		this.actions_.delete(name)
		return this
	}

	get(name) {
		return this.actions_.get(name) || null
	}

	has(name) {
		return this.actions_.has(name)
	}

	run(name, payload) {
		const handler = this.get(name)
		if (!handler) return undefined
		return handler(payload)
	}

	clear() {
		this.actions_.clear()
		return this
	}
}
