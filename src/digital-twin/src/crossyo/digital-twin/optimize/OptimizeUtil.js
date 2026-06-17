

import md5 from 'js-md5'

export class GeoSummary {

	constructor(geo) {
		this.geo_ = geo

	}

	get uuid() {
		if (!this.uuid_) {
			this.uuid_ = this.geo_.uuid
		}
		return this.uuid_
	}

	get hashArray() {
		if (!this.hash_array_) {
			let s = ''
			Object.values(this.geo_.attributes).forEach(a => {
				s += md5(a.array)
			})

			// #20231219, attributes是不够的，index有可能不同
			s += md5(this.geo_.index.array)

			// TEST ASB
			// 					obj				gs1(uuid)		gs2(hashArray)
			// -----------------------------------------------------------------
			// 没有index		9360			6430			1478
			// 加入index		9360			6430			1499

			this.hash_array_ = s
		}
		return this.hash_array_
	}

	get hashAttri() {
		if (!this.hash_attri_) {
			this.hash_attri_ = Object.keys(this.geo_.attributes).join('-')
		}
		return this.hash_attri_
	}

}


export const OptimizeUtil = {

	report: (urlModel, o3d) => {// 分析 

		let mesh_obj_s = []
		let gs1_m = {} // geo summary map - group by uuid
		let gs2_m = {} // geo summary map - group by hash array(s)
		// let gs3_m = {} // geo summary map - group by hash attribute(s)


		o3d.traverse(c => {
			if (c.isMesh) {
				mesh_obj_s.push(c)

				let gs = new GeoSummary(c.geometry)
				//
				let f1 = gs1_m[gs.uuid]
				if (!f1) {
					gs1_m[gs.uuid] = gs
				}
				//
				let key2 = gs.hashArray
				// if (/.*zhu_ti$/.test(c.name)) { // #20231219, 用于调试zhu_ti位置不对！
				// 	key2 = gs.uuid
				// }
				let f2 = gs2_m[key2]
				if (!f2) {
					gs2_m[key2] = {
						gs,
						rels: [c]
					}
				} else {
					f2.rels.push(c)
				}
				//
				// let f3 = gs3_m[gs.hashAttri]
				// if (!f3) {
				// 	gs3_m[gs.hashAttri] = gs
				// }
				//
			}

		})

		let rpt = {
			urlModel,
			obj_len: mesh_obj_s.length,
			gs1_geo_len: Object.keys(gs1_m).length,
			gs2_hash_array_len: Object.keys(gs2_m).length,
			// gs3_all_hash_attri: Object.keys(gs3_m).length,
		}

		// { // test
		// 	let gs = gs1_m[Object.keys(gs1_m)[0]]
		// 	console.log(gs.hashArray, gs.hashAttri)
		// }

		// console.log(mesh_obj_s)
		// console.log(gs2_m)
		// #20231219, 检查zhu_ti geometry的hash相似性问题，发现是index 不同！
		// Object.values(gs2_m).map(({ gs, rels }) => {
		// 	// console.log(gs, rels)
		// 	const f = rels.find(mesh => /.*zhu_ti$/.test(mesh.name))
		// 	if (f) {
		// 		console.log(f, gs, rels)
		// 	}
		// })

		console.log(rpt)

		// rpt_data
		return {
			gs2_m
		}

	},


}


