import { DTViewerBase } from "./DigitalTwinViewerBase"

import { xyz_2_vec3 } from "./util/Util"
// import { HeatmapMeshMaterial } from "./material/HeatmapMeshMaterial"
import { HeatmapMeshMaterial } from "kutsi-digital-twin/material/HeatmapMeshMaterial"

import { WrapperNode } from "./object/WrapperNode"

import { bake_inspection_start_ as bake_inspection_start_v1_, stop_inspection_ as stop_inspection_v1_ } from "./util/InspectionUtil"
import { bake_inspection_start_ as bake_inspection_start_v2_, stop_inspection_ as stop_inspection_v2_ } from "./util/InspectionUtil_v2"

import { set_mesh_glint, cancel_mesh_glint, cancel_all_mesh_glint } from './util/MeshGlint'
import { set_pipe_flow, cancel_pipe_flow, cancel_all_pipe_flow } from './util/PipeFlow'
import { set_pressure_gauge, cancel_pressure_gauge } from './util/PressureGauge'
import { set_conveyor_belt, cancel_conveyor_belt } from './util/ConveyorBelt'
import { set_packaging_conveyor_belt, cancel_packaging_conveyor_belt } from './util/PackagingConveyorBelt'
import { initModelAnimations, loadGoods, unloadGoods } from './util/RobotArmAnimation'

import { group_world_bbx_ } from "./util/Level2PositionTracer"
import { Vector3 } from "three"

export class DTViewer extends DTViewerBase {

	constructor(opts) {
		super(opts)

		if (opts.autoStartup !== false) {
			this.startup()
		}

		this.meshGlintData = {
			glintNodoNames: [],
			emissiveColor: '0xf2637b',
			flashDuration: 1000
		}
	}

	get loadWorking() {
		return this.load_working__
	}

	// -------------------------------------------------------------------------

	// 启用data dataPath时，urlModel用于区别不同加载
	load(model0) {

		if (!this.started_) {
			this.startup()
		}

		const model = Object.assign({}, model0)
		console.log('$$ load', model)

		if (model.hasOwnProperty('removeAll') && model.removeAll === false) {
			model.skipOptimization = this.get_optim_skip__() // keep prev
		}

		const { urlModel, initView, urlCover, data = null, dataPath = null, skipOptimization = false,
			// #20230709
			removeAll = true,
			noInitView = false,
			position = null,
			direction = null,
			scale = null,
      autoRotate = false,
		} = model
		if (!model.hasOwnProperty('fromShowNodesWithinModel')) {
			model.fromShowNodesWithinModel = false
		}

		if (this.load_working__) {
			return Promise.reject()
		}

		if (!model.fromShowNodesWithinModel) {
			// let isComsol = /.*\.vt.$/.test(urlModel)
			let isComsol = /.*\.vtu/.test(urlModel)
			// console.log('isComsol', isComsol)
			if (!isComsol) {
				this.emit('levelChange', { model })
			}
		}

		if (removeAll) {
			if (urlModel != this.prev_urlModel_) {

				this.load_working__ = true

				this.animationState_.whenUnload()

				this.enableRotate = true // #20230621

				this.picker_.emptyHits()
				this.l2_hl_.deactive()
				this.l2_pt_.end()
        this.sprite_html_?.clearTags()

				this.remove_comsol_()
				this.optim_clear_(!!this.prev_urlModel_)

				// TODO stop fly!

				if (initView) {
					this.updateViewerLookat({
						position: xyz_2_vec3(initView.position),
						target: xyz_2_vec3(initView.target),
						forceUpdateNearFar: false,
					})
				} else {

				}
				this.prev_urlModel_ = urlModel

				this.show_nodes_ = []
				return this.load_model_(urlModel, !!initView, urlCover, data, dataPath, skipOptimization, false, noInitView,
					position, direction, scale, removeAll, autoRotate)

			} else {
				this.show_nodes_all__()
				return Promise.resolve()
			}

		} else { // appendModel

			if (urlModel) {

				this.load_working__ = true

				if (initView) {
					this.updateViewerLookat({
						position: xyz_2_vec3(initView.position),
						target: xyz_2_vec3(initView.target),
						forceUpdateNearFar: false,
					})
				} else {
				}

				const urlCover = null
				return this.load_model_(urlModel, !!initView, urlCover, data, dataPath, skipOptimization, true, noInitView,
					position, direction, scale, removeAll, autoRotate)
			}

		}

	}

	showNodesWithinModel(nodes, model0) {
		const model = Object.assign({}, model0)
		model.fromShowNodesWithinModel = true // #20230709
		const { urlModel, initView, data = null, dataPath = null, skipOptimization = false,
			fromShowNodesWithinModel
		} = model

		console.log('$$ showNodesWithinModel', nodes, 'withModel', model)

		// console.log('# showNodesWithinModel', nodes, { urlModel, initView }, this.prev_urlModel_)
		if (urlModel != this.prev_urlModel_) {

			// reload model first
			return new Promise(resolve => {

				this.load({
					urlModel, initView, data, dataPath, skipOptimization,
					fromShowNodesWithinModel
				}).then(() => {
					this.emit('levelChange', { model, nodes })
					resolve(this.show_nodes_part_(nodes))
				})

			})

		} else {

			this.emit('levelChange', { model, nodes })

			this.picker_.emptyHits()
			this.l2_hl_.deactive()
			this.l2_pt_.end()
			return this.show_nodes_part_(nodes)

		}

	}

  showNodesByName(name) {
		this.picker_.emptyHits()
		this.l2_hl_.deactive()
		this.l2_pt_.end()
		const child = this.scene_.getObjectByName(name);
    console.log('$$ showNodesByName', name, child)
		let nodes = []
		if(child.isGroup) {
			child.children?.forEach((c) => {
				if (c.isMesh) {
					nodes.push(c.name);
				}
			});
		} else {
			nodes = [name]
		}
		return this.show_nodes_part_(nodes)
	}

  showNodes(nodes) {
		this.picker_.emptyHits()
		this.l2_hl_.deactive()
		this.l2_pt_.end()
		return this.show_nodes_part_(nodes)
	}

	// #20230709
	show_nodes_all_() {
		this.visible_nodes_all_()
	}

	// #20230709
	showNodesAll() {
		const model = {
			urlModel: this.prev_urlModel_,
			skipOptimization: this.get_optim_skip__(),
			fromShowNodesWithinModel: false,
		}
		this.emit('levelChange', { model })
		this.show_nodes_all__()
	}

	// #20230621
	// #20230709, @deprecated, synonyms move to .load()
	appendModel(model0) {
		const model = Object.assign({}, model0)
		console.log('$$ appendModel', model)
		model.removeAll = false
		this.load(model)
	}

	// #20230621
	get enableRotate() {
		return this.controls_.enableRotate
	}

	set enableRotate(v) {
		this.controls_.enableRotate = v
	}

	// -------------------------------------------------------------------------

	// default with over and highlight
	setupHitParentNodes(parentNodes = null) {

		console.log('$$ setupHitParentNodes', parentNodes)

		// parentNodes == null , 所有child mesh 都可以拾取！

		// clear previous hit
		this.picker_.emptyHits()

		if (parentNodes && parentNodes.length > 0) {
			// if (this.get_optim_skip__()) { // 园区

			this.get_root_().traverse(c => {
				if ((c.isMesh || c.isGroup) && parentNodes.indexOf(c.parent.name) >= 0) {
          if(c.isMesh) {
            this.picker_.pushHit(c)
          } else {
            c.children((o) => {
              this.picker_.pushHit(o)
            })
          }
				}
			})

		} else {

			this.get_root_().traverse(c => {
				if (c.isMesh) {
					this.picker_.pushHit(c)
				}
			})

		}


		// TODO 如果改为setupHitByShowNodes() 可以改为如下
		// if (this.show_nodes_.length > 0) {
		// } else {
		// }

		// console.log(this.picker_.hits_.arr)

	}

  // 手动传入需要拾取的节点，而非父节点

  setupHitByNodes(nodes) {
    nodes.forEach(node => {
      node.traverse(c => {
        if ((c.isMesh || c.isGroup)) {
          if(c.isMesh) {
            this.picker_.pushHit(c)
          } else {
            c.children?.forEach((o) => {
              this.picker_.pushHit(o)
            })
          }
        }
      })
    })
  }

	// -------------------------------------------------------------------------

	flyToView({ position, target, duration = 1.7, fov = 40 }) {

		// fov = 55

		console.log('$$ flyToView', position, target)

		// TODO stop control

		// console.log(this.camera_.fov)

		// #20240914, v2
		this.update_camera_near_far_(new Vector3().subVectors(position, target).length())

		this.flyTo({
			position: xyz_2_vec3(position),
			target: xyz_2_vec3(target),
			duration,
			fov,
		})

	}

	// -------------------------------------------------------------------------

	// {probes=[], autoLevel = true, levelLow = 0, levelHigh = 500}
	applyHeatmap(data) { // {probes:[]}

		// let mat = new MeshBasicMaterial({
		// 	color: 0xcccccc,
		// })

		// let env = this.scene_.environment
		// console.log(env)

		// let mat = new MeshStandardMaterial({
		// 	color: 0xcccccc,
		// 	// normalScale: new Vector2(1, -1),
		// 	// roughness: .2,
		// 	// flatShading: true, // false 造成变黑
		// })

		if (!this.mat_heatmap__) {
			this.mat_heatmap__ = new HeatmapMeshMaterial({
				color: 0xcccccc,
			})
		}

		// console.log('#new mat', mat)
		let root = this.get_root_()

		if (!root.use_heatmap__) {

			root.use_heatmap__ = true
			root.traverse(c => {
				if (c.isMesh) {
					// console.log(c.name, c.material)
					// c.material.map = null
					c.origin_mat_ = c.material

					c.geometry.computeVertexNormals() // or flatShading:true 
					// c.geometry.computeTangents()

					// {//compare?
					// 	Object.keys(c.material).forEach(k => {
					// 		let v1 = c.material[k]
					// 		let v2 = mat[k]
					// 		if (v1 != v2) {
					// 			console.log('#DIFF', k, v1, v2)
					// 		}
					// 	})
					// }

					c.material = this.mat_heatmap__ // 设置 flatShading
					// c.material = c.material.clone() // 正确

				}
			})

			// { // if debug point

			// 	let scene = root.parent
			// 	{
			// 		data.probes.forEach(p => {
			// 			let axes = new AxesHelper(.1)
			// 			axes.position.set(p.x, p.y, p.z)
			// 			scene.add(axes)
			// 		})
			// 	}

			// }

		}

		this.mat_heatmap__.applyHeatmap(data)

	}

	// -------------------------------------------------------------------------

	// { points = [], autoLevel = true, levelLow = 0, levelHigh = 500 }
	// #20230709, add position, scale?
	applyComsol(data) {

		console.log('$$ applyComsol', data)

		if (this.comsol__ && this.comsol__.applyComsol(data)) {
			if (!data.noInitView) {
				this.update_init_view__(this.comsol__)
			}
		}

	}

	// { segments = {vals:[], pts:[], connects:[]}, autoLevel = true, levelLow = 0, levelHigh = 500 }
	// #20230826, segments
	applyComsolSegments(data) {

		console.log('$$ applyComsolSegments', data)

		if (this.comsol__ && this.comsol__.applyComsolSegments(data)) {
			if (!data.noInitView) {
				this.update_init_view__(this.comsol__)
			}
		}
	}

	// { file = new File([blob]), levelLow = 0, levelHigh = 500 }
	// #20250708, position, scale?
	applyComsolStructuralMechanics(data) {
		console.log('$$ applyComsolStructuralMechanics', data)

		return this.disposeComsol(data)
	}

	remove_comsol_() {
		if (this.comsol__) {
			this.comsol__.clear_()
			this.comsol__ = null
		}
	}

	removeComsol() {
		console.log('$$ removeComsol')
		if (this.comsol__) {
			// this.get_root_().remove(this.comsol__)
			this.origin_root_.remove(this.comsol__)
		}
		this.remove_comsol_()
	}

	// -------------------------------------------------------------------------

	// {state: 0~1}
	toAnimation(opt) {

		console.log('$$ toAnimation', opt)

		this.animationState_.toAnimation(opt)

	}

	// -------------------------------------------------------------------------

	findWrapperNodeByName(name) {
		let find = null
		if (this.show_nodes_.length > 0) {
			this.show_nodes_.forEach(n => {
				n.traverse(c => {
					if (c.name == name) {
						find = c
					}
				})
			})
		} else {
			this.get_root_().traverse(c => {
				if (c.name == name) {
					find = c
				}
			})
		}
		if (find) {
			return WrapperNode.fromO3d(find, this)
		} else {
			return null
		}
	}

  setMeshHightLight(nodeName) {
    const child = scene.getObjectByName(nodeName);
    if (child) {
      if (child.isMesh && child.visible) {
        if (child.name === nodeName) {
          this.l2_hl_.active(child)
        }
      } else if (child.isGroup && child.visible) {
        if (child.name === nodeName) {
          child.children?.forEach((c) => {
            if (c.isMesh && c.visible) {
              this.l2_hl_.active(c)
            }
          });
        }
      }
    }
  }

	// 设备闪烁动画
	setMeshGlint(nodeNames) {
		set_mesh_glint(this.scene_, nodeNames)
	}
	cancelMeshGlint(nodeNames) {
		if(nodeNames?.length > 0) {
			cancel_mesh_glint(this.scene_, nodeNames)
		} else {
			cancel_all_mesh_glint(this.scene_)
		}
	}

	// 管道流动动画
	setPipeFlow(nodes) {
		set_pipe_flow(this.scene_, nodes)
	}
	cancelPipeFlow(nodes) {
		if(nodes?.length > 0) {
			cancel_pipe_flow(this.scene_, nodes)
		} else {
			cancel_all_pipe_flow(this.scene_)
		}
	}

	// 仪表盘动画
	setPressureGauge(targetName, targetValue) {
		set_pressure_gauge(this.scene_, targetName, targetValue)
	}
	cancelPressureGauge() {
		cancel_pressure_gauge(this.scene_)
	}

	// 传送带动画-散料皮带1
	setConveyorBelt(targetName, removeTarget) {
		set_conveyor_belt(this.scene_, targetName, removeTarget)
	}
	cancelPressureGauge() {
		cancel_conveyor_belt(this.scene_)
	}

	// 传送带动画-包装传送带
	setPackagingConveyorBelt(targetName, removeTarget) {
		set_packaging_conveyor_belt(this.scene_, targetName, removeTarget)
	}
	cancelPackagingConveyorBelt() {
		cancel_packaging_conveyor_belt(this.scene_)
	}

	// 机械臂动画
	setRobotArm() {
		let initialized = false;
		if(!initialized) {
			initModelAnimations(this.scene_);
			initialized = true;
		}
		loadGoods()
	}
	cancelRobotArm() {
		unloadGoods()
	}

	// -------------------------------------------------------------------------
	// #20231106 + devices, + distance
	// 有devices时，需要就近弹出设备信息
	// 没有devices时，单纯的走一遍
	inspectionStart({ points, eyeHeight = 1.75, speed = 2, distance = 10, devices = null,
		debug = false, beginTime = 0
	}, callbackT) {

		// debug = true
		// speed *= 10

		// 向前兼容，不要移除，调试可以在InspectionUtil_v2中修改
		if (debug) {
		} else {
			this.controls_.enabled = false
		}

		if (this.insp_1__) {

			const { tl, insp_1__ } = this.insp_1__
			console.log('tl.paused()', tl.paused())
			if (!tl.paused()) {
				tl.pause()
			} else {
				tl.resume()
			}

			return
		}

		// console.log(devices)

		if (devices) {

			// console.log(this.scene_, this.origin_root_, '\n', this.renderer_.pp_.scene2_, this.merge_root_, this.get_root_())

			const finds = {}
			devices.forEach(dev => {
				finds[dev.nodeName] = dev
			})

			// get_root_  origin_root_, merge_root_

			this.scene_.traverse(c => {
				const dev = finds[c.name]
				if (dev) {
					dev.o3d_ = c
					dev.bbx_ = group_world_bbx_(c)
				}
			})

			// #20231207, Fix
			devices = devices.filter(dev => (!!dev.o3d_))
			// console.log('## find devices', finds, devices)

		}

		const bake_inspection_start_ = bake_inspection_start_v2_
		this.insp_1__ = bake_inspection_start_({
			points, eyeHeight, speed, distance,
			camera_: this.camera_, debug,
			scene_: this.scene_, // scene 在第二遍渲染中，因此总在上面
			devices,
			viewer: this, // for emit event!
      beginTime,
		}, callbackT)

		console.log('#inspectionStart this.insp_1__', this.insp_1__)

		this.camera_.fov = 55
	}

	inspectionStop() {

		console.log('#inspectionStop', this.insp_1__)

		if (this.insp_1__) {
			const stop_inspection_ = stop_inspection_v2_
			stop_inspection_(this.insp_1__)
			this.insp_1__ = null
		}

		this.controls_.enabled = true

		this.camera_.fov = 40
	}


	// -------------------------------------------------------------------------
	// #20231106 switch state change
	// stats_switches_() {

	// 	const FIRST = 'GLKG'

	// 	const PARTs = [{ type: '220kV', re: /220kV.*GLKG/ } /*, { type: '220kV_b', re: /220kV.*GLKG/ }*/, { type: '500kV', re: /500kV.*GLKG/ }]
	// 	const stats = {}
	// 	const first_ = { count: 0 }
	// 	stats[FIRST] = first_

	// 	this.scene_.traverse(c => {
	// 		const name = c.name
	// 		if (!c.isMesh && name.indexOf('GLKG') > 0) {
	// 			first_.count++
	// 			const fn = PARTs.find(p => p.re.test(name))
	// 			if (fn) {
	// 				let fs = stats[fn.type]
	// 				if (!fs) {
	// 					fs = { fn, os: [] }
	// 					stats[fn.type] = fs
	// 				}
	// 				fs.os.push(c)
	// 			}
	// 		}
	// 	})

	// 	console.log('#STATS', stats)

	// 	//初步统计 GLKG 220kV,500kV
	// 	// ASB	479	159,264
	// 	// BJB	22	0,6
	// 	// LST	440	172,0
	// 	// TPB	348 122,0
	// 	// WLB	0
	// 	// XFB	486 236,210

	// }



}
