import { BoxGeometry, BufferAttribute, BufferGeometry, Mesh, Object3D, Points, PointsMaterial } from "three"
// import { ComsolPointsMaterial } from "../material/ComsolPointsMaterial"
import { ComsolPointsMaterial } from "kutsi-digital-twin/material/ComsolPointsMaterial"

export class Comsol extends Object3D {

	constructor(params) {
		super(params)
		this.dummy_ = new Mesh(new BoxGeometry())
		this.add(this.dummy_)
	}

	calc_level_(autoLevel, levelLow, levelHigh, { points = null, vals = null }) {
		if (autoLevel) {

			let low = Number.POSITIVE_INFINITY
			let high = Number.NEGATIVE_INFINITY

			if (points) {
				points.forEach(p => {
					if (p.v < low) {
						low = p.v
					}
					if (p.v > high) {
						high = p.v
					}
				})
			}

			if (vals) {
				vals.forEach(v => {
					if (v < low) {
						low = v
					}
					if (v > high) {
						high = v
					}
				})
			}

			// high = 320

			console.log('## auto level', low, '~', high)

			return {
				levelLow: low,
				levelHigh: high,
			}
		} else {

			console.log('## manual level', levelLow, '~', levelHigh)

			return {
				levelLow,
				levelHigh,
			}
		}
	}

	applyComsol({ points = [], autoLevel = true, levelLow = 0, levelHigh = 500, scale = null }) {

		console.log('# apply', points, this.mesh_)

		if (!this.mesh_) {

			this.remove(this.dummy_)

			let arr_pos = new Float32Array(points.length * 3)
			let arr_val0 = new Float32Array(points.length)
			let i = 0
			let j = 0
			points.forEach(p => {
				arr_pos[i++] = p.x
				arr_pos[i++] = p.y
				arr_pos[i++] = p.z
				arr_val0[j++] = p.v
			})

			let geo = new BufferGeometry()
			// geo.setIndex(new BufferAttribute(indices, 1))
			geo.setAttribute('position', new BufferAttribute(arr_pos, 3))
			geo.setAttribute('val0', new BufferAttribute(arr_val0, 1))

			let scale_one = 1
			if (scale) {
				scale_one = (scale.x + scale.y + scale.z) / 3
			}

			let mat = new ComsolPointsMaterial({
				// let mat = new PointsMaterial({
				color: 0xcc3333,
				// sizeAttenuation: true, // default
				// size: 1, // default
				// size: .1,
				size: .05 * scale_one,
				// size: .02,

			})

			let calc_level = this.calc_level_(autoLevel, levelLow, levelHigh, { points })
			Object.assign(mat, calc_level)

			this.mesh_ = new Points(geo, mat)
			this.arr_val0_ = arr_val0

			this.add(this.mesh_)

			// console.log(this.mesh_)

			return true // is first!

		} else {

			let arr_val0 = this.arr_val0_
			let j = 0
			points.forEach(p => {
				// arr_pos[i++] = p.x
				// arr_pos[i++] = p.y
				// arr_pos[i++] = p.z
				arr_val0[j++] = p.v
			})

			this.mesh_.geometry.attributes.val0.needsUpdate = true

			let calc_level = this.calc_level_(autoLevel, levelLow, levelHigh, { points })
			Object.assign(this.mesh_.material, calc_level)

			return false
		}

	}

	// get heatmap() {
	// 	return this.heatmap_
	// }

	clear_() {
		// console.log('# Comsol.clear_')
		this.mesh_?.geometry.dispose()
	}

}
