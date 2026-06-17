import { Box3Helper, Euler, Quaternion, Vector3 } from "three"
import { geo_center_to_canvas_, geo_world_bbx_, group_geo_center_to_canvas_, group_world_bbx_ } from "../util/Level2PositionTracer"
import { vec3_2_xyz } from "../util/Util"

export class WrapperNode {

	constructor(o3d, viewer) {

		Object.defineProperty(this, 'name', {
			get() {
				return o3d.name
			}
		})

		Object.defineProperty(this, 'canvasCenterPosition', {
			get() {
				if (o3d.isMesh) {
					return geo_center_to_canvas_(o3d, viewer)
				} else {
					return group_geo_center_to_canvas_(o3d, viewer)
				}
			}
		})

		let highlight_ = false
		Object.defineProperty(this, 'highlight', {
			get() {
				return highlight_
			},
			set(v) {
				highlight_ = v
				viewer.l2_hl_.active(o3d, true)
				viewer.l2_pt_.begin_manually_(o3d)
			}
		})

		Object.defineProperty(this, 'visible', {
			get() {
				return o3d.visible
			},
			set(v) {
				o3d.visible = v
			}
		})

		Object.defineProperty(this, 'transform', {
			get() {
				// let q = o3d.getWorldQuaternion(new Quaternion())
				// let e = new Euler().setFromQuaternion(q, 'YXZ')
				// console.log(q, e)
				return {
					position: vec3_2_xyz(o3d.getWorldPosition(new Vector3())),
					// direction: vec3_2_xyz(o3d.getWorldDirection(new Vector3())),
					// direction: vec3_2_xyz(e),
				}
			}
		})

		this.calcLookatByCamera = (distRatio = 1.0) => {
			let dir = viewer.camera_.getWorldDirection(new Vector3())
			return this.calcLookatByDirection(dir, distRatio)
		}

		this.calcLookatByDirection = (dir, distRatio = 1.0) => {

			if (!dir.isVector3) {
				dir = new Vector3(dir.x, dir.y, dir.z)
			}

			let bbx = null
			if (o3d.isMesh) {
				bbx = geo_world_bbx_(o3d)
			} else {
				bbx = group_world_bbx_(o3d)
			}

			// {// debug
			// 	console.log(bbx)
			// 	viewer.get_root_().add(new Box3Helper(bbx))
			// }

			let size = bbx.getSize(new Vector3())
			let dist = size.length() * distRatio
			let target = bbx.getCenter(new Vector3())

			return {
				position: new Vector3(-dir.x * dist, -dir.y * dist, -dir.z * dist).add(target),
				target,
			}

		}


	}

}

WrapperNode.fromO3d = (o3d, viewer) => {
	if (!o3d.wn__) {
		o3d.wn__ = new WrapperNode(o3d, viewer)
	}
	return o3d.wn__
}