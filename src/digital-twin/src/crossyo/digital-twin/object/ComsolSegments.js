import { AxesHelper, Color } from "three"
import { Comsol } from "./Comsol"

// import { LineGeometry } from 'three/addons/lines/LineGeometry'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry'
import { LineSegments2 } from 'three/addons/lines/LineSegments2'
// https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/LineMaterial.js

// import { LineMaterial } from 'three/addons/lines/LineMaterial'
// TODO 两个同时启用, shader 部分会相互影响！
import { LineMaterial } from '/src-gen/LineMaterial'

export class ComsolSegments extends Comsol {

	constructor(params) {
		super(params)
	}

	//segments: {vals:[], pts:[], connects:[]}
	applyComsolSegments({ segments = null, autoLevel = true, levelLow = 0, levelHigh = 500, scale = null,
		// windDirection = 0,
	}) {

		console.log('$$$ ComsolSegments.apply segs', segments)

		const { pts, vals, connects } = segments

		let calc_level = this.calc_level_(autoLevel, levelLow, levelHigh, { vals })

		// ShaderMaterial
		// 	LineMaterial

		// InstancedBufferGeometry
		// 	LineSegmentsGeometry
		// 		.fromWireframeGeometry()
		// 		.fromEdgesGeometry()
		// 		.fromMesh()
		// 		.fromLineSegments()
		// 		LineGeometry
		// 			.fromLine()
		// 	WireframeGeometry2

		// Mesh
		// 	LineSegments2
		// 		Line2
		// 	Wireframe

		if (!this.mesh_) {

			this.remove(this.dummy_)

			// this.mesh_ = new AxesHelper()

			const segs = new LineSegmentsGeometry()

			const positions = []
			const colors = []

			const diff_ = calc_level.levelHigh - calc_level.levelLow

			const to_color_ = v => { // gray
				let u = (v - calc_level.levelLow) / diff_
				return new Color(u, u, u)
			}

			connects.forEach(conn => {
				const pt1 = pts[conn[0]]
				const pt2 = pts[conn[1]]

				const c1 = to_color_(vals[conn[0]])
				const c2 = to_color_(vals[conn[1]])

				positions.push(pt1[0], pt1[1], pt1[2], pt2[0], pt2[1], pt2[2])
				colors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b)

			})


			segs.setPositions(positions)
			segs.setColors(colors)

			// https://github.com/mrdoob/three.js/blob/dev/examples/jsm/lines/LineMaterial.js
			// 没有找到必要的参数！可以参照如下
			// https://github.com/mrdoob/three.js/blob/master/examples/webgl_lines_fat_raycasting.html#L60

			const seg = new LineSegments2(segs, new LineMaterial({
				// color: 0xff0000,

				linewidth: .21,

				worldUnits: true,
				vertexColors: true,
			}))
			seg.computeLineDistances()

			this.mesh_ = seg

			// this.add(new AxesHelper())
			this.add(this.mesh_)

			return true
		} else {


			return false
		}



	}

}