import BaseViewer, { registerClass } from "kutsi/BaseViewer"
import { BuilderEx } from "kutsi/util/BuilderEx"
import { AnimationClip, AnimationMixer, AxesHelper, Box3, BoxGeometry, BufferGeometry, Color, Mesh, Group, MeshBasicMaterial, MeshStandardMaterial, Object3D, Points, PointsMaterial, REVISION, Vector2, Vector3, Float32BufferAttribute } from 'three'

import Stats from 'three/examples/jsm/libs/stats.module'

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader'
import { VTULoader } from './loader/VTULoader'
// import { CSVLoader } from './loader/CSVLoader'
import { OptimizeUtil } from "./optimize/OptimizeUtil"
import { viewerOptimize0Mixin } from "./optimize/viewerOptimize0Mixin"
import { viewerOptimize2Mixin } from "./optimize/viewerOptimize2Mixin"
// import { ComsolPointsMaterial } from "./material/ComsolPointsMaterial"
import { ComsolPointsMaterial } from "kutsi-digital-twin/material/ComsolPointsMaterial"

import { COMSOL_VTU_CELL, COMSOL_VTU_POINT, OptimizeAlgorithm, USE_COMSOL } from "./core/define"
import { ComsolSegments } from "./object/ComsolSegments"
import { AnimationState } from "./util/AnimationState"
import { Level2Highlight } from "./util/Level2Highlight"
import { Level2PositionTracer } from "./util/Level2PositionTracer"
import { WrapperNode } from "./object/WrapperNode"
import { xyz_2_vec3 } from "./util/Util"
import ControlsAutoRotate from "./util/ControlsAutoRotate"
import { CreateDynamicHtmlTag } from "./util/CreateDynamicHtmlTag"

export class DTViewerBase
	extends BaseViewer {

	constructor(opts) {

		super(Object.assign({
			trend: {
				hdr: true,
			},
			picker: {
				useHitsArray: true,
				useMove: true,
				useHitVisible: false, // #20231114, for comsol zhuti
			},
			// manually_start_animate: true, // for loading
			// clzControls: FPSControls,
			clzBuilder: BuilderEx,
			useStats: false,

			// renderer: {
			// 	alpha: true,
			// 	// preserveDrawingBuffer: true,
			// }

		}, opts))

		// { // #20230626, force alpha:false, background with color for debug resize and other render problems
		// 	this.opts_.renderer.alpha = false
		// 	this.opts_.backgroundColor = 0x00ff00
		// }

		this.optim_create_()

		console.log('OPTS_', this.opts_)

		// let params = new URLSearchParams(location.search)

		this.draco_ = new DRACOLoader()
		this.draco_.setDecoderPath(`${this.prefixAsset_}/libs/draco/`)
		this.draco_.setDecoderConfig({ type: 'js' })

		this.draco_.preload()

		this.animationState_ = new AnimationState(this)

		this.l2_hl_ = new Level2Highlight()
		this.l2_pt_ = new Level2PositionTracer(this)
    this.sprite_html_ = new CreateDynamicHtmlTag(this)

		this.show_nodes_ = [] // level 1
		// show nodes 为 [], 需要遍历所有节点
		// show nodes 为 [ .. ], 遍历其中的子节点
    this.USE_COMSOL = USE_COMSOL
    this.resetStructuralMechanics()
	}
  
  set_use_comsol(t) {
    this.USE_COMSOL = t
    
	}
  
  resetStructuralMechanics() {
    this.StructuralMechanicsPointsGroup = new Group()
    this.StructuralMechanicsCsvData = []
    this.StructuralMechanicsHeaders = []
    this.StructuralMechanicsHeaderActive = null
  }

	startup() {
		super.startup()

		// #20230619, optim 多次渲染，目前要设成background null
		if (!this.opts_.backgroundColor) {
			this.scene_.background = null
		} else {
			this.scene_.background = new Color(this.opts_.backgroundColor)
		}


		this.controls_.enablePan = true

		this.controls_.minPolarAngle = Math.PI * 0.
		this.controls_.maxPolarAngle = Math.PI * .495

		if (this.opts_.useStats) {
			this.stats_ = new Stats()
			this.opts_.container.appendChild(this.stats_.dom)
			this.stats_.dom.style.position = 'absolute'
		}

		// 
		this.load_working__ = false
		this.name_mapping__ = {}

		this.picker_.on('movePick', o => {
			// console.log('downPick', o)
			let m = o.int0.object
			// console.log(m.name)

			this.l2_hl_.active(m)

		})

		this.picker_.on('movePickNone', () => {
			if (!this.l2_hl_.is_manually_) {// TEMP
				this.l2_hl_.deactive()
			}
		})

		this.picker_.on('downPick', o => {
			console.log('downPick', o)
			let int0 = o.int0
			if (int0) {

				let wn = WrapperNode.fromO3d(int0.object, this)
				wn.isHit = true
				wn.canvasPosition = this.l2_pt_.begin(int0)
				this.emit('hitNode', wn, o.int0.object)

			} else {

				this.emit('hitNode', { isHit: false })
				this.l2_pt_.end()

			}
		})

	}

	beginLoadSpecs() {

		let arr = super.beginLoadSpecs()

		arr.push({
			func: 'setupEnvEquirect', param: {
				url: `${this.prefixAsset_}/env/ninomaru_teien_1k.exr`, // exposure 1.7

				onAfter: tex => {
					this.scene_.environment = tex
				}
			}
		})

		// this.renderer_.toneMappingExposure = 1.7

		// arr.push({
		// 	func: 'setupModelGltf', param: {
		// 		path: `${this.prefixAsset_}/model/`,
		// 		name: `XFB.glb`, // 20 FPS

		// 		// name: `XFB-1-only-uvs.glb`,

		// 		// name: `XFB-1-draco.glb`, // require draco
		// 		// name: `XFB-1-merge.glb`, // 9 FPS

		// 		onAfter: o3d => {

		// 			this.scene_.add(o3d)
		// 		}
		// 	}
		// })

		// arr.push({
		// 	func: 'setupCustomization',
		// 	param: {
		// 		onDoing: next => {
		// 			let axes = new AxesHelper(10)

		// 			this.scene_.add(axes)

		// 			next()
		// 		}
		// 	}
		// })

		return arr
	}

	endLoadSpecs() {
		this.optim_end_load_spec_()
		this.emit('initCompletion')
	}

	update_init_view__(o3d, useInitView = false) {

		let bb3 = new Box3().expandByObject(o3d)
		let size = bb3.getSize(new Vector3())
		let size_len = size.length()

		// console.log('bb3', bb3, size)

		if (useInitView) {

			this.update_camera_near_far_(size_len)
			// console.log('size_len', size_len)
			this.init_size_len_ = size_len

		} else {
			// if no init view!

			let target = bb3.getCenter(new Vector3())

			this.updateViewerLookat({
				position: new Vector3(target.x + size_len, target.y + size_len * .5, target.z + size_len),
				target,
				forceUpdateNearFar: true,
			})

		}

	}


	// noInitView is more priority than useInitView, force dont use init view!
	load_model_(urlModel, useInitView, urlCover, data, dataPath, skipOptimization, isAppend = false, noInitView = false,
		position = null,
		direction = null,
		scale = null,
		removeAll = true,
    autoRotate = false,
    comsolCsv = null
	) {
		return new Promise((resolve, reject) => {

			const onLoad_completion = () => {
				if (removeAll) {
					this.show_nodes_all__()
				}
				this.load_working__ = false

				// TODO 起因，wrapper node 没有更新到最新位置，导致第一次加载完后，位置不准确
				setTimeout(() => {
					this.emit('loadProcess', { process: 1 })
					resolve()
				}, 100)

			}

			const onLoad = gltf => {

				// console.log('#onLoad', gltf)
				// if (gltf.isBufferGeometry) { // from VTU
				if (isComsol) {

					if (this.USE_COMSOL == COMSOL_VTU_POINT) {
						gltf = {
							scene: new Points(gltf, new ComsolPointsMaterial({
								color: 0xcc3333,
								// sizeAttenuation: true, // default
								// size: 1, // default
								// size: .1,
								size: .02,
							}))
						}
					} else if (this.USE_COMSOL == COMSOL_VTU_CELL) {
						gltf = {
							scene: new Mesh(gltf, new MeshStandardMaterial({
								color: 0xcc3333,
							}))
						}
						// } else if (USE_COMSOL == COMSOL_DATA_POINT) {
					} else {
						// else COMSOL_DATA_POINT
						// debug
						// gltf = {
						// 	scene: new Mesh(new BoxGeometry())
						// }
						// gltf.scene.add(new AxesHelper(3))
					}


					gltf.scene.rotation.set(- Math.PI / 2, 0, 0)

					// setTimeout(() => {
					// 	gltf.scene.visible = true
					// }, 1000)

				}

				let o3d = gltf.scene

				if (position) {
					let vpos = xyz_2_vec3(position)

					// let axes = new AxesHelper(10)
					// axes.position.copy(vpos)
					// this.get_root_().add(axes)

					o3d.position.copy(vpos)
				}
				if (direction) {
					let vdir = xyz_2_vec3(direction)
					// console.log('vdir', vdir)
					// o3d.rotation.setFromVector3(vdir, 'YXZ')
					o3d.rotation.setFromVector3(vdir)
				}
				if (scale) {
					let vscale = xyz_2_vec3(scale)
					o3d.scale.copy(vscale)
				}

				if (!isAppend) {
					this.origin_root_ = new Object3D() // o3d
					this.origin_root_.add(o3d)
					this.scene_.add(this.origin_root_)
					if (!noInitView) {
						this.update_init_view__(o3d, useInitView)
					}

					if (!skipOptimization) {
						let rpt_data = OptimizeUtil.report(urlModel, this.origin_root_)
						this.optim_apply_(rpt_data)
					} else {
						this.optim_skip_()
					}

				} else { // append 不会改变skipOptimization
					// this.get_root_().add(o3d)
					this.origin_root_.add(o3d)
					if (!noInitView) {
						this.update_init_view__(o3d, useInitView)
					}
				}

        if(autoRotate) {
					setTimeout(() => {
						this.auto_rotator = new ControlsAutoRotate(this);
					}, 1500)
				}

				// create node name mapping!
				this.name_mapping__ = {}
				this.scene_.traverse(n => {
					this.name_mapping__[n.name] = n
				})

				//

				this.animationState_.whenLoad(gltf)

				onLoad_completion()
			}

			// begin
			this.emit('loadProcess', { urlCover, process: 0 })

			// let isComsol = /.*\.vt.$/.test(urlModel)
			let isComsol = /.*\.vtu/.test(urlModel)
			
			let loader = null
      this.resetStructuralMechanics()
			if (isComsol) {

				if (USE_COMSOL == COMSOL_VTU_POINT
					|| USE_COMSOL == COMSOL_VTU_CELL
				) {
					loader = new VTULoader()
				} else /* if (USE_COMSOL == COMSOL_DATA_POINT)  */ {

					if (!this.comsol__) {
						// this.comsol__ = new Comsol()
						this.comsol__ = new ComsolSegments()
					}

					onLoad({
						scene: this.comsol__
					})
					return

				}

			} else if (comsolCsv) {
        return this.load_comsol_csv_(urlModel, comsolCsv, onLoad_completion)
			} else {

				loader = new GLTFLoader()
				loader.setDRACOLoader(this.draco_)
			}

			if (!data) {

				loader.load(urlModel, onLoad, xhr => {
					// console.log((xhr.loaded / xhr.total * 100) + '% loaded')
				}, err => {
					console.warn(err)
					this.load_working__ = false
					reject()
				})

			} else {

				loader.parse(data, dataPath, onLoad, err => {
					console.warn(err)
					this.load_working__ = false
					reject()
				})

			}

		})
	}

  async load_comsol_csv_(urlModel, comsolCsv, onLoad) {
    const response = await fetch(urlModel);

    const blob = await response.blob();

    // 从URL中提取文件名
    const fileName = urlModel.match(/\/?([^/]+)$/)?.[1];

    // 创建File对象
    const file = new File([blob], fileName, {
      type: 'text/csv', // blob.type
      lastModified: new Date().getTime()
    });

    // ------------------------------ url转file ------------------------------

    if(!file) return;

    this.applyComsolStructuralMechanics({
      file,
    }).then((e) => {
      // console.log(`applyComsolStructuralMechanics-e`, e);
      if(e?.status != 'ok') return
      const headers = e.headers || []
			this.emit('emitComsolCsv',  headers)
      this.renderPoints(comsolCsv?.active || undefined, false)
      onLoad(this.StructuralMechanicsPointsGroup)
    })
  }


	before_render_(time, delta) {
		this.animationState_.before_render_(time, delta)
		this.l2_pt_.before_render_(time, delta)
	}

	after_render_(time, delta) {
		if (this.stats_) {
			this.stats_.update()
		}
	}

	dispose() {

		this.draco_.dispose()

		super.dispose()

	}

	// #20240920, setOtherMaterial-设置初始的其它材质
	// #20240920, recoverAllMaterial-恢复成所有默认的材质
	setOtherMaterial(need_meshs = [], material_type) {
		this.scene_.traverse(child => {
			if(need_meshs.includes(child.name)) {
				// console.log(child);
				child.material = materials[material_type]
			}
		})
	}
	recoverAllInitMaterial() {}

	// #20250708, 结构力学 处理读取文件
	disposeComsol(data) {
		console.log(`disposeComsol:结构力学-处理读取文件`);
		return new Promise((resolve, reject) => {

			const reader = new FileReader();
			reader.onload = (event) => {
				const lines = event.target.result.split('\n');
				this.StructuralMechanicsHeaders = lines[0].trim().split(',');

				this.StructuralMechanicsCsvData = lines.slice(1).map(line => {
					const values = line.trim().split(',');
					let obj = {};
					this.StructuralMechanicsHeaders.forEach((h, i) => obj[h] = values[i]);
					return obj;
				});

				this.updateFieldSelect();
				// this.renderPoints('vonmises');
				resolve({
					status: 'ok',
					headers: this.StructuralMechanicsHeaders,
					csvData: this.StructuralMechanicsCsvData
				});
			}
			reader.readAsText(data?.file);
		})
	}
	// #20250708, 结构力学 文件表头
	updateFieldSelect() {
		console.log(`结构力学-表头信息:`, this.StructuralMechanicsHeaders);
	}
	// #20250709, 结构力学 加载
	renderPoints(field = 'vonmises', isReturn) {
    console.log(`结构力学-模型受力方向`, field, isReturn);
    if (!this.StructuralMechanicsCsvData.length || !this.StructuralMechanicsHeaders.includes(field)) return;

    const displacementScale = 0.1; // 放大倍率，可调整

    const positions = [];
    const colors = [];
    let minVal = Infinity, maxVal = -Infinity;

    // 创建包围盒来计算点云范围
    const boundingBox = new Box3();
    
    // 收集位置、并统计最大最小值
    this.StructuralMechanicsCsvData.forEach(row => {
			const x = parseFloat(row['x'] || row['X']);
			const y = parseFloat(row['y'] || row['Y']);
			const z = parseFloat(row['z'] || row['Z']);
			const val = parseFloat(row[field]);

			if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(val)) return;

			let dx = 0, dy = 0, dz = 0;
			// #20250709, 结构力学 位移,该功能暂时不上
			if (false && useDisplacement) {
					dx = parseFloat(row['displacement_X']) || 0;
					dy = parseFloat(row['displacement_Y']) || 0;
					dz = parseFloat(row['displacement_Z']) || 0;
			}

			const px = x + dx * displacementScale;
			const py = y + dy * displacementScale;
			const pz = z + dz * displacementScale;
			
			positions.push(px, py, pz);
			boundingBox.expandByPoint(new Vector3(px, py, pz));

			minVal = Math.min(minVal, val);
			maxVal = Math.max(maxVal, val);
    });

    // 设置颜色
    this.StructuralMechanicsCsvData.forEach(row => {
			const val = parseFloat(row[field]);
			const t = (val - minVal) / (maxVal - minVal);
			const color = this.getColorFromLUT(t);
			colors.push(color.r, color.g, color.b);
    });

    // 创建点云
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const material = new PointsMaterial({ size: 0.01, vertexColors: true });

    const points = new Points(geometry, material);
		points.scale.set(1/100, 1/100, 1/100); // 确保点云大小适中
    this.StructuralMechanicsPointsGroup.clear();
    this.StructuralMechanicsPointsGroup.add(points);
		this.StructuralMechanicsPointsGroup.scale.set(.07, .07, .07); // 确保点云大小适中
		this.StructuralMechanicsPointsGroup.rotation.set(-90, 0, 0); // 重置旋转

    if (!isReturn) {
      this.scene_.add(this.StructuralMechanicsPointsGroup);
    }
    // 计算最佳相机位置
    // this.adjustCameraToFit(boundingBox);
    
    return points;
  }

  // 调整相机位置和视角以适配点云
  adjustCameraToFit(boundingBox) {
    if (!boundingBox.isEmpty()) {
        const center = boundingBox.getCenter(new Vector3());
        const size = boundingBox.getSize(new Vector3());

        // 1. 计算物体的最长轴（X/Y/Z）
        const maxAxisLength = Math.max(size.x, size.y, size.z);

        // 2. 计算相机距离（确保完整包含物体）
        const fov = this.camera_.fov * (Math.PI / 180);
        let cameraDistance = maxAxisLength / (2 * Math.tan(fov / 2));

        // 3. 增加 20% 边距，避免物体紧贴边缘
        cameraDistance *= 1.2;

        // 4. 确保相机不会太近（避免透视变形）
        const minDistance = maxAxisLength * 0.5;
        cameraDistance = Math.max(cameraDistance, minDistance);

        // 5. 计算相机位置（从最长轴方向观察）
        let cameraPosition;
        if (maxAxisLength === size.x) {
            // X 轴最长，从 X 方向观察
            cameraPosition = new Vector3(center.x + cameraDistance, center.y, center.z);
        } else if (maxAxisLength === size.y) {
            // Y 轴最长，从 Y 方向观察
            cameraPosition = new Vector3(center.x, center.y + cameraDistance, center.z);
        } else {
            // Z 轴最长，从 Z 方向观察
            cameraPosition = new Vector3(center.x, center.y, center.z + cameraDistance);
        }

        // 6. 更新相机位置和朝向
        this.camera_.position.copy(cameraPosition);
        this.camera_.lookAt(center);
        this.camera_.updateProjectionMatrix();

        // 7. 更新轨道控制器目标（但不重置状态）
        if (this.controls_) {
            this.controls_.target.copy(center);
            this.controls_.update();
        }
    }
  }
	// #20250708, 结构力学 获取颜色映射
	getColorFromLUT(t) {
		// 定义一个比白色深一些的中间颜色（淡灰色）
		const midColor = new Color(0xcccccc);

		// 蓝色 -> 淡灰色 -> 红色 的颜色映射
		if (t < 0.5) {
			return new Color().lerpColors(new Color(0x0000ff), midColor, t * 2);
		} else {
			return new Color().lerpColors(midColor, new Color(0xff0000), (t - 0.5) * 2);
		}
	}
}

if (OptimizeAlgorithm == 0) {

	Object.assign(DTViewerBase.prototype, viewerOptimize0Mixin)

} else if (OptimizeAlgorithm == 2) {

	Object.assign(DTViewerBase.prototype, viewerOptimize2Mixin)

}

const materials = {
	fuzzyMaterial: new MeshStandardMaterial({
		color: 0xffffff,
		transparent: true,
		opacity: .06,
		depthTest: true,
	})
}

