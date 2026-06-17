import { MathUtils, Vector3, NoToneMapping, LinearToneMapping, ReinhardToneMapping, CineonToneMapping, ACESFilmicToneMapping, CustomToneMapping, Mesh, REVISION } from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { getTuning } from '../util/SceneTuningUtil'

export const SkyType = {
    None: 0,
    // TwoColor: 1,
    Atmosphere: 2,
}

const toneMappingOptions = {
    None: NoToneMapping,
    Linear: LinearToneMapping,
    Reinhard: ReinhardToneMapping,
    Cineon: CineonToneMapping,
    ACESFilmic: ACESFilmicToneMapping,
    // Custom: CustomToneMapping
}

export const disable_gui_field = f => {
    if (f) {
        if (f.disable) {
            f.disable()
        } else if (f.domElement) {
            let style = f.domElement.style
            style.pointerEvents = 'none'
            // style.transform = 'scale(0.5)'
            style.opacity = '0.33'
        }
    }
}

export class BaseEnvironment {

    constructor(viewer, opts) {
        this.viewer_ = viewer

        let skyAtmosphere = Object.assign({
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.05, // 0.005,
            mieDirectionalG: 0.23, // 0.7,
            // 可能被 hour env 覆盖的参数
            elevation: 15,
            // azimuth: 90,  //正东
            azimuth: 80, // 偏东南
        }, opts && opts.skyAtmosphere)

        this.opts_ = Object.assign({
            debug: false,
            skyType: SkyType.Atmosphere,
            // default NoToneMapping
            toneMapping: this.viewer_.renderer_.toneMapping,
            exposure: this.viewer_.renderer_.toneMappingExposure,
            // outputEncoding: // LinearEncoding
        }, opts)

        this.opts_.skyAtmosphere = skyAtmosphere

    }

    setup() {
        return new Promise(resolve => {

            console.log('setup base env!', this.opts_, this.viewer_.renderer_.outputEncoding)

            this.renderer_exp_0_ = this.viewer_.renderer_.toneMappingExposure

            if (this.opts_.skyType == SkyType.Atmosphere) {
                let sky = new Sky()
                sky.scale.setScalar(450000)
                this.viewer_.scene_.add(sky)
                this.skyAtmosphere_ = sky
            }

            // GUI
            const c_root = this.opts_
            const c_root_proxy = {
                toneMapping: Object.entries(toneMappingOptions).filter(([k, v]) => v == this.opts_.toneMapping)[0][0]
            }
            // console.log('c_root_proxy', c_root_proxy)
            const c_skyAtmosphere = this.opts_.skyAtmosphere

            // debug field!
            let f_elevation = null
            let f_azimuth = null

            this.sunDelta__ = {
                hold: 'base', // hold by base or other (ex. hour env)
                value: new Vector3()
            }

            const guiChanged = () => {

                if (this.sunDelta__.hold == 'base') {
                    const phi = MathUtils.degToRad(90 - c_skyAtmosphere.elevation)
                    const theta = MathUtils.degToRad(c_skyAtmosphere.azimuth)

                    this.sunDelta__.value.setFromSphericalCoords(100, phi, theta)
                } else {
                    // console.log(f_elevation)
                    disable_gui_field(f_elevation)
                    disable_gui_field(f_azimuth)
                }

                if (this.skyAtmosphere_) {
                    const uniforms = this.skyAtmosphere_.material.uniforms
                    uniforms['turbidity'].value = c_skyAtmosphere.turbidity
                    uniforms['rayleigh'].value = 0 // c_skyAtmosphere.rayleigh
                    uniforms['mieCoefficient'].value = c_skyAtmosphere.mieCoefficient
                    uniforms['mieDirectionalG'].value = c_skyAtmosphere.mieDirectionalG
                    // uniforms['sunPosition'].value.copy(this.sunDelta__.value)
                    this.update_sun_delta_()
                }

                let v_tm = toneMappingOptions[c_root_proxy.toneMapping]
                if (v_tm != this.viewer_.renderer_.toneMapping) {
                    this.viewer_.renderer_.toneMapping = v_tm
                    if (REVISION <= 135) {
                        this.viewer_.scene_.traverse(c => {
                            if (c.isMesh) {
                                c.material.needsUpdate = true
                            }
                        })
                    }
                }

                // this.viewer_.renderer_.toneMappingExposure = c_root.exposure
                this.renderer_exp_0_ = c_root.exposure
                this.update_light1_i_()

            }
            this.base_update__ = guiChanged

            if (this.opts_.debug && getTuning().gui) {
                const gui = getTuning().gui

                gui.add(c_root_proxy, 'toneMapping', Object.keys(toneMappingOptions)).onChange(guiChanged)
                gui.add(c_root, 'exposure', 0, 4, 0.0001).onChange(guiChanged)

                if (this.skyAtmosphere_) {
                    let fsa = gui.addFolder('skyAtmosphere')
                    fsa.add(c_skyAtmosphere, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged)
                    fsa.add(c_skyAtmosphere, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged)
                    fsa.add(c_skyAtmosphere, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged)
                    fsa.add(c_skyAtmosphere, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged)
                    //
                    f_elevation = fsa.add(c_skyAtmosphere, 'elevation', -15, 90, 0.1).onChange(guiChanged)
                    f_azimuth = fsa.add(c_skyAtmosphere, 'azimuth', - 180, 180, 0.1).onChange(guiChanged)
                }

                this.gui__ = gui
            }

            guiChanged()

            resolve()
        })
    }

    // to be override!
    update_light1_i_() {
        this.viewer_.renderer_.toneMappingExposure = this.renderer_exp_0_
    }

    // to be override!
    update_sun_delta_() {
        if (this.skyAtmosphere_) {
            const uniforms = this.skyAtmosphere_.material.uniforms
            uniforms['sunPosition'].value.copy(this.sunDelta__.value)
        }
    }

}