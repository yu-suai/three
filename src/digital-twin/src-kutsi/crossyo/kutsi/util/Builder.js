// import * as THREE from 'three'

import { EquirectangularReflectionMapping, LinearSRGBColorSpace, PCFShadowMap, PCFSoftShadowMap, TextureLoader } from 'three'

/*
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
*/

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader'

// import { Sky } from 'three/examples/jsm/objects/Sky'

// import { GUI } from 'three/examples/jsm/libs/dat.gui.module'

import { BaseEnvironment, SkyType } from '../environment/BaseEnvironment'

import { BuilderModel } from './BuilderModel'
import { BuilderTimeline } from './BuilderTimeline'
import { getTuning } from './SceneTuningUtil'

class Builder {

    constructor(opts, viewer) {
        this.opts_ = opts
        this.viewer_ = viewer
        if (this.opts_.useDraco) { // #20240919
            this.draco_ = new DRACOLoader()
            this.draco_.setDecoderPath(`${this.opts_.prefixAsset}/libs/draco/`)
            this.draco_.setDecoderConfig({ type: 'js' })

            this.draco_.preload()
        }
    }

    get renderer_() {
        if (!this.renderer__) {
            this.renderer__ = this.viewer_.renderer_
        }
        return this.renderer__
    }

    get scene_() {
        if (!this.scene__) {
            this.scene__ = this.viewer_.scene_
        }
        return this.scene__
    }

    get camera_() {
        if (!this.camera__) {
            this.camera__ = this.viewer_.camera_
        }
        return this.camera__
    }

    // from jx-map
    setupTimeline(param, next) {
        let timeline = new BuilderTimeline({
            viewer: this.viewer_,
            data: param.data,
            trackObjects: param.trackObjects,
        })
        if (param.onAfter) {
            param.onAfter(timeline)
        }
        next()
    }

    setupCustomization(param, next) {
        if (param.onDoing) {
            param.onDoing(next)
        } else {
            console.warning('setupCustomization require onDoing()!')
        }
    }

    setupEnvEquirect(param, next) {
        let tex = new TextureLoader().load(param.url)
        tex.mapping = EquirectangularReflectionMapping
        if (this.opts_.trend.hdr) {
            // tex.encoding = sRGBEncoding
            tex.colorSpace = LinearSRGBColorSpace
        }
        if (param.onAfter) {
            param.onAfter(tex)
        }
        next()
    }

    setupEnvironment(param, next) {
        let env = new (param.clzEnvironment || BaseEnvironment)(this.viewer_, param)
        // console.log('setupEnvironment', env, param)
        env.setup().then(() => {
            if (param.onAfter) {
                param.onAfter(env) // #20220820, for hospital-hvac
            }
            next()
        })
    }

    // #20211123 from red-valley
    // #20220624 deprecated, recommend use setup environment instead
    setupSky(param, next) { // for compatible
        let param2 = {}
        if (param.useSky == true) {
            param2.skyType = SkyType.Atmosphere
        } else {
            param2.skyType = SkyType.None
        }

        new Array('debug', 'exposure', 'toneMapping').forEach(n => {
            if (param[n]) {
                param2[n] = param[n]
            }
        })

        let skyAtmosphere = new Array('turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'elevation', 'azimuth').reduce((prev, n) => {
            if (param.hasOwnProperty(n)) {
                prev[n] = param[n]
            }
            return prev
        }, {})
        if (skyAtmosphere) {
            param2.skyAtmosphere = skyAtmosphere
        }

        console.log('use deprecated setupSky, transform param to prarm2', param2)

        // move to hour env!
        // useDirectionalLight: true,
        // directionalLightIntensity: 1,
        // useShadow: false,
        // shadowMapWidth: 2048,

        this.setupEnvironment(param2, next)
    }


    // setupSky_old(param, next) {

    //     param = Object.assign({
    //         debug: false,
    //         useDirectionalLight: true,
    //         directionalLightIntensity: 1,

    //         useSky: true,
    //         turbidity: .1, // 10,
    //         rayleigh: .6, // 3,
    //         mieCoefficient: 0.005,
    //         mieDirectionalG: 0.7,
    //         elevation: 15,
    //         azimuth: 180,

    //         exposure: this.renderer_.toneMappingExposure,

    //         useShadow: false,
    //         shadowMapWidth: 2048,

    //         toneMapping: null,

    //     }, param)

    //     if (param.toneMapping) {
    //         this.renderer_.toneMapping = param.toneMapping
    //     }

    //     let sky = null
    //     if (param.useSky) {
    //         sky = new Sky()
    //         sky.scale.setScalar(450000)
    //         this.scene_.add(sky)
    //     }
    //     //
    //     let sun = new Vector3()
    //     let light = null
    //     if (param.useDirectionalLight) {

    //         light = new DirectionalLight(0xffffff, param.directionalLightIntensity)
    //         this.scene_.add(light)
    //     }
    //     //
    //     if (param.useDirectionalLight && param.useShadow) {
    //         this.renderer_.shadowMap.enabled = true
    //         this.renderer_.shadowMap.type = PCFSoftShadowMap

    //         light.castShadow = true
    //         light.shadow.camera.near = 10
    //         light.shadow.camera.far = 10000
    //         let d = 200
    //         light.shadow.camera.left = -d
    //         light.shadow.camera.right = d
    //         light.shadow.camera.top = d
    //         light.shadow.camera.bottom = -d
    //         light.shadow.mapSize.width = param.shadowMapWidth
    //         light.shadow.mapSize.height = param.shadowMapWidth
    //     }

    //     /// GUI

    //     const effectController = param

    //     const guiChanged = () => {

    //         const phi = MathUtils.degToRad(90 - effectController.elevation)
    //         const theta = MathUtils.degToRad(effectController.azimuth)

    //         sun.setFromSphericalCoords(100, phi, theta)

    //         if (sky) {
    //             const uniforms = sky.material.uniforms
    //             uniforms['turbidity'].value = effectController.turbidity
    //             uniforms['rayleigh'].value = effectController.rayleigh
    //             uniforms['mieCoefficient'].value = effectController.mieCoefficient
    //             uniforms['mieDirectionalG'].value = effectController.mieDirectionalG
    //             uniforms['sunPosition'].value.copy(sun)
    //         }

    //         this.renderer_.toneMappingExposure = effectController.exposure
    //         this.renderer_.render(this.scene_, this.camera_)

    //         if (light) {
    //             light.position.copy(sun)
    //         }

    //     }

    //     if (param.debug && registerClass.GUI) {
    //         const gui = new registerClass.GUI()

    //         if (sky) {
    //             gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged)
    //             gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged)
    //             gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged)
    //             gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged)
    //         }
    //         gui.add(effectController, 'elevation', -15, 90, 0.1).onChange(guiChanged)
    //         gui.add(effectController, 'azimuth', - 180, 180, 0.1).onChange(guiChanged)
    //         gui.add(effectController, 'exposure', 0, 4, 0.0001).onChange(guiChanged)
    //     }

    //     guiChanged()

    //     next()
    // }

    // #20220409, for modeling
    setupLight(param, next) {

        // scan lights

        param = Object.assign({
            aoMax: 2,
            lightMax: 20,
            envMax: 2
        }, param)

        let mats = {}
        this.scene_.traverse(c => {
            if (c.isMesh) {
                let mid = c.material.uuid
                if (!mats[mid]) {
                    mats[mid] = c.material
                }
            }
        })
        let arr_mats = Object.values(mats)

        let controller = Object.assign({
            aoMapIntensity: 1,
            lightMapIntensity: 1,
            envMapIntensity: 1,
        }, param)

        const guiChanged = () => {

            arr_mats.forEach(mat => {
                mat.aoMapIntensity = controller.aoMapIntensity
                mat.lightMapIntensity = controller.lightMapIntensity
                mat.envMapIntensity = controller.envMapIntensity
            })

        }

        if (getTuning().gui) {
            const gui = getTuning().gui
            gui.add(controller, 'aoMapIntensity', 0, param.aoMax, .01).onChange(guiChanged)
            gui.add(controller, 'lightMapIntensity', 0, param.lightMax, .01).onChange(guiChanged)
            gui.add(controller, 'envMapIntensity', 0, param.envMax, .01).onChange(guiChanged)
        }

        guiChanged()

        next()
    }

    // #20211124, from package-diy, for metro-l6
    // @deprecated 20220404
    // setupExpoLight(param, next) {
    //     param = Object.assign({
    //         debug: false,
    //         intensity: 1,
    //     }, param)

    //     let r = 30
    //     let dirs = [
    //         { pos: new Vector3(0, r, 0), strength: 1 }
    //     ]
    //     for (let i = 0; i < 4; i++) {
    //         let a = Math.PI * .125 + i * Math.PI * .5
    //         dirs.push({ pos: new Vector3(r * Math.cos(a), r * .2, r * Math.sin(a)), strength: .75 })

    //     }

    //     dirs.push({ pos: new Vector3(0, -r, 0), strength: .75 })

    //     // let rets = []
    //     for (var dir of dirs) {
    //         var dirLight = new DirectionalLight(0xffffff, dir.strength * param.intensity)
    //         dirLight.position.copy(dir.pos)
    //         this.scene_.add(dirLight)
    //         // rets.push(dirLight)

    //         if (param.debug) {
    //             this.scene_.add(new DirectionalLightHelper(dirLight))
    //         }

    //         // let light = new PointLight(0xffffff, dir.strength)
    //         // light.position.copy(dir.pos)
    //         // this.scene_.add(light)
    //         // rets.push(light)
    //     }

    //     next()

    // }

    setupTexture(param, next) {
        let tex = new TextureLoader().load(param.url)
        if (this.opts_.trend.hdr) {
            // tex.encoding = sRGBEncoding
            tex.colorSpace = LinearSRGBColorSpace
        }
        if (param.onAfter) {
            param.onAfter(tex)
        }
        next()
    }

    // from material accounting
    setupTextures(param, next) {
        for (let key in param.objTextures) {
            let ot = param.objTextures[key]
            ot.texture = new TextureLoader().load(ot.url)
            if (this.opts_.trend.hdr) {
                // ot.encoding = sRGBEncoding
                ot.colorSpace = LinearSRGBColorSpace
            }
        }
        if (param.onAfter) {
            param.onAfter(param.objTextures)
        }
        next()
    }

    /*
        setupModelMtlObj(param, next) {
            let mgr = new LoadingManager()
            new MTLLoader(mgr).setPath(param.path).load(`${param.name}.mtl`, mats => {
                mats.preload()
                new OBJLoader(mgr).setPath(path).setMaterials(mats).load(`${param.name}.obj`, obj => {
                    if (param.onAfter) {
                        param.onAfter(obj)
                    }
                    next()
                })
            })
        }
    */

    setupModelGltf(param, next) {
        console.log(param)
        if (param.url && (!param.path || !param.name)) { // #20220703, from actuator-1
            let url = param.url
            let ls = url.lastIndexOf('/')
            if (ls >= 0) {
                param.path = url.substring(0, ls + 1)
                param.name = url.substring(ls + 1)
            } else {
                param.path = './'
                param.name = url
            }
        }

        const loader = new GLTFLoader()
        if (this.draco_) { // #20240919
            loader.setDRACOLoader(this.draco_)
        }
        loader.setPath(param.path).load(`${param.name}`, gltf => {
            // console.log(gltf)
            const after_predefined_ = () => {
                if (param.onAfter) {
                    param.onAfter(gltf.scene)
                }
                next()
            }
            if (param.predefinedModel) { // from jx-map
                /**
                 * {
                 *      aoMapLinearEncoding: false, // #20220603,for kiwi
                 *      depressWarning: false,
                 *      maps: {
                 *          'map1': {url: '*.png'}
                 *      },
                 *      objects_isolate_material: true, // default false
                 *      objects_re: [ // 更低优先级！
                 *          {re: /^(?!.*(-ceiling|-wall|-floor|-socket)).*$/, lightMap: '', aoMap:'' }
                 *      ],
                 *      objects: {
                 *          'obj-1': {
                 *              lightMap: '',
                 *              aoMap: '',
                 *              aoMapIntensity: 1,
                 *              color: new Color(0xff0000),
                 *              opacity: 1,
                 *              geo: {
                 *                  swapUv:false|true, 
                 *                  uvToUv2:false|true
                 *              },
                 *          }
                 *      },
                 *      materials_re: [ // 更低优先级！
                 *          {}
                 *      ],
                 *      materials: {
                 *          '': {}
                 *      },
                 * }
                 * 
                 * 补充写法1）scan _bake_names ref to smart-farm
                 */
                new BuilderModel({
                    prefixAsset: this.viewer_.prefixAsset_,
                    data: param.predefinedModel
                }).process(gltf.scene, after_predefined_)
            } else {
                after_predefined_()
            }
        })
    }


}

export {
    Builder
}