import { Builder } from "./Builder"
import { PMREMGenerator } from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'

/**
 * 由于可能引用three examples扩展库，独立参数化，默认时，只用Builder，可以减少不必要的包大小
 */
class BuilderEx extends Builder {

    constructor(opts, viewer) {
        super(opts, viewer)
    }

    setupEnvEquirect(param, next) {
        let is_hdr = /\.hdr$/.test(param.url)
        let is_exr = /\.exr$/.test(param.url)
        if (is_hdr || is_exr) { // #20220314, for vlab3-lab

            let pmrem_gen = new PMREMGenerator(this.viewer_.renderer_)
            pmrem_gen.compileEquirectangularShader()

            let clzLoader = is_hdr ? RGBELoader : EXRLoader

            new clzLoader()
                // .setDataType(UnsignedByteType)
                .load(param.url, hdr => {

                    let tex = pmrem_gen.fromEquirectangular(hdr).texture
                    pmrem_gen.dispose()
                    hdr.dispose()

                    if (param.onAfter) {
                        param.onAfter(tex)
                    }

                    next()

                })

        } else {
            super.setupEnvEquirect(param, next)
        }
    }

    
}

export {
    BuilderEx
}
