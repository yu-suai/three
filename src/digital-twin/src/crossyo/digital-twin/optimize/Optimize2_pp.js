import { Base_pp } from "kutsi/pp/Base_pp"
import { Scene } from "three"

export class Optimize2_pp extends Base_pp {

	constructor() {
		super()
		this.scene2_ = new Scene()

		this.skipOptimization = false // default!
	}

	setSize(w, h) {
		this.renderer_.setSize(w, h, true)
		this.cssRenderer_?.setSize(w, h)
		// console.log(`setSize ${w} x ${h}`)

	}

	use() {
		super.use()
		this.renderer_.autoClear = false
		// console.log('clear alpha', this.renderer_.getClearAlpha())
	}

	render() {

		if (!this.skipOptimization) {

			this.renderer_.render(this.scene2_, this.camera_)
			this.renderer_.clearDepth()

			this.cssRenderer_?.render(this.scene_, this.camera_)
			this.renderer_.render(this.scene_, this.camera_)


		} else {

			this.cssRenderer_?.render(this.scene_, this.camera_)
			this.renderer_.render(this.scene_, this.camera_)

		}


	}

}