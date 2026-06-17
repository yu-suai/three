import { BufferGeometry, Float32BufferAttribute, Vector2, Vector3, MeshBasicMaterial } from 'three';

class DropTableGeometry extends BufferGeometry {

	constructor(radius = 1,
		param_b = .1, //
		param_seg_mul = 1.5, // 建议 1.5 ~ 环境越近（例如一个树林），建议设定越小
		widthSegments = 32, heightSegments = 16, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {

		super();
		// this.type = 'SphereGeometry';
		this.type = 'DropTableGeometry';

		this.parameters = {
			radius: radius,
			widthSegments: widthSegments,
			heightSegments: heightSegments,
			phiStart: phiStart,
			phiLength: phiLength,
			thetaStart: thetaStart,
			thetaLength: thetaLength
		};

		widthSegments = Math.max(3, Math.floor(widthSegments));
		heightSegments = Math.max(2, Math.floor(heightSegments));

		const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);

		let index = 0;
		const grid = [];

		const vertex = new Vector3();
		const normal = new Vector3();

		// buffers

		const indices = [];
		const vertices = [];
		const normals = [];
		const uvs = [];

		// #20211227
		let v_table = new Array(heightSegments + 1)
		{
			let seg = Math.PI / heightSegments
			let seg_mul = seg * param_seg_mul

			//需要自底向上计算
			let prev_vi = null
			for (let iy = heightSegments; iy >= 0; iy--) {
				const v = iy / heightSegments;
				let vi = {
					iy,
					theta: v * Math.PI,
				}

				vi.y = Math.cos(vi.theta)
				vi.x = Math.sin(vi.theta)

				if (vi.y < -param_b) {
					let bottom_r = -param_b / Math.cos(vi.theta)
					if (bottom_r < 1) {
						vi.y = -param_b
						vi.x = Math.sqrt(bottom_r * bottom_r - param_b * param_b)
					}
				}

				v_table[iy] = vi

				if (prev_vi) {
					let seg_len = new Vector2(prev_vi.x - vi.x, prev_vi.y - vi.y).length()
					// console.log(seg_len > seg_mul, seg_len / seg, seg)
					if (seg_len > seg_mul) {
						let vec = new Vector2(vi.x, vi.y)
						vec.multiplyScalar(1 - seg_len)
						vi.x = vec.x
						vi.y = vec.y
					}
				}

				prev_vi = vi
				// console.log(vi)
			}

		}


		// generate vertices, normals and uvs
		for (let iy = 0; iy <= heightSegments; iy++) {

			const verticesRow = [];

			const v = iy / heightSegments;

			// special case for the poles

			let uOffset = 0;

			if (iy == 0 && thetaStart == 0) {

				uOffset = 0.5 / widthSegments;

			} else if (iy == heightSegments && thetaEnd == Math.PI) {

				uOffset = - 0.5 / widthSegments;

			}

			for (let ix = 0; ix <= widthSegments; ix++) {

				const u = ix / widthSegments;

				// vertex

				// #20211227, origin circle
				// vertex.x = - radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
				// vertex.y = radius * Math.cos(thetaStart + v * thetaLength); // 0 ~ pi
				// vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
				// #20211227, drop table
				{
					let vi = v_table[iy]
					vertex.x = - radius * Math.cos(phiStart + u * phiLength) * vi.x
					vertex.y = radius * vi.y
					vertex.z = radius * Math.sin(phiStart + u * phiLength) * vi.x
				}

				vertices.push(vertex.x, vertex.y, vertex.z);

				// normal

				normal.copy(vertex).normalize();
				normals.push(normal.x, normal.y, normal.z);

				// uv

				uvs.push(u + uOffset, 1 - v);

				verticesRow.push(index++);

			}

			grid.push(verticesRow);

		}

		// indices

		for (let iy = 0; iy < heightSegments; iy++) {

			for (let ix = 0; ix < widthSegments; ix++) {

				const a = grid[iy][ix + 1];
				const b = grid[iy][ix];
				const c = grid[iy + 1][ix];
				const d = grid[iy + 1][ix + 1];

				if (iy !== 0 || thetaStart > 0) indices.push(a, b, d);
				if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);

			}

		}

		// build geometry

		this.setIndex(indices);
		this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
		this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
		this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

	}

	// static fromJSON(data) {
	// 	return new DropTableGeometry(data.radius, data.widthSegments, data.heightSegments, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
	// }

}

// #20220323, for 08 modeling, 效果不好，uv需要在shader中計算
// const updateDomeUv = geo => {
// 	// console.log(geo)
// 	// geo.deleteAttribute('uv')
// 	const uvs = []
// 	let pos = geo.attributes['position']
// 	for (let i = 0; i < pos.count; i++) {
// 		let v = new Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
// 		v.normalize()
// 		let phi = Math.atan2(v.x, - v.z)
// 		let theta = Math.atan(v.y)
// 		uvs.push(phi / Math.PI * .5 + .5, theta / Math.PI * 2. + .5)
// 	}
// 	geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
// }

class Pos2UvMaterial extends MeshBasicMaterial {

	constructor(params) {
		super(params)
	}

	onBeforeCompile(shader, renderer) {
		// console.log(shader)

		// console.log(shader.vertexShader)

		shader.vertexShader = shader.vertexShader.replace('#include <common>', `
		#include <common>
		varying vec3 pos9;
		`)
		shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
		// wpos9 = vec3( modelMatrix * vec4( transformed, 1.0 ) );
		pos9 = transformed;
		`)

		shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
		#include <common>
		varying vec3 pos9;
		`)
		shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
		// diffuseColor *= texture2D( map, vUv );
		vec3 npos9 = normalize(pos9);
		float phi = atan(npos9.x, - npos9.z);
		// float phi = atan(npos9.z, npos9.x);
		float theta = asin(clamp(npos9.y, -1.0, 1.0));
		diffuseColor *= texture2D( map, vec2(phi / PI * 0.5 + 0.5, theta / PI  + 0.5) );
		`)
	}

}


export {
	DropTableGeometry,
	// updateDomeUv,
	Pos2UvMaterial,
}