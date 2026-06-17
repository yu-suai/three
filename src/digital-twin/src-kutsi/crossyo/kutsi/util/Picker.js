
import EventEmitter from 'events'
import { Box3Helper, BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector2 } from 'three'
import { local_box3 } from './SceneUtil'

// #20211220, sync from red-valley
class Picker extends EventEmitter {

	constructor(param) {

		super()

		this.param_ = Object.assign({
			useHitVisible: true,
			useMeshGroup: true,
			useHitsArray: false,
			useMove: false,
			upPhasePeriodThreshold: 0.05, // #20220306, for shelves 从按下到弹起期间point移动的距离，如果小于这个数值视为点击
		}, param) // domElement

		let size = this.param_.viewer.size_
		let dpr = this.param_.viewer.pixelRatio_
		this.is_wx_ = this.param_.viewer.is_wx_
		this.vpos_ = new Vector2()

		this.on_move_ = event => {
			// console.log('on_move_', event)
			
			// let vx = (event.clientX / size.w) * 2 - 1
			// let vy = -(event.clientY / size.h) * 2 + 1
			let vx = (event.offsetX / size.w) * 2 - 1
			let vy = -(event.offsetY / size.h) * 2 + 1
			// console.log(size, event.clientX, event.clientY)
			if (vx != this.vpos_.x || vy != this.vpos_.y) {
				this.is_move_ = true
				this.vpos_.set(vx, vy)
			}
		}

		this.hits_ = null
		if (this.param_.useHitsArray) {
			this.hits_ = {
				arr: []
			}
		}

		this.pick_obj_ = null
		this.latest_down_pick_obj_ = null

		let update_vpos_ = (x, y) => {
			let vx = (x / size.w) * 2 - 1
			let vy = -(y / size.h) * 2 + 1
			// console.log('update_vpos_', x, y, size.w, size.h, vx, vy)
			if (vx != this.vpos_.x || vy != this.vpos_.y) {
				this.vpos_.set(vx, vy)
			}
		}

		this.on_down_ = event => {
			event.preventDefault()
			// console.log('on_down_', event)
			this.is_down_ = true

			// console.log(size, event.clientX, event.clientY)
			update_vpos_(event.offsetX, event.offsetY)
			this.down_vpos_ = this.vpos_.clone()
		}

		this.on_up_ = event => {
			event.preventDefault()
			// console.log('on_up_', event)

			update_vpos_(event.offsetX, event.offsetY)

			if (this.down_vpos_) {
				let dist = this.vpos_.distanceTo(this.down_vpos_)
				if (dist < this.param_.upPhasePeriodThreshold) {
					this.emit('downUpPick', this.latest_down_pick_obj_)
				} else {
					this.emit('downUpNone') // #20220916, shelves, just for some subscriber required!
				}
			}

		}

		// console.log('##picker init', this.param_.domElement)
		// for wx use touchstart

		this.on_touchstart_ = event => {
			event.preventDefault() // prevent scrolling
			// console.log(event)
			this.is_down_ = true

			let ts = event.touches
			if (ts.length == 1) {
				update_vpos_(ts[0].clientX * dpr, ts[0].clientY * dpr)
			} else {
				update_vpos_(
					(ts[0].clientX * dpr + ts[1].clientX * dpr) / 2,
					(ts[0].clientY * dpr + ts[1].clientY * dpr) / 2
				)
			}
			this.down_vpos_ = this.vpos_.clone()
		}

		this.param_.domElement.addEventListener('pointermove', this.on_move_)
		this.param_.domElement.addEventListener('pointerdown', this.on_down_)
		this.param_.domElement.addEventListener('pointerup', this.on_up_)
		if (this.is_wx_) {
			this.param_.domElement.addEventListener('touchstart', this.on_touchstart_, { passive: false })
		}

		this.raycaster_ = new Raycaster()
	}


	try_match_group_(int0) {
		let grps = int0.object.geometry.groups
		if (grps && grps.length > 0) {
			// grp { start: Integer, count: Integer, materialIndex: Integer }
			// int0.faceIndex

			// console.log(int0, { grps })

			let fi = int0.faceIndex * 3

			let match = null
			// #20220114,fixed!
			for (let i = grps.length - 1; i >= 0; i--) {
				let grp = grps[i]
				if (fi >= grp.start) {
					match = grp
					break
				}
			}

			if (match) {
				// console.log(int0.faceIndex, match)
				return match
			}
		}
		return null
	}

	update_() {
		this.raycaster_.setFromCamera(this.vpos_, this.param_.viewer.camera_)
		let hits_arr = null
		if (this.hits_) {
			if (this.param_.useHitVisible) {
				hits_arr = this.hits_.arr.filter(o => o.visible)
			} else {
				hits_arr = this.hits_.arr
			}
		} else {
			// hits_arr = this.param_.viewer.scene_.children
			hits_arr = []
			if (this.param_.useHitVisible) {
				this.param_.viewer.scene_.traverse(c => {
					if (c.isMesh && c.visible) {
						hits_arr.push(c)
					}
				})
			} else {
				this.param_.viewer.scene_.traverse(c => {
					if (c.isMesh) {
						hits_arr.push(c)
					}
				})
			}
		}
		// console.log(hits_arr)
		let intersects = this.raycaster_.intersectObjects(hits_arr, false /* true */)
		if (intersects.length > 0) {
			// console.log(intersects) 
			// {distance: 138.32836615794753, point: Vector3, object: Mesh, uv: Vector2, 
			// face: {a: 7803, b: 7804, c: 7805, normal: Vector3, materialIndex: 0}, faceIndex: 2601

			let int0 = intersects[0]
			this.pick_obj_ = {
				int0
			}
			if (this.param_.useMeshGroup) {
				this.pick_obj_.mg = this.try_match_group_(int0)
			}
			if (this.param_.useMove && this.is_move_) {
				this.emit('movePick', this.pick_obj_)
			}
			if (this.is_down_) {
				this.emit('downPick', this.pick_obj_)
				this.latest_down_pick_obj_ = this.pick_obj_
			}

		} else {
			this.pick_obj_ = null
			if (this.param_.useMove && this.is_move_) {
				this.emit('movePickNone')
			}
			// #20220301
			if (this.is_down_) {
				this.emit('downPick', {})
				this.latest_down_pick_obj_ = {}
			}
		}

		this.is_move_ = false
		this.is_down_ = false
	}

	update() {
		if (!this.param_.useMove) { // normal, just down
			if (this.is_down_) {
				this.update_()
			}
		} else { // move or down
			if (this.is_move_ || this.is_down_) {
				this.update_()
			}
		}
	}

	dispose() {
		this.emptyHits()
		if (this.is_wx_) {
			this.param_.domElement.removeEventListener('touchstart', this.on_touchstart_)
		}
		this.param_.domElement.removeEventListener('pointerup', this.on_up_)
		this.param_.domElement.removeEventListener('pointerdown', this.on_down_)
		this.param_.domElement.removeEventListener('pointermove', this.on_move_)
	}

	emptyHits() {
		if (this.hits_) {
			this.hits_.arr = []
		}
	}

	pushHit(obj, opts = { attachHitBox: false }) {
		if (this.hits_) {
			// #20220919, for hvac
			if (opts.attachHitBox) {
				if (!obj.hit_mesh_) {
					let bbx = local_box3(obj)
					// console.log('bbx', bbx)
					// obj.add(new Box3Helper(bbx))

					let m = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({
						color: 0xffff00,
						// wireframe: true,
						visible: false,
					}))
					m.is_hit_mesh_ = true
					bbx.getSize(m.scale)
					bbx.getCenter(m.position)
					obj.add(m)

					obj.hit_mesh_ = m
					m.hit_ = obj.hit_
				}
			}
			// this.hits_.arr.push(obj)
			// #20220528, from kiwi, 例如 red-valley 中的LocO3d 具有 hit_mesh_
			this.hits_.arr.push(obj.hit_mesh_ || obj)
		}
	}

	// #20220610, for shelves
	spliceHit(obj) {
		if (this.hits_) {
			let fi = this.hits_.arr.indexOf(obj)
			if (fi >= 0) {
				return this.hits_.arr.splice(fi, 1)
			}
		}
		return null
	}

	// #20230324, for shelves
	removeByUuids(uuids) {
		if (this.hits_) {
			this.hits_.arr = this.hits_.arr.filter(itm => !uuids[itm.uuid])
		}
	}

}

export {
	Picker
}
