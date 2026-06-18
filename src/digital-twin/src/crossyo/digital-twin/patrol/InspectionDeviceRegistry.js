import { Box3, Vector3 } from 'three'
import { patrol_point_2_vec3_ } from './RouteModel'

const vec3ToArray_ = vector => [vector.x, vector.y, vector.z]

const normalizeSize_ = size => {
	if (size instanceof Vector3) return size.clone()
	if (Array.isArray(size)) return new Vector3(Number(size[0] || 1), Number(size[1] || 1), Number(size[2] || 1))
	if (size && typeof size === 'object') return new Vector3(Number(size.x || 1), Number(size.y || 1), Number(size.z || 1))
	return new Vector3(1, 1, 1)
}

export class InspectionDeviceRegistry {
	constructor(devices = []) {
		this.devices_ = new Map()
		this.setDevices(devices)
	}

	setDevices(devices = []) {
		this.devices_.clear()
		devices.forEach(device => this.addDevice(device))
		return this
	}

	addDevice(device = {}) {
		const normalized = this.normalizeDevice(device)
		this.devices_.set(normalized.id, normalized)
		return normalized
	}

	updateDevice(id, patch = {}) {
		const prev = this.devices_.get(id)
		if (!prev) return null
		const next = this.normalizeDevice(Object.assign({}, prev, patch, { id }))
		this.devices_.set(id, next)
		return next
	}

	removeDevice(id) {
		const device = this.devices_.get(id)
		this.devices_.delete(id)
		return device || null
	}

	getDevice(id) {
		return this.devices_.get(id) || null
	}

	getAll() {
		return Array.from(this.devices_.values())
	}

	getInspectable() {
		return this.getAll().filter(device => device.needInspection)
	}

	getActionDevices(action) {
		return this.getAll().filter(device => device.action === action)
	}

	getTargets(opts = {}) {
		const source = opts.onlyInspectable === false ? this.getAll() : this.getInspectable()
		return source.map(device => ({
			id: device.id,
			device,
			object3D: device.object3D,
			box: device.box,
			position: device.position,
			size: device.size,
		}))
	}

	normalizeDevice(device = {}) {
		const object3D = device.object3D || device.o3d_ || device.mesh || null
		const position = device.position
			? patrol_point_2_vec3_(device.position)
			: device.pos
				? patrol_point_2_vec3_(device.pos)
				: object3D?.position
					? object3D.position.clone()
					: new Vector3()
		const size = normalizeSize_(device.size)
		const id = String(device.id || device.deviceId || device.name || `device_${this.devices_.size + 1}`)
		const needInspection = device.needInspection !== false
		const skipPause = !!device.skipPause && needInspection
		const pauseOnHit = needInspection && !skipPause ? !!device.pauseOnHit : false
		const pauseSeconds = pauseOnHit ? Math.max(0, Number(device.pauseSeconds || 0)) : 0
		const box = device.box instanceof Box3
			? device.box.clone()
			: device.bbx_ instanceof Box3
				? device.bbx_.clone()
				: null

		return Object.assign({}, device, {
			id,
			name: device.name || id,
			type: device.type || '',
			object3D,
			position,
			pos: vec3ToArray_(position),
			size,
			sizeArray: vec3ToArray_(size),
			box,
			needInspection,
			skipPause,
			pauseOnHit,
			pauseSeconds,
			action: device.action || null,
			showLabel: device.showLabel !== false,
			remark: device.remark || '',
			userData: device.userData || {},
		})
	}

	toJSON(opts = {}) {
		const precision = Number(opts.precision ?? 4)
		const fixed = value => Number(Number(value || 0).toFixed(precision))
		return this.getAll().map(device => ({
			id: device.id,
			name: device.name,
			type: device.type,
			pos: [fixed(device.position.x), fixed(device.position.y), fixed(device.position.z)],
			size: [fixed(device.size.x), fixed(device.size.y), fixed(device.size.z)],
			needInspection: device.needInspection,
			showLabel: device.showLabel,
			action: device.action,
			pauseOnHit: device.pauseOnHit,
			pauseSeconds: device.pauseSeconds,
			skipPause: device.skipPause,
			remark: device.remark,
			userData: device.userData,
		}))
	}
}
