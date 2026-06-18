import { Box3, BoxGeometry, EdgesGeometry, Line, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { patrol_point_2_vec3_ } from './RouteModel'

const DEFAULT_RANGE = {
	type: 'box',
	width: 12,
	height: 8,
	depth: 18,
	baseYOffset: 0.15,
}

const getBoxFromTarget_ = target => {
	if (!target) return null
	if (target.box instanceof Box3) return target.box.clone()
	if (target.bbx_ instanceof Box3) return target.bbx_.clone()
	const object3D = target.object3D || target.o3d_ || target.mesh || target
	if (object3D?.isObject3D) return new Box3().setFromObject(object3D)
	if (target.position || target.pos) {
		const position = patrol_point_2_vec3_(target.position || target.pos)
		let size = target.size || target.sizeArray || [1, 1, 1]
		if (size instanceof Vector3) size = size.clone()
		else if (Array.isArray(size)) size = new Vector3(Number(size[0] || 1), Number(size[1] || 1), Number(size[2] || 1))
		else size = new Vector3(Number(size.x || 1), Number(size.y || 1), Number(size.z || 1))
		return new Box3().setFromCenterAndSize(position, size)
	}
	return null
}

export class InspectionVolumeDetector {
	constructor(opts = {}) {
		this.enabled = opts.enabled !== false
		this.range = Object.assign({}, DEFAULT_RANGE)
		this.setRange(opts.range || opts)
	}

	setEnabled(enabled) {
		this.enabled = !!enabled
		return this
	}

	setRange(range = {}) {
		this.range = Object.assign({}, this.range, range)
		this.range.width = Math.max(0.001, Number(this.range.width || DEFAULT_RANGE.width))
		this.range.height = Math.max(0.001, Number(this.range.height || DEFAULT_RANGE.height))
		this.range.depth = Math.max(0.001, Number(this.range.depth || DEFAULT_RANGE.depth))
		this.range.baseYOffset = Number(this.range.baseYOffset ?? DEFAULT_RANGE.baseYOffset)
		this.range.type = this.range.type || 'box'
		return this
	}

	getRange() {
		return Object.assign({}, this.range)
	}

	detect(opts = {}) {
		if (!this.enabled) return []
		const targets = opts.targets || []
		const axes = this.getAxes(opts)
		const hits = []

		targets.forEach(target => {
			const box = getBoxFromTarget_(target)
			if (!box || box.isEmpty()) return
			if (!this.boxInsideVolume(box, axes)) return
			const center = box.getCenter(new Vector3())
			hits.push({
				target,
				device: target.device || target,
				object3D: target.object3D || target.o3d_ || target.mesh || null,
				box,
				point: center,
				distance: center.distanceTo(axes.base),
			})
		})

		hits.sort((a, b) => a.distance - b.distance)
		return hits
	}

	getAxes(opts = {}) {
		const range = Object.assign({}, this.range, opts.range || {})
		const base = patrol_point_2_vec3_(opts.origin || opts.base || new Vector3())
		base.y += Number(range.baseYOffset || 0)
		const forward = patrol_point_2_vec3_(opts.forward || new Vector3(0, 0, 1))
		forward.y = Number(opts.keepForwardY ? forward.y : 0)
		if (forward.lengthSq() < 1e-8) forward.set(0, 0, 1)
		forward.normalize()
		const up = patrol_point_2_vec3_(opts.up || new Vector3(0, 1, 0))
		if (up.lengthSq() < 1e-8) up.set(0, 1, 0)
		up.normalize()
		const right = new Vector3().crossVectors(forward, up).normalize().multiplyScalar(-1)
		if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
		return {
			base,
			forward,
			up,
			right,
			width: Math.max(0.001, Number(range.width || DEFAULT_RANGE.width)),
			height: Math.max(0.001, Number(range.height || DEFAULT_RANGE.height)),
			depth: Math.max(0.001, Number(range.depth || DEFAULT_RANGE.depth)),
			type: range.type || 'box',
		}
	}

	pointInsideVolume(point, axes) {
		const offset = new Vector3().subVectors(point, axes.base)
		const x = offset.dot(axes.right)
		const y = offset.dot(axes.up)
		const z = offset.dot(axes.forward)
		return Math.abs(x) <= axes.width / 2
			&& y >= 0
			&& y <= axes.height
			&& z >= 0
			&& z <= axes.depth
	}

	boxInsideVolume(box, axes) {
		const min = box.min
		const max = box.max
		const points = [
			new Vector3(min.x, min.y, min.z),
			new Vector3(min.x, min.y, max.z),
			new Vector3(min.x, max.y, min.z),
			new Vector3(min.x, max.y, max.z),
			new Vector3(max.x, min.y, min.z),
			new Vector3(max.x, min.y, max.z),
			new Vector3(max.x, max.y, min.z),
			new Vector3(max.x, max.y, max.z),
			box.getCenter(new Vector3()),
		]
		return points.some(point => this.pointInsideVolume(point, axes))
	}

	createDebugObject(opts = {}) {
		const axes = this.getAxes(opts)
		const group = opts.group || null
		const material = opts.material || new MeshBasicMaterial({
			color: opts.color || 0x22d3ee,
			transparent: true,
			opacity: Number(opts.opacity ?? 0.12),
			depthWrite: false,
		})
		const edgeMaterial = opts.edgeMaterial || new LineBasicMaterial({
			color: opts.edgeColor || 0x22d3ee,
			transparent: true,
			opacity: Number(opts.edgeOpacity ?? 0.7),
		})
		const mesh = new Mesh(new BoxGeometry(axes.width, axes.height, axes.depth), material)
		const center = axes.base.clone()
			.add(axes.forward.clone().multiplyScalar(axes.depth / 2))
			.add(axes.up.clone().multiplyScalar(axes.height / 2))
		mesh.position.copy(center)
		const matrix = new Matrix4().makeBasis(axes.right, axes.up, axes.forward)
		mesh.quaternion.setFromRotationMatrix(matrix)

		const edges = new LineSegments(new EdgesGeometry(mesh.geometry), edgeMaterial)
		edges.position.copy(mesh.position)
		edges.quaternion.copy(mesh.quaternion)

		const line = new Line(
			new BoxGeometry(0.01, 0.01, axes.depth).toNonIndexed(),
			edgeMaterial,
		)
		line.visible = false

		if (group?.add) group.add(mesh, edges)
		return { mesh, edges, line, axes }
	}
}
