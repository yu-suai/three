
// import * as THREE from 'three' // #20240226
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import gsap from 'gsap'

import EventEmitter from 'events'

import { Builder } from './util/Builder'
import { Picker } from './util/Picker'

import { PPRenderer } from './pp/PPRenderer'

import { ControlsDistance } from './util/frame/caches'
import { ACESFilmicToneMapping, Clock, Color, LinearSRGBColorSpace, LinearToneMapping, OrthographicCamera, PerspectiveCamera, Scene, Vector3 } from 'three'

export const registerClass = {
	// import { GUI } from 'three/examples/jsm/libs/dat.gui.module'
	GUI: null, // from r135, be removed!
}

export default class BaseViewer extends EventEmitter {

	constructor(opts) {

		super()

		this.is_wx_ = false
		// this.pixelRatio_ = window.devicePixelRatio //  兼容 wx base view 写法

		// #20220504, for mobile performance!
		this.pixelRatio_ = Math.min(2, window.devicePixelRatio)

		// ex. opt.renderer = { 
		// 		alpha: true,
		// 		// preserveDrawingBuffer: true,
		// }

		this.opts_ = Object.assign({
			trend: {
				// hdr: true,
				hdr: false,
			},
			picker: {
				useHitVisible: true, // material-account
				useHitsArray: false, // metro-l6 use assigned hits, even don't use it, set true for best performance
				useMeshGroup: false, // material-account mesh group
				useMove: false, // red-valley only use move, set true for move/over event
			},
			manually_start_animate: false, // red-valley
			clzControls: OrbitControls,
			fov0: 40, // #20220225, shelves, init fov

			clzBuilder: Builder, // #20220314, vlab3-lab

			clzPostProcessing: null, // #20220703, shelves v3 + FXAA

			useDraco: false, // #20240919

			prefixAsset: './asset' // #20240919
		}, opts)

		this.opts_.renderer = Object.assign({
			antialias: true
		}, opts.renderer)

		this.container_ = this.opts_.container
		this.prefixAsset_ = this.opts_.prefixAsset //  || './asset'

		// gsap.ticker.remove(gsap.updateRoot)
		this.disposed_ = false

		this.size_ = {
			w: 0,
			h: 0,
			pw: 0,
			ph: 0,
		}

		// this.builder_ = new Builder(this.opts_, this)
		this.builder_ = new this.opts_.clzBuilder(this.opts_, this)

		this.clock_ = new Clock()


		// for uniform
		this.u_time_ = {
			value: 0
		}

		this.render_work__ = true

		this.fly_to_sq__ = 0 // debug
	}

	startup() {

		// #20220207
		// #20220724, unsafe
		// window['prefab-tool-0207029'] = {
		//     viewer: this,
		//     THREE
		// }

		this.calc_size__()

		// this.renderer_ = new WebGLRenderer({ antialias: true })
		// this.opts_.clzPostProcessing ? false : true
		this.renderer_ = new PPRenderer(this.opts_.renderer)

		this.cssRenderer_ = new CSS3DRenderer();
		this.cssRenderer_.domElement.style.position = 'absolute';
		this.cssRenderer_.domElement.style.top = '0px';
		this.cssRenderer_.domElement.style.pointerEvents = 'none';
		// this.cssRenderer_.domElement.style.zIndex = '100'

		this.renderer_.setPixelRatio(this.pixelRatio_)
		this.renderer_.setSize(this.size_.w, this.size_.h)
		this.cssRenderer_.setSize(this.size_.w, this.size_.h)

		if (this.opts_.trend.hdr) {
			// this.renderer_.outputEncoding = sRGBEncoding

			// 			export const NoColorSpace = '';
			// export const SRGBColorSpace = 'srgb';
			// export const LinearSRGBColorSpace = 'srgb-linear';
			// export const DisplayP3ColorSpace = 'display-p3';
			// export const LinearDisplayP3ColorSpace = 'display-p3-linear';

			this.renderer_.outputColorSpace = LinearSRGBColorSpace
			//
			// this.renderer_.toneMapping = ReinhardToneMapping
			// this.renderer_.toneMapping = CineonToneMapping
			this.renderer_.toneMapping = ACESFilmicToneMapping
			this.renderer_.toneMappingExposure = 1.2
		} else {
			this.renderer_.toneMapping = LinearToneMapping
		}

		this.opts_.container.appendChild(this.renderer_.domElement)
		this.opts_.container.appendChild(this.cssRenderer_.domElement)


		this.camera_ = new PerspectiveCamera(this.opts_.fov0, this.size_.w / this.size_.h, .1, 1000)
		this.camera_.position.set(0, 0, 20)

		this.scene_ = new Scene()
		// this.scene_.background = new Color(0xbfe3dd)
		if (!this.opts_.renderer.alpha) { // #20241008
			this.scene_.background = new Color(0xeeeeee)
		} 

		this.renderer_.setup__(this, this.scene_, this.camera_, this.cssRenderer_)
		if (this.opts_.clzPostProcessing) {
			this.renderer_.use_pp__(new this.opts_.clzPostProcessing())
		}

		// {
		//     const renderScene = new RenderPass(this.scene_, this.camera_)
		//     const bloomPass = new UnrealBloomPass(new Vector2(w, h), 1.5, 0.4, 0.85)
		//     const composer = new EffectComposer(this.renderer_)
		//     composer.addPass(renderScene)
		//     composer.addPass(bloomPass)
		//     this.bloom__ = {
		//         composer
		//     }
		// }

		// window.onresize = () => {
		// #20230625, fix!
		this.on_resize___ = () => {
			// console.log('resize event', this.opts_.instanceName)
			this.resize_()
		}
		window.addEventListener('resize', this.on_resize___)
		this.resize_()

		// this.controls_ = new OrbitControls(this.camera_, this.renderer_.domElement)
		this.controls_ = new this.opts_.clzControls(this.camera_, this.renderer_.domElement)
		// this.controls_.target.set()
		// this.controls_.update()
		this.controls_.enableDamping = true
		this.controls_.enablePan = false

		this.controls_distance_ = new ControlsDistance(this)

		this.picker_ = new Picker(Object.assign({
			domElement: this.renderer_.domElement,
			viewer: this,
		}, this.opts_.picker))

		if (!this.opts_.manually_start_animate) { // use loading
			this.animate_()
		}

		// this.beginLoadSpecs().reduce((p, spec) =>
		//     p.then(() => new Promise(resolve => {
		//         // hook prefab?
		//         this.builder_[spec.func](spec.param, () => {
		//             resolve()
		//         })
		//     })),
		//     Promise.resolve()
		// ).then(() => {
		//     this.endLoadSpecs()
		// })

		this.build_specs__(this.beginLoadSpecs()).then(() => {
			this.endLoadSpecs()
		})

		this.dump_keydown__ = evt => {
			const dump_vec3_ = v => {
				// return `new Vector3(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`
				return `new Vector3(${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)})`
			}
			// console.log(evt)
			if (evt.altKey && evt.key == 'p') {
				// console.log(this.camera_)
				console.log(this.renderer_.info)
				console.log(`
					position:${dump_vec3_(this.controls_.object.position)},
					target:${dump_vec3_(this.controls_.target)},
                    direction:${dump_vec3_(this.controls_.object.getWorldDirection(new Vector3()))},
				`)

				if (this.dump_keydown_after__) {
					this.dump_keydown_after__()
				}
			}
		}
		window.addEventListener('keydown', this.dump_keydown__)

		// this.distanceDetector_ = 
	}

	build_specs__(arr) {
		return arr.reduce((p, spec) =>
			p.then(() => new Promise(resolve => {
				// hook prefab?
				this.builder_[spec.func](spec.param, resolve)
			})),
			Promise.resolve()
		)
	}

	calc_size__() {
		let w = this.container_.clientWidth
		let h = this.container_.clientHeight

		this.size_.w = w
		this.size_.h = h
		this.size_.pw = w * this.pixelRatio_
		this.size_.ph = h * this.pixelRatio_

		// console.log('calc_size__', this.opts_.instanceName, this.size_, this.container_)
	}

	resize_() {

		this.calc_size__()

		let aspect = this.size_.w / this.size_.h
		let cam = this.camera_
		if (cam instanceof PerspectiveCamera) {
			cam.aspect = aspect
			cam.updateProjectionMatrix()
		} else if (cam instanceof OrthographicCamera) {
			cam.left = - cam.frustum_size_ * aspect / 2
			cam.right = cam.frustum_size_ * aspect / 2
			cam.top = cam.frustum_size_ / 2
			cam.bottom = - cam.frustum_size_ / 2
			cam.near = cam.frustum_size_ / 1000
			cam.far = cam.frustum_size_ * 2
			cam.updateProjectionMatrix()
		} else {
			console.warn('unknow camera when resize_()', this.camera_)
		}

		this.renderer_.setSize__(this.size_.w, this.size_.h)

	}

	before_update_(time, delta) { }

	before_render_(time, delta) { }

	after_render_(time, delta) { }

	beginRender() {
		this.render_work__ = true
	}

	endRender() {
		this.render_work__ = false
	}

	animate_() {
		if (!this.disposed_) {
			requestAnimationFrame(() => { this.animate_() })

			// let time = performance.now() / 1000
			let delta = this.clock_.getDelta()
			let time = this.clock_.elapsedTime
			this.u_time_.value = time

			if (this.render_work__) {

				this.before_update_(time, delta)

				if (this.controls_.enabled) {
					this.controls_.update(delta) // for material-accounting/FlyControls
				}
				this.controls_distance_.invalid() // 即使没有enabled也需要更新，例如动画

				this.picker_.update()

				this.before_render_(time, delta)

				// this.renderer_.render(this.scene_, this.camera_)
				this.renderer_.render__()

				this.after_render_(time, delta)

			}

		}

	}

	// #20220228, for shelves
	changeControls(controls) {
		this.controls_.dispose()
		this.controls_ = controls
	}

	// #20221030, for shelves
	dispose_resource_() {

		let geos = {}
		let mats = {}
		let texs = {}

		this.scene_.traverse(c => {
			if (c.isMesh) {
				let gid = c.geometry.uuid
				let fg = geos[gid]
				if (!fg) {
					geos[gid] = c.geometry

				}
				let mid = c.material.uuid
				let fm = mats[mid]
				if (!fm) {
					mats[mid] = c.material
					Object.entries(c.material).forEach(([k, v]) => {
						if (v && v.isTexture) {
							let tid = v.uuid
							let ft = texs[tid]
							if (!ft) {
								texs[tid] = v
							}
						}
					})
				}

			}
		})

		// console.log(geos, mats, texs)
		// console.log(JSON.stringify(this.renderer_.info.memory))

		Object.values(geos).forEach(geo => geo.dispose())
		Object.values(mats).forEach(mat => mat.dispose())
		Object.values(texs).forEach(tex => tex.dispose())

		// setTimeout(() => {
		//     console.log(JSON.stringify(this.renderer_.info.memory))
		// }, 0)
	}

	dispose(force_dispose_resource = true) {

		if (force_dispose_resource) {
			this.dispose_resource_()
		}

		this.disposed_ = true
		this.controls_.dispose()
		this.picker_.dispose()
		window.removeEventListener('keydown', this.dump_keydown__)

		// #20230626
		window.removeEventListener('resize', this.on_resize___)

		this.renderer_.dispose()
	}

	update_camera_near_far_(len) {
		let log = Math.log10(len)
		let log1 = Math.floor(log) - 2
		let log2 = Math.ceil(log) + 2
		let near = Math.pow(10, log1)
		let far = Math.pow(10, log2)
		// console.log(cnt, size, len)
		console.log('near', near, 'far', far)
    if(isNaN(near) || isNaN(far)) {
      console.warn('update_camera_near_far_ NaN')
      return
    }
		this.camera_.near = near
		this.camera_.far = far
		this.camera_.updateProjectionMatrix()
	}

	// #20210622, new Box3().expandByObject(o3d)
	// #20230104, altitude 0 ~ 90deg
	updateViewerByBoundingBox(bb, scale = 1, phi = Math.PI / 4, theta = Math.PI / 4) {
		let cnt = bb.getCenter(new Vector3())
		let size = bb.getSize(new Vector3())
		let len = size.length() * scale
		this.update_camera_near_far_(len)
		this.controls_.target0 = cnt

		// this.controls_.position0 = new Vector3(-len, len, len).add(cnt)

		const SQRT_3 = Math.sqrt(3)
		let comp_len = SQRT_3 * len // 向前兼容
		this.controls_.position0 = new Vector3(
			- Math.sin(theta) * comp_len,
			Math.sin(phi) * comp_len,
			Math.cos(theta) * comp_len
		).add(cnt)

		this.controls_.reset()

		this.latest_bb__ = bb
	}

	// #20211122 metro-l6
	// #20211225 updateViwerFromTo to updateViewerLookat for jx-map
	updateViewerLookat({ position, target = new Vector3(0, 0, 0), forceUpdateNearFar = false }) {
		this.controls_.target0 = target.clone()
		this.controls_.position0 = position.clone()
		this.controls_.reset()
		if (forceUpdateNearFar) {
			this.update_camera_near_far_(new Vector3().subVectors(position, target).length())
		}
	}

	// #20211030
	beginLoadSpecs() {
		return []
	}

	endLoadSpecs() {

	}

	// #20211126, red-valley
	// #20220604, kiwi, add duration
	// #20220616, floor-deco, fov
	// #20221104, vmap, closeShorterTime for cinematic SquatZoom
	// #20221129, queue task, add try_fly_to_lq_
	// #20230701, remove try_fly_to_lq_, to force stop prev animation!
	flyTo({ position, target, duration = .8, fov = NaN, closeShorterTime = true }, completion = () => { }) {

		if (this.prev_fly_to__) {
			// console.log('#####', this.prev_fly_to__, this.prev_fly_to__.refIsCompletion.val)

			let isCompletion = this.prev_fly_to__.refIsCompletion.val
			if (!isCompletion) {
				const sq = this.prev_fly_to__.sq
				this.prev_fly_to__.tween.kill()
				this.prev_fly_to__.completion({ sq, isCompletion })
			}

		}

		this.fly_to_sq__++

		this.flyTo_({ position, target, duration, fov, closeShorterTime, sq: this.fly_to_sq__ }, completion)

	}

	flyTo_({ position, target, duration = .8, fov = NaN, closeShorterTime = true, sq }, completion = () => { }) {
		// console.log('## flyTo begin', sq)
		// console.log('## flyTo begin', position, target)
		this.controls_.enabled = false
		let controls = this.controls_
		let obj = Object.defineProperty((() => {
			let o = {
				t_: 0,
				pos0: controls.object.position.clone(),
				tgt0: controls.target.clone(),
				pos1: position.clone(),
				tgt1: target.clone(),
			}
			if (!isNaN(fov)) {
				o.fov0 = controls.object.fov
				o.fov1 = fov
				// console.log('flyTo use fov', o.fov0, o.fov1)
			}
			return o
		})(), 't', {
			get() {
				return this.t_
			},
			set(v) {
				this.t_ = v
				// 
				let cam = controls.object
				cam.position.copy(new Vector3().lerpVectors(this.pos0, this.pos1, this.t_))
				cam.lookAt(new Vector3().lerpVectors(this.tgt0, this.tgt1, this.t_))
				if (!isNaN(fov)) {
					// let ut = this.t_
					let ut = Math.sqrt(this.t_)
					cam.fov = this.fov0 + (this.fov1 - this.fov0) * ut
					cam.updateProjectionMatrix()
				}
			}
		})

		// #20220121, smart-farm, 没有变化时，可以取消操作！
		let real_duration = duration
		if (closeShorterTime) { // #20221104, vmap, cinematic SquatZoom
			let dpos2 = new Vector3().subVectors(obj.pos0, obj.pos1).lengthSq()
			let dtgt2 = new Vector3().subVectors(obj.tgt0, obj.tgt1).lengthSq()
			if (dpos2 > 1e-8 || dtgt2 > 1e-8) {
			} else {
				// #20220822, for hospital-hvac, BIM
				// 不执行 gsap.to 会出错，所以把duration改短即可
				real_duration = duration / 10
			}
		}

		let refIsCompletion = { val: false }
		this.prev_fly_to__ = {
			sq,
			tween: gsap.to(obj, {
				t: 1, duration: real_duration, onComplete: () => {
					controls.enabled = true
					controls.position0.copy(obj.pos1)
					controls.target0.copy(obj.tgt1)
					controls.reset()

					// console.log('#### flyTo end', sq)

					refIsCompletion.val = true
					completion({ sq, isCompletion: true })
				}
			}),
			completion,
			refIsCompletion,
		}



	}

}