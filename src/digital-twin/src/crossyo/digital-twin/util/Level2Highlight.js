import { Color } from "three"

// level 2 highlight
export class Level2Highlight {

	constructor() {
		this.prev_mesh_ = null
		this.is_manually_ = false
	}

	active(mesh, is_manually = false) {

		if (mesh && mesh.isMesh) {
			if (mesh != this.prev_mesh_) {
				this.deactive()

				this.is_manually_ = is_manually

				if (!mesh.orig_mat__) {
					mesh.orig_mat__ = mesh.material
				}

				let mat2 = mesh.material.clone()

				// mat2.emissive = new Color(0x2954b6)
				// mat2.emissive = new Color(0x0a2f82)
				// mat2.emissive = new Color(0x98BBF2)
				mat2.emissive = new Color(0x92E6FE)
				// console.log('light-active')

				mesh.material = mat2

				this.prev_mesh_ = mesh

				// console.log('active mesh', mesh)
			}
		} else {
			console.warn('Level2Highlight active error path Dw1KSa')
		}

	}

	deactive() {

		if (this.prev_mesh_) {
			// roll back to origin material
			this.prev_mesh_.material = this.prev_mesh_.orig_mat__
			this.prev_mesh_ = null
		}
	}

}

