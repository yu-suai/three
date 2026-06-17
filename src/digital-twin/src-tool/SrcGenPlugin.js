
const fs = require('fs')

const gen_ = () => {
	// let src = fs.readFileSync('./node_modules/three/examples/jsm/controls/orbitcontrols.js', 'utf8')
	let src = fs.readFileSync('./node_modules/three/examples/jsm/lines/LineMaterial.js', 'utf8')

	src = `
//	import { h4 } from "/src/crossyo/digital-twin/material/CommonShader"
import { h4 } from "kutsi-digital-twin/material/CommonShader"

	` + src

	src = src.replace(/#include <clipping_planes_pars_fragment>/, `
		#include <clipping_planes_pars_fragment>

		\${h4}

	`)

	src = src.replace(/#include <color_fragment>/, `
		#include <color_fragment>
		/* use only r in rgb */
		h4_initia();
		diffuseColor.rgb = h4_color(diffuseColor.r);
	`)

	// TODO 如果发现多个替换，需要报错！

	fs.writeFileSync(
		// './src-gen/orbitcontrols.js', 
		'./src-gen/LineMaterial.js', 
		src, {
		encoding: 'utf8'
	})

}

const SRC_GEN_PLUGIN_NAME = 'SrcGenPlugin'
class SrcGenPlugin {

	apply(compiler) {

		const logger = compiler.getInfrastructureLogger(SRC_GEN_PLUGIN_NAME)
		logger.info('init')

		gen_()

		// compiler.hooks.beforeCompile.tapAsync(SRC_GEN_PLUGIN_NAME, (params, callback) => {
		// 	console.log('beforeCompile!!')
		// 	callback()
		// })

	}

}

module.exports = { SrcGenPlugin } 