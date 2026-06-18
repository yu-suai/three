import { MathUtils, Vector3 } from 'three'
import { RouteModel, patrol_point_2_vec3_ } from './RouteModel'

const DEFAULT_COLORS = {
	backgroundTop: 'rgba(15, 23, 42, 0.98)',
	backgroundBottom: 'rgba(2, 6, 23, 0.98)',
	grid: 'rgba(148, 163, 184, 0.12)',
	route: 'rgba(34, 211, 238, 0.72)',
	progress: 'rgba(163, 230, 53, 0.95)',
	rangeFill: 'rgba(250, 204, 21, 0.20)',
	rangeStroke: 'rgba(250, 204, 21, 0.90)',
	actor: '#facc15',
	start: '#22c55e',
	end: '#ef4444',
	text: 'rgba(226, 232, 240, 0.9)',
}

export class MiniMapRenderer {
	constructor(opts = {}) {
		this.canvas = opts.canvas || null
		this.ctx = null
		this.visible = opts.visible !== false
		this.route = opts.route instanceof RouteModel ? opts.route : new RouteModel(opts.points || [])
		this.distance = Number(opts.distance || 0)
		this.actorPosition = null
		this.actorDirection = new Vector3(0, 0, 1)
		this.range = Object.assign({ depth: 18, width: 12, height: 8 }, opts.range || {})
		this.colors = Object.assign({}, DEFAULT_COLORS, opts.colors || {})
		this.pixelRatio = Number(opts.pixelRatio || this.getPixelRatio_())
		this.padding = Number(opts.padding ?? 22)
		if (this.canvas) this.attach(this.canvas)
	}

	attach(canvas) {
		this.canvas = canvas
		this.ctx = canvas?.getContext ? canvas.getContext('2d') : null
		this.resize()
		this.setVisible(this.visible)
		return this
	}

	setVisible(visible) {
		this.visible = !!visible
		if (this.canvas?.style) this.canvas.style.display = this.visible ? '' : 'none'
		return this
	}

	show() {
		return this.setVisible(true)
	}

	hide() {
		return this.setVisible(false)
	}

	setRoute(route) {
		this.route = route instanceof RouteModel ? route : new RouteModel(route || [])
		return this
	}

	setProgress(distance) {
		this.distance = MathUtils.clamp(Number(distance || 0), 0, this.route.totalLength)
		return this
	}

	setProgressPercent(percent) {
		return this.setProgress(this.route.totalLength * MathUtils.clamp(Number(percent || 0), 0, 1))
	}

	setActor(position, direction = null) {
		this.actorPosition = position ? patrol_point_2_vec3_(position) : null
		if (direction) {
			this.actorDirection = patrol_point_2_vec3_(direction)
			if (this.actorDirection.lengthSq() < 1e-8) this.actorDirection.set(0, 0, 1)
			this.actorDirection.normalize()
		}
		return this
	}

	setRange(range = {}) {
		this.range = Object.assign({}, this.range, range)
		return this
	}

	resize() {
		if (!this.canvas) return this
		const ratio = this.pixelRatio || this.getPixelRatio_()
		const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : null
		const width = Math.max(1, Math.floor((rect?.width || this.canvas.clientWidth || this.canvas.width || 300) * ratio))
		const height = Math.max(1, Math.floor((rect?.height || this.canvas.clientHeight || this.canvas.height || 150) * ratio))
		if (this.canvas.width !== width) this.canvas.width = width
		if (this.canvas.height !== height) this.canvas.height = height
		return this
	}

	render() {
		const canvas = this.canvas
		const ctx = this.ctx
		if (!this.visible || !canvas || !ctx || this.route.pointCount < 2) return this

		this.resize()
		const bounds = this.getBounds_()
		const toMap = (x, z) => this.worldToMap_(x, z, canvas, bounds)

		ctx.clearRect(0, 0, canvas.width, canvas.height)
		this.drawBackground_(ctx, canvas)
		this.drawRoute_(ctx, toMap)
		this.drawRange_(ctx, toMap)
		this.drawActor_(ctx, toMap)
		this.drawProgressText_(ctx, canvas)
		return this
	}

	getBounds_() {
		let minX = Infinity
		let maxX = -Infinity
		let minZ = Infinity
		let maxZ = -Infinity
		this.route.points.forEach(point => {
			minX = Math.min(minX, point.x)
			maxX = Math.max(maxX, point.x)
			minZ = Math.min(minZ, point.z)
			maxZ = Math.max(maxZ, point.z)
		})
		if (this.actorPosition) {
			minX = Math.min(minX, this.actorPosition.x)
			maxX = Math.max(maxX, this.actorPosition.x)
			minZ = Math.min(minZ, this.actorPosition.z)
			maxZ = Math.max(maxZ, this.actorPosition.z)
		}
		const extra = Math.max(20, Number(this.range.depth || 18))
		return { minX: minX - extra, maxX: maxX + extra, minZ: minZ - extra, maxZ: maxZ + extra }
	}

	worldToMap_(x, z, canvas, bounds) {
		const pad = this.padding * this.pixelRatio
		const width = canvas.width - pad * 2
		const height = canvas.height - pad * 2
		const worldW = Math.max(1, bounds.maxX - bounds.minX)
		const worldH = Math.max(1, bounds.maxZ - bounds.minZ)
		const scale = Math.min(width / worldW, height / worldH)
		const usedW = worldW * scale
		const usedH = worldH * scale
		const offsetX = pad + (width - usedW) / 2
		const offsetY = pad + (height - usedH) / 2
		return {
			x: offsetX + (x - bounds.minX) * scale,
			y: offsetY + (bounds.maxZ - z) * scale,
			scale,
		}
	}

	drawBackground_(ctx, canvas) {
		const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
		gradient.addColorStop(0, this.colors.backgroundTop)
		gradient.addColorStop(1, this.colors.backgroundBottom)
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		ctx.save()
		ctx.strokeStyle = this.colors.grid
		ctx.lineWidth = 1
		const grid = 32 * this.pixelRatio
		for (let x = 0; x <= canvas.width; x += grid) {
			ctx.beginPath()
			ctx.moveTo(x, 0)
			ctx.lineTo(x, canvas.height)
			ctx.stroke()
		}
		for (let y = 0; y <= canvas.height; y += grid) {
			ctx.beginPath()
			ctx.moveTo(0, y)
			ctx.lineTo(canvas.width, y)
			ctx.stroke()
		}
		ctx.restore()
	}

	drawRoute_(ctx, toMap) {
		ctx.save()
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.beginPath()
		this.route.points.forEach((point, index) => {
			const mapPoint = toMap(point.x, point.z)
			if (index === 0) ctx.moveTo(mapPoint.x, mapPoint.y)
			else ctx.lineTo(mapPoint.x, mapPoint.y)
		})
		ctx.strokeStyle = this.colors.route
		ctx.lineWidth = 4 * this.pixelRatio
		ctx.stroke()

		if (this.distance > 0) {
			ctx.beginPath()
			let current = 0
			let started = false
			for (let index = 0; index < this.route.points.length - 1; index += 1) {
				const a = this.route.points[index]
				const b = this.route.points[index + 1]
				const segLen = this.route.segmentLengths[index] || a.distanceTo(b)
				if (!started) {
					const start = toMap(a.x, a.z)
					ctx.moveTo(start.x, start.y)
					started = true
				}
				if (current + segLen <= this.distance) {
					const end = toMap(b.x, b.z)
					ctx.lineTo(end.x, end.y)
				} else {
					const t = MathUtils.clamp((this.distance - current) / Math.max(segLen, 0.0001), 0, 1)
					const mid = new Vector3().lerpVectors(a, b, t)
					const currentPoint = toMap(mid.x, mid.z)
					ctx.lineTo(currentPoint.x, currentPoint.y)
					break
				}
				current += segLen
			}
			ctx.strokeStyle = this.colors.progress
			ctx.lineWidth = 5 * this.pixelRatio
			ctx.stroke()
		}

		this.drawPoint_(ctx, toMap(this.route.points[0].x, this.route.points[0].z), this.colors.start, '起')
		const last = this.route.points[this.route.points.length - 1]
		this.drawPoint_(ctx, toMap(last.x, last.z), this.colors.end, '终')
		ctx.restore()
	}

	drawRange_(ctx, toMap) {
		if (!this.actorPosition) return
		const origin = toMap(this.actorPosition.x, this.actorPosition.z)
		const forward = this.actorDirection.clone()
		const depth = Math.max(1, Number(this.range.depth || 18))
		const width = Math.max(1, Number(this.range.width || 12))
		const halfAngle = Math.atan((width / 2) / depth)
		const baseAngle = Math.atan2(-forward.z, forward.x)
		const radius = depth * origin.scale

		ctx.save()
		ctx.beginPath()
		ctx.moveTo(origin.x, origin.y)
		ctx.arc(origin.x, origin.y, radius, baseAngle - halfAngle, baseAngle + halfAngle)
		ctx.closePath()
		ctx.fillStyle = this.colors.rangeFill
		ctx.fill()
		ctx.strokeStyle = this.colors.rangeStroke
		ctx.lineWidth = 2 * this.pixelRatio
		ctx.stroke()
		ctx.restore()
	}

	drawActor_(ctx, toMap) {
		if (!this.actorPosition) return
		const point = toMap(this.actorPosition.x, this.actorPosition.z)
		const angle = Math.atan2(-this.actorDirection.z, this.actorDirection.x)

		ctx.save()
		ctx.translate(point.x, point.y)
		ctx.rotate(angle)
		ctx.beginPath()
		ctx.moveTo(12 * this.pixelRatio, 0)
		ctx.lineTo(-9 * this.pixelRatio, -7 * this.pixelRatio)
		ctx.lineTo(-5 * this.pixelRatio, 0)
		ctx.lineTo(-9 * this.pixelRatio, 7 * this.pixelRatio)
		ctx.closePath()
		ctx.fillStyle = this.colors.actor
		ctx.fill()
		ctx.strokeStyle = 'rgba(15,23,42,0.85)'
		ctx.lineWidth = 2 * this.pixelRatio
		ctx.stroke()
		ctx.restore()

		ctx.save()
		ctx.beginPath()
		ctx.arc(point.x, point.y, 12 * this.pixelRatio, 0, Math.PI * 2)
		ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)'
		ctx.lineWidth = 2 * this.pixelRatio
		ctx.stroke()
		ctx.restore()
	}

	drawPoint_(ctx, point, color, text) {
		ctx.save()
		ctx.beginPath()
		ctx.arc(point.x, point.y, 8 * this.pixelRatio, 0, Math.PI * 2)
		ctx.fillStyle = color
		ctx.fill()
		ctx.font = `bold ${10 * this.pixelRatio}px Microsoft YaHei, Arial`
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillStyle = '#ffffff'
		ctx.fillText(text, point.x, point.y + 0.5 * this.pixelRatio)
		ctx.restore()
	}

	drawProgressText_(ctx, canvas) {
		const percent = this.route.totalLength > 0 ? Math.min(100, this.distance / this.route.totalLength * 100) : 0
		ctx.save()
		ctx.font = `${12 * this.pixelRatio}px Microsoft YaHei, Arial`
		ctx.fillStyle = this.colors.text
		ctx.fillText(`进度 ${percent.toFixed(1)}%`, 14 * this.pixelRatio, canvas.height - 14 * this.pixelRatio)
		ctx.restore()
	}

	getPixelRatio_() {
		if (typeof window !== 'undefined' && window.devicePixelRatio) return Math.min(window.devicePixelRatio, 2)
		return 1
	}
}
