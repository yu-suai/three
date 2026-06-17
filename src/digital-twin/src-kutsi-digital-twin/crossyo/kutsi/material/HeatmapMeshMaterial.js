import { MeshStandardMaterial, Vector4 } from "three"
import { h4 } from "./CommonShader"

const MAX_PROBES = 10

export class HeatmapMeshMaterial extends MeshStandardMaterial {

	constructor(params) {
		super(params)

		// this.u_colorLow_ = {
		// 	value: new Vector4(0, 1, 0, 1)
		// }
		// this.u_colorHight_ = {

		// }

		this.u_probes_ = {
			// value: new Array(MAX_PROBES).fill(new Vector4()) // 会指向同一个对象
			value: new Array(MAX_PROBES).fill(0).map(() => { return new Vector4() })
		}
		this.u_probes_len_ = {
			value: 0,
		}

		// { // test1
		// 	this.u_probes_len_.value = 1
		// 	this.u_probes_.value[0] = new Vector4(.1, .1, .1, 1)
		// }

		this.u_low_ = {
			value: 0
		}
		this.u_high_ = {
			value: 1
		}

	}
	
	get levelLow() {
		return this.u_low_.value
	}

	set levelLow(v) {
		this.u_low_.value = v
	}

	get levelHigh() {
		return this.u_high_.value
	}

	set levelHigh(v) {
		this.u_high_.value = v
	}

	onBeforeCompile(shader, renderer) {
		// console.log(shader)

		// console.log(shader.vertexShader)
		// console.log(shader.fragmentShader)

		shader.uniforms.probes = this.u_probes_
		shader.uniforms.probesLength = this.u_probes_len_

		shader.uniforms.u_low = this.u_low_
		shader.uniforms.u_high = this.u_high_

		shader.vertexShader = shader.vertexShader.replace('#include <common>', `
		#include <common>
		varying vec3 wpos;
		`)

		shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `
		wpos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
		`)

		shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
		uniform vec4[${MAX_PROBES}] probes;
		uniform int probesLength;

		uniform float u_low;
		uniform float u_high;

		varying vec3 wpos;

		#include <common>

		${h4}

		float hm_dist(vec3 a, vec3 b) {
			// ? (1- dist) / point radius
			return  pow(max(0.0, 1.0 - distance(a, b) / 1.0), 2.0);
		}

		`)

		shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
		#include <map_fragment>

		// test wpos
		// diffuseColor = vec4(1.0 * wpos.x,0.0,0.0,1.0);
		// diffuseColor = vec4(0.0,1.0 * wpos.y,0.0,1.0);

		h4_initia();
		// test gradient
		// diffuseColor = vec4(h4_color(wpos.x * 4.0),1.0);

		float totalWeight = 0.0;
		for (int i = 0; i < probesLength; ++i) {
			totalWeight += probes[i].w * hm_dist(probes[i].xyz, wpos);
		}

		diffuseColor = vec4(h4_color(totalWeight),1.0);

		`)

	}

	// {probes=[], autoLevel = true, levelLow = 0, levelHigh = 500}
	applyHeatmap(data) {

		if (data.probes.length > MAX_PROBES) {
			console.warn(`Only show probes less than ${MAX_PROBES}.`)
		}

		let len = Math.min(data.probes.length, MAX_PROBES)
		for (let i = 0; i < len; i++) {
			let p = data.probes[i]
			this.u_probes_.value[i].set(p.x, p.y, p.z, p.v)
		}
		this.u_probes_len_.value = len

		// console.log(this.u_probes_.value)

	}

}

