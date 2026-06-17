
import { Box3, Vector3 } from "three"

export const viewerOptimize0Mixin = {

	optim_create_() { },

	optim_end_load_spec_() { },

	optim_clear_() {
		this.scene_.clear()
	},

	optim_apply_(rpt_data) { },

	optim_skip_() { },

	get_root_() {
		return this.origin_root_
	},

	// use for mixin, dont use constructor

	show_nodes_all__() {

		this.show_nodes_ = []
		this.scene_.traverse(c => {
			c.visible = true
		})

	},

	show_nodes_part_(nodes) {

		let ns = nodes.map(n => {
			return this.name_mapping__[n]
		}).filter(n => !!n)

		this.show_nodes_ = ns
		
		if (ns.length == 0) {
			console.warn(`nodes ${nodes} not found!`)

			// ?

		}

		let bbx = null
		this.scene_.traverse(c => {
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

