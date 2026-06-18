import { CylinderGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, Plane, Raycaster, SphereGeometry, Vector2, Vector3 } from 'three'
import { PatrolEventDispatcher } from './PatrolEventDispatcher'
import { RouteModel, patrol_point_2_vec3_ } from './RouteModel'

const clearGroup_ = group => {
	if (!group?.children) return
	while (group.children.length) {
		const child = group.children.pop()
		child.geometry?.dispose?.()
		if (child.material && !Array.isArray(child.material)) child.material.dispose?.()
		if (Array.isArray(child.material)) child.material.forEach(material => material?.dispose?.())
	}
}

export class RouteEditor extends PatrolEventDispatcher {
	constructor(opts = {}) {
		super()
		this.route = opts.route instanceof RouteModel ? opts.route : new RouteModel(opts.points || [])
		this.scene = opts.scene || null
		this.camera = opts.camera || null
		this.domElement = opts.domElement || null
		this.controls = opts.controls || null
		this.groundObjects = opts.groundObjects || []
		this.pointY = Number(opts.pointY ?? 0)
		this.markerY = Number(opts.markerY ?? 1.1)
		this.routeY = Number(opts.routeY ?? 0.62)
		this.enabled = false
		this.addMode = false
		this.selectedIndex = -1
		this.draggingIndex_ = -1
		this.pointer_ = new Vector2()
		this.raycaster_ = new Raycaster()
		this.dragPlane_ = new Plane(new Vector3(0, 1, 0), -this.pointY)
		this.hitPoint_ = new Vector3()
		this.markers = []
		this.group = opts.group || new Group()
		this.group.name = opts.name || 'PatrolRouteEditor'
		this.materials = Object.assign({
			route: new MeshBasicMaterial({ color: 0x22d3ee }),
			marker: new MeshBasicMaterial({ color: 0x0ea5e9 }),
			markerSelected: new MeshBasicMaterial({ color: 0xfacc15 }),
		}, opts.materials || {})
		if (this.scene?.add && !this.group.parent) this.scene.add(this.group)
		this.refresh()
	}

	enable(opts = {}) {
		this.enabled = true
		if (typeof opts.addMode === 'boolean') this.addMode = opts.addMode
		this.bindDom()
		this.emit('enable', this.getState())
		return this
	}

	disable() {
		this.enabled = false
		this.addMode = false
		this.draggingIndex_ = -1
		this.unbindDom()
		if (this.controls) this.controls.enabled = true
		this.emit('disable', this.getState())
		return this
	}

	setAddMode(enabled) {
		this.addMode = !!enabled
		this.emit('modeChange', this.getState())
		return this
	}

	setRoute(route) {
		this.route = route instanceof RouteModel ? route : new RouteModel(route || [])
		this.selectedIndex = -1
		this.refresh()
		this.emit('routeChange', this.getState())
		return this
	}

	setGroundObjects(objects = []) {
		this.groundObjects = objects
		return this
	}

	selectPoint(index) {
		const safeIndex = index >= 0 && index < this.route.pointCount ? index : -1
		this.selectedIndex = safeIndex
		this.refresh()
		this.emit('select', this.getState())
		return this
	}

	addPoint(point, meta = null, index = this.route.pointCount) {
		const routePoint = patrol_point_2_vec3_(point)
		routePoint.y = Number(meta?.y ?? routePoint.y ?? this.pointY)
		const createdIndex = this.route.insertPoint(index, routePoint, meta)
		this.selectPoint(createdIndex)
		this.emit('routeChange', this.getState())
		return createdIndex
	}

	removePoint(index = this.selectedIndex) {
		if (index < 0 || index >= this.route.pointCount) return null
		const removed = this.route.removePoint(index)
		this.selectedIndex = -1
		this.refresh()
		this.emit('routeChange', this.getState())
		return removed
	}

	movePoint(index, point) {
		const routePoint = patrol_point_2_vec3_(point)
		routePoint.y = Number(routePoint.y ?? this.pointY)
		const moved = this.route.movePoint(index, routePoint)
		if (moved) {
			this.refresh()
			this.emit('routeChange', this.getState())
		}
		return moved
	}

	renamePoint(index, name) {
		this.route.renamePoint(index, name)
		this.refresh()
		this.emit('routeChange', this.getState())
		return this
	}

	refresh() {
		clearGroup_(this.group)
		this.markers = []
		if (this.route.pointCount < 1) return this

		for (let index = 0; index < this.route.points.length - 1; index += 1) {
			const a = this.route.points[index]
			const b = this.route.points[index + 1]
			const dir = new Vector3().subVectors(b, a)
			const len = dir.length()
			if (len < 0.001) continue
			const cylinder = new Mesh(new CylinderGeometry(0.32, 0.32, len, 10), this.materials.route)
			cylinder.position.copy(new Vector3().addVectors(a, b).multiplyScalar(0.5))
			cylinder.position.y = this.routeY
			cylinder.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize())
			cylinder.userData.type = 'patrol-route-segment'
			cylinder.userData.index = index
			this.group.add(cylinder)
		}

		this.route.points.forEach((point, index) => {
			const selected = index === this.selectedIndex
			const marker = new Mesh(
				new SphereGeometry(selected ? 1.1 : 0.82, 18, 18),
				selected ? this.materials.markerSelected : this.materials.marker,
			)
			marker.position.set(point.x, this.markerY, point.z)
			marker.userData.type = 'patrol-route-point'
			marker.userData.index = index
			this.group.add(marker)
			this.markers.push(marker)
		})
		return this
	}

	bindDom() {
		if (!this.domElement || this.bound_) return this
		this.bound_ = {
			down: event => this.handlePointerDown(event),
			move: event => this.handlePointerMove(event),
			up: event => this.handlePointerUp(event),
		}
		this.domElement.addEventListener('pointerdown', this.bound_.down)
		this.domElement.addEventListener('pointermove', this.bound_.move)
		const ownerWindow = this.domElement.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null)
		ownerWindow?.addEventListener('pointerup', this.bound_.up)
		return this
	}

	unbindDom() {
		if (!this.domElement || !this.bound_) return this
		this.domElement.removeEventListener('pointerdown', this.bound_.down)
		this.domElement.removeEventListener('pointermove', this.bound_.move)
		const ownerWindow = this.domElement.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null)
		ownerWindow?.removeEventListener('pointerup', this.bound_.up)
		this.bound_ = null
		return this
	}

	handlePointerDown(event) {
		if (!this.enabled || !this.camera || !this.domElement) return false
		this.updatePointer_(event)
		this.raycaster_.setFromCamera(this.pointer_, this.camera)
		const markerHits = this.raycaster_.intersectObjects(this.markers, false)
		if (markerHits.length) {
			this.draggingIndex_ = markerHits[0].object.userData.index
			this.selectPoint(this.draggingIndex_)
			if (this.controls) this.controls.enabled = false
			this.emit('dragStart', this.getState())
			return true
		}

		if (!this.addMode) return false
		const groundHits = this.raycaster_.intersectObjects(this.groundObjects, true)
		if (!groundHits.length) return false
		const point = groundHits[0].point.clone()
		point.y = this.pointY
		const index = this.addPoint(point, { name: `P${this.route.pointCount + 1}` })
		this.emit('add', Object.assign(this.getState(), { index }))
		return true
	}

	handlePointerMove(event) {
		if (!this.enabled || this.draggingIndex_ < 0 || !this.camera || !this.domElement) return false
		this.updatePointer_(event)
		this.raycaster_.setFromCamera(this.pointer_, this.camera)
		if (!this.raycaster_.ray.intersectPlane(this.dragPlane_, this.hitPoint_)) return false
		const point = this.hitPoint_.clone()
		point.y = this.pointY
		this.route.movePoint(this.draggingIndex_, point)
		this.refresh()
		this.emit('drag', this.getState())
		this.emit('routeChange', this.getState())
		return true
	}

	handlePointerUp() {
		if (this.draggingIndex_ < 0) return false
		this.draggingIndex_ = -1
		if (this.controls) this.controls.enabled = true
		this.emit('dragEnd', this.getState())
		return true
	}

	getState() {
		return {
			enabled: this.enabled,
			addMode: this.addMode,
			selectedIndex: this.selectedIndex,
			selectedPoint: this.selectedIndex >= 0 ? this.route.points[this.selectedIndex]?.clone() : null,
			selectedMeta: this.selectedIndex >= 0 ? this.route.meta[this.selectedIndex] : null,
			pointCount: this.route.pointCount,
			totalLength: this.route.totalLength,
			route: this.route,
		}
	}

	dispose() {
		this.disable()
		clearGroup_(this.group)
		if (this.group.parent) this.group.parent.remove(this.group)
		this.removeAllListeners()
	}

	updatePointer_(event) {
		const rect = this.domElement.getBoundingClientRect()
		this.pointer_.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
		this.pointer_.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
		return this.pointer_
	}
}
