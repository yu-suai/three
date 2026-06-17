
import { Box3, DynamicDrawUsage, Fog, InstancedMesh, MeshBasicMaterial, MeshDepthMaterial, Object3D, Vector3 } from "three"
import { Optimize2_pp } from "./Optimize2_pp"
import { Mesh } from "three";
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';

export const viewerOptimize2Mixin = {

	// use for mixin, dont use constructor

	optim_create_() {
		this.opts_.clzPostProcessing = Optimize2_pp
	},

	optim_end_load_spec_() {
		let pp = this.renderer_.pp_
		pp.scene2_.environment = this.scene_.environment
	},

	optim_clear_(status) {
    this.scene_.clear()
		let pp = this.renderer_.pp_
		pp.scene2_.clear()
    if(status) {
      // this.clearCSS3DScene(this.scene_);
      this.clearScene(this.scene_);
    }
	},

  disposeMesh(mesh) {
    if (mesh.geometry) {
        mesh.geometry.dispose();
    }
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => {
                if (material.map) material.map.dispose();
                material.dispose();
            });
        } else {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
        }
    }
  },

  clearScene(scene) {
      while (scene.children.length > 0) {
          const child = scene.children[0];
          if (child instanceof Mesh) {
              disposeMesh(child);
          }
          if (child instanceof CSS3DObject) {
              disposeCSS3DObject(child);
          }
          scene.remove(child);
      }
  },

  clearCSS3DScene(scene) {
    scene.children.forEach(child => {
        if (child instanceof CSS3DObject) {
            disposeCSS3DObject(child);
        }
    });
    // scene.clear(); // 从 Three.js 场景中移除所有对象
  },

  disposeCSS3DObject(cssObject) {
    if (cssObject instanceof CSS3DObject) {
        if (cssObject.element && cssObject.element.parentNode) {
            cssObject.element.parentNode.removeChild(cssObject.element);
        }
    }
  },

	optim_apply_(rpt_data) {

		if (this.scene_.children.length > 1) {
			console.warn('scene root more than 1!', this.scene_)
			return
		}

		// this.origin_root_ = this.scene_.children[0]
		this.origin_root_.updateMatrixWorld(true)

		// console.log(rpt_data.gs2_m)
		// {'uuid..':{gs:{geo_},rels:[Mesh, ..]}}

		let merge_root = new Object3D()
		merge_root.name = 'merge_root'
		this.merge_root_ = merge_root

		Object.values(rpt_data.gs2_m).forEach(v => {
			// console.log(v.gs.geo_, v.rels.length)

			// TODO 可能需要检查material 是否一致，目前暂不检查！
			// if (v.rels.length > 1) {
			let material = v.rels[0].material

			let geometry = v.gs.geo_
			// geometry.computeVertexNormals()

			let im = new InstancedMesh(geometry, material, v.rels.length)
			// im.instanceMatrix.setUsage(DynamicDrawUsage)

			v.rels.forEach((mesh, i) => {
				im.setMatrixAt(i, mesh.matrixWorld)
			})

			merge_root.add(im)

			// } else {
			// }

		})

		let pp = this.renderer_.pp_
		// console.log(merge_root)
		// this.scene_.add(merge_root)
		pp.scene2_.add(merge_root)

		// {
		// 	// test use fog
		// 	// this.scene_.fog = new Fog(0xefefef, 3, 30)
		// 	pp.scene2_.fog = new Fog(0xefefef, 3, 10)
		// }

		if (!this.over_mat1__) {
			this.over_mat1__ = new MeshBasicMaterial({
				color: 0x0,
				transparent: true,
				opacity: .07,
				depthTest: false, // 导致绘制过多而变慢，可以中心距离discard？
			})
		}

		// init to all!
		this.origin_root_.visible = false
		// this.merge_root_.visible = true

		// merge_scene 启用

		pp.skipOptimization = false
	},

	optim_skip_() {
		let pp = this.renderer_.pp_
		pp.skipOptimization = true
	},

	get_optim_skip__() {
		let pp = this.renderer_.pp_
		return pp.skipOptimization
	},

	get_root_() {
		return this.get_optim_skip__() ? this.origin_root_ : this.merge_root_
	},

  visible_nodes_all_() {
		this.show_nodes_ = []
    this.origin_root_.visible = true
    let pp = this.renderer_.pp_
			pp.scene2_.overrideMaterial = null
    this.origin_root_.traverse(c => {
      c.visible = true
    })
  },

	show_nodes_all__() {

		this.show_nodes_ = []
		if (!this.get_optim_skip__()) {

			this.origin_root_.visible = false
			// this.merge_root_.visible = true
			let pp = this.renderer_.pp_
			pp.scene2_.overrideMaterial = null

			// merge_scene 逐渐显示
		}

	},

	show_nodes_part_(nodes) {

		this.origin_root_.visible = true
		// this.merge_root_.visible = false
		let pp = this.renderer_.pp_
		pp.scene2_.overrideMaterial = this.over_mat1__

		// merge_scene 逐渐变淡


		//
		let ns = nodes.map(n => {
			return this.name_mapping__[n]
		}).filter(n => !!n)

		this.show_nodes_ = ns

		if (ns.length == 0) {
			console.warn(`nodes ${nodes} not found!`)

			// ?

		}

		let bbx = null
		this.origin_root_.traverse(c => {
			c.visible = false
		})
		ns.forEach(n => {
			n.traverse(c => {
				c.visible = true
			})
			n.traverseAncestors(p => {
				p.visible = true
			})

			if (bbx == null) {
				bbx = new Box3().expandByObject(n)
			} else {
				bbx.union(new Box3().expandByObject(n))
			}

		})

		if (bbx) {
			let target = bbx.getCenter(new Vector3())
			let len = bbx.getSize(new Vector3()).length()
			let position = new Vector3(-len, len * .5, len).add(target)
			// console.log('fly to', target, len)

			this.flyTo({
				target,
				position,
			})
		}

		return Promise.resolve()
	}

}

