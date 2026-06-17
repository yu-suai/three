import { Matrix4, Mesh, REVISION, Vector3 } from "three"

// 没有测试，只是以shelves为基准
/*
#20231128, 发现并没有使用，避免vite中使用问题，注释掉
const mergeGeometryes = REVISION < 140
	? require("three/examples/jsm/utils/BufferGeometryUtils").mergeBufferGeometries
	: require("three/examples/jsm/utils/BufferGeometryUtils").mergeGeometries
*/

// from pamir base/yo-util, red-valley
const traverse_deep = (o3d, callback, deep = 0) => {
	callback(o3d, deep)
	let d2 = deep + 1
	o3d.children.forEach(c => {
		traverse_deep(c, callback, d2)
	})
}

const dump_o3d = (o3d) => {
	traverse_deep(o3d, (c, deep) => {
		let extra = ''
		if (c.isMesh) {
			extra += c.material.name + ','
			if (c.geometry.attributes['uv']) {
				extra += 'uv,'
			}
			if (c.geometry.attributes['uv2']) {
				extra += 'uv2,'
			}
		}
		console.log(`${'-'.repeat(deep * 2)}${c.name}`, { c }, extra)
	})
}

const MERGE_TO_ROOT = 1
const MERGE_RE_CENTER = 2

// for smart-farm
// base on root matrix
// current support meshes
const merge_o3d_array = (o3ds, mode = MERGE_RE_CENTER) => {

	if (o3ds.length > 0) {
		let mat = o3ds[0].material
		let geos = []
		o3ds.forEach(o3d => {
			o3d.updateMatrixWorld(true)
			geos.push(o3d.geometry.applyMatrix4(o3d.matrixWorld))
		})

		let geo = mergeGeometries(geos)

		let m = new Mesh(geo, mat)
		if (mode == MERGE_RE_CENTER) {
			geo.computeBoundingBox()
			let cnt = geo.boundingBox.getCenter(new Vector3())
			m.position.copy(cnt)
			geo.center()
		}
		return m
	}

	return null
}

// from smart-farm
// 按照材质分组，便于执行 merge_o3d_array
const to_material_group = o3d => {
	let mg = {}
	o3d.traverse(c => {
		if (c.isMesh) {
			let mat = c.material
			let fm = mg[mat.uuid]
			if (!fm) {
				fm = { mat, o3ds: [] }
				mg[mat.uuid] = fm
			}
			fm.o3ds.push(c)
		}
	})
	return mg
}

export {
	traverse_deep,
	dump_o3d,
	merge_o3d_array,
	MERGE_TO_ROOT,
	MERGE_RE_CENTER,
	to_material_group, // #20220206
}

// from altai-gis / Object3DUtil
const traverse_mtx__ = (n, mtx, callback) => {
	callback(n, mtx)
	n.children.forEach(c => {
		c.updateMatrix()
		traverse_mtx__(c, new Matrix4().multiplyMatrices(mtx, c.matrix), callback)
	})
}

export const traverse_mtx = (o3d, callback) => {
	traverse_mtx__(o3d, new Matrix4(), callback)
}

// #20220620, for shelves
export const local_box3 = o3d => {

	let bbx1 = null
	traverse_mtx(o3d, (c, mtx) => {
		if (c.isMesh) {
			c.geometry.computeBoundingBox()
			let bbx = c.geometry.boundingBox.clone().applyMatrix4(mtx)
			if (!bbx1) {
				bbx1 = bbx
			} else {
				bbx1.union(bbx)
			}
		}
	})
	return bbx1

}

// #20230511, digital-twin
export const merge_o3d_array_to_im = o3ds => {



}
