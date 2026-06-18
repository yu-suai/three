import { MathUtils, Vector3 } from 'three'

export const patrol_point_2_vec3_ = (point, fallbackY = 0) => {
	if (point instanceof Vector3) return point.clone()
	if (Array.isArray(point)) {
		return new Vector3(
			Number(point[0] || 0),
			Number(point.length > 1 ? point[1] : fallbackY),
			Number(point.length > 2 ? point[2] : 0),
		)
	}
	if (point && typeof point === 'object') {
		return new Vector3(
			Number(point.x || 0),
			Number(point.y ?? fallbackY),
			Number(point.z || 0),
		)
	}
	return new Vector3(0, fallbackY, 0)
}

const createPointMeta = (index, meta = null) => Object.assign({
	id: String(index + 1),
	name: `P${index + 1}`,
}, meta || {})

export class RouteModel {
	constructor(points = [], opts = {}) {
		this.fallbackY_ = Number(opts.fallbackY ?? 0)
		this.points = []
		this.meta = []
		this.segmentLengths = []
		this.totalLength = 0
		this.setPoints(points, opts.meta || [])
	}

	get length() {
		return this.totalLength
	}

	get pointCount() {
		return this.points.length
	}

	setPoints(points = [], meta = []) {
		this.points = points.map(point => patrol_point_2_vec3_(point, this.fallbackY_))
		this.meta = this.points.map((point, index) => createPointMeta(index, meta[index]))
		this.recalc()
		return this
	}

	setMeta(index, patch = {}) {
		if (!this.meta[index]) return this
		this.meta[index] = Object.assign({}, this.meta[index], patch)
		return this
	}

	insertPoint(index, point, meta = null) {
		const safeIndex = MathUtils.clamp(Number(index), 0, this.points.length)
		this.points.splice(safeIndex, 0, patrol_point_2_vec3_(point, this.fallbackY_))
		this.meta.splice(safeIndex, 0, createPointMeta(safeIndex, meta))
		this.normalizeMeta_()
		this.recalc()
		return safeIndex
	}

	addPoint(point, meta = null) {
		return this.insertPoint(this.points.length, point, meta)
	}

	removePoint(index) {
		if (index < 0 || index >= this.points.length) return null
		const removed = {
			point: this.points.splice(index, 1)[0],
			meta: this.meta.splice(index, 1)[0],
		}
		this.normalizeMeta_()
		this.recalc()
		return removed
	}

	movePoint(index, point) {
		if (index < 0 || index >= this.points.length) return false
		this.points[index].copy(patrol_point_2_vec3_(point, this.fallbackY_))
		this.recalc()
		return true
	}

	renamePoint(index, name) {
		return this.setMeta(index, { name })
	}

	recalc() {
		this.segmentLengths = []
		this.totalLength = 0
		for (let index = 0; index < this.points.length - 1; index += 1) {
			const len = this.points[index].distanceTo(this.points[index + 1])
			this.segmentLengths.push(len)
			this.totalLength += len
		}
		return this
	}

	getPointAtDistance(distance = 0) {
		if (!this.points.length) return null
		if (this.points.length === 1) {
			return {
				position: this.points[0].clone(),
				next: null,
				direction: new Vector3(0, 0, 1),
				segmentIndex: 0,
				segmentProgress: 1,
				distance: 0,
				progress: 1,
				currentMeta: this.meta[0] || null,
				nextMeta: null,
			}
		}

		const safeDistance = MathUtils.clamp(Number(distance || 0), 0, this.totalLength)
		let currentDistance = 0
		for (let index = 0; index < this.segmentLengths.length; index += 1) {
			const segLen = this.segmentLengths[index]
			if (currentDistance + segLen >= safeDistance || index === this.segmentLengths.length - 1) {
				const segmentProgress = segLen <= 0 ? 0 : MathUtils.clamp((safeDistance - currentDistance) / segLen, 0, 1)
				const position = new Vector3().lerpVectors(this.points[index], this.points[index + 1], segmentProgress)
				const direction = new Vector3().subVectors(this.points[index + 1], this.points[index])
				if (direction.lengthSq() < 1e-8 && index > 0) direction.subVectors(this.points[index], this.points[index - 1])
				if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1)
				direction.normalize()

				return {
					position,
					next: this.points[index + 1].clone(),
					direction,
					segmentIndex: index,
					segmentProgress,
					distance: safeDistance,
					progress: this.totalLength > 0 ? safeDistance / this.totalLength : 1,
					currentMeta: this.meta[index] || null,
					nextMeta: this.meta[index + 1] || null,
				}
			}
			currentDistance += segLen
		}

		const lastIndex = this.points.length - 1
		const prevIndex = Math.max(0, lastIndex - 1)
		const direction = new Vector3().subVectors(this.points[lastIndex], this.points[prevIndex])
		if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1)
		return {
			position: this.points[lastIndex].clone(),
			next: null,
			direction: direction.normalize(),
			segmentIndex: Math.max(0, lastIndex - 1),
			segmentProgress: 1,
			distance: this.totalLength,
			progress: 1,
			currentMeta: this.meta[lastIndex] || null,
			nextMeta: null,
		}
	}

	getPointByPercent(percent = 0) {
		return this.getPointAtDistance(this.totalLength * MathUtils.clamp(Number(percent || 0), 0, 1))
	}

	getNearestPointIndex(point) {
		const v = patrol_point_2_vec3_(point, this.fallbackY_)
		let index0 = -1
		let distance0 = Infinity
		this.points.forEach((p, index) => {
			const dist = p.distanceTo(v)
			if (dist < distance0) {
				distance0 = dist
				index0 = index
			}
		})
		return index0
	}

	toJSON(opts = {}) {
		const precision = Number(opts.precision ?? 4)
		const fixed = value => Number(Number(value || 0).toFixed(precision))
		return {
			unit: opts.unit || 'meter',
			totalLength: fixed(this.totalLength),
			points: this.points.map((point, index) => ({
				id: this.meta[index]?.id || String(index + 1),
				name: this.meta[index]?.name || `P${index + 1}`,
				x: fixed(point.x),
				y: fixed(point.y),
				z: fixed(point.z),
			})),
		}
	}

	clone() {
		return new RouteModel(this.points, {
			fallbackY: this.fallbackY_,
			meta: this.meta.map(item => Object.assign({}, item)),
		})
	}

	normalizeMeta_() {
		this.meta = this.points.map((point, index) => createPointMeta(index, this.meta[index]))
		return this
	}
}
