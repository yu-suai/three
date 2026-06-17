import { Box3, Vector3 } from "three"
import { o3dToViewPosition, wposToViewPosition } from "kutsi/util/ViewerUtil"
import { WrapperNode } from "../object/WrapperNode"

// const ONLY_FIRST_HIT = true // 只在第一次发出 依据点击位置，比较稳定
const ONLY_FIRST_HIT = false // 不断发出 hitNodePositionChange 事件

export const geo_center_to_canvas_ = (mesh, viewer) => {
	// 问题，mesh 中心点可能不正确，需要计算geo中心点
	// this.pc0_ = o3dToViewPosition(this.viewer_, this.curr_o3d_) // center

	let wpc = mesh.localToWorld(
		mesh.geometry.boundingBox.getCenter(new Vector3())
	)
	return wposToViewPosition(viewer, wpc)
}

export const group_geo_center_to_canvas_ = (o3d, viewer) => {

	if (o3d.isMesh) {
		return geo_center_to_canvas_(o3d, viewer)
	} else {

		let bbx = new Box3()
		o3d.traverse(c => {

			if (c.isMesh) {

				// MEMO 根据中心计算的group中心，不一定是整个boudingBox的中心！

				let mesh = c
				let wpc = mesh.localToWorld(
					mesh.geometry.boundingBox.getCenter(new Vector3())
				)
				bbx.expandByPoint(wpc)

			}

		})

		let cnt2 = bbx.getCenter(new Vector3())
		return wposToViewPosition(viewer, cnt2)

	}

}

export const geo_world_bbx_ = mesh => {
	mesh.updateWorldMatrix(true, false)
	let bbx = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)
	return bbx
}

export const group_world_bbx_ = o3d => {

	// TODO cache here?
	
	let bbx = new Box3()
	o3d.traverse(c=>{
		if (c.isMesh) {
			bbx.union(geo_world_bbx_(c))		
		}
	})

	return bbx
}

export class Level2PositionTracer {

	constructor(viewer) {
		this.viewer_ = viewer
		this.curr_o3d_ = null
		this.is_manually_ = false // manually highlight
	}

	begin(int0) {

		this.is_manually_ = false
		// console.log('begin', int0)

		let mesh = int0.object
		this.curr_o3d_ = mesh
		//
		this.pt0_ = wposToViewPosition(this.viewer_, int0.point)

		if (ONLY_FIRST_HIT) {

			return {
				x: this.pt0_.x,
				y: this.pt0_.y,
			}

		} else {

			this.pc0_ = geo_center_to_canvas_(this.curr_o3d_, this.viewer_)

			return {
				x: this.pt0_.x,
				y: this.pt0_.y,
			}
		}

	}

	begin_manually_(o3d) {
		if (o3d.isMesh) {
			this.is_manually_ = true
			this.curr_o3d_ = o3d
		}
	}

	before_render_(time, delta) {
		if (this.curr_o3d_) {
			// this.viewer_.emit('hitNodePositionChange', {})

			if (!this.is_manually_) { // for hit

				if (ONLY_FIRST_HIT) {
					// nothing!
				} else {

					let pc1 = geo_center_to_canvas_(this.curr_o3d_, this.viewer_)
					let wn = WrapperNode.fromO3d(this.curr_o3d_, this.viewer_)
					wn.canvasPosition = {
						x: pc1.x + (this.pt0_.x - this.pc0_.x),
						y: pc1.y + (this.pt0_.y - this.pc0_.y),
					}
					this.viewer_.emit('hitNodePositionChange', wn)
				}

			} else { // for manually highlight

				let wn = WrapperNode.fromO3d(this.curr_o3d_, this.viewer_)
				this.viewer_.emit('highlightNodePositionChange', wn)

			}


		}
	}

	end() {
		this.curr_o3d_ = null
	}

}
