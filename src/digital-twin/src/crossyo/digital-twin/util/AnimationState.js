import { AnimationMixer, LoopOnce, LoopPingPong } from "three"

export class AnimationState {

	constructor(viewer) {
		this.viewer_ = viewer

		this.state_v_ = 0
	}

	whenLoad(gltf) {

		// console.log(gltf)
		let clips = gltf.animations
		if (clips && clips.length > 0) {

			if (this.mixer__) {
				console.warn('AOinpV')
			}

			const mixer = new AnimationMixer()

			this.mixer__ = mixer

			this.clips__ = clips

			// auto start!

			// {
			// 	// const clip = AnimationClip.findByName(clips, 'Animation')
			// 	const clip = this.clips__[0]

			// 	// console.log(clip)

			// 	const action = mixer.clipAction(clip, this.viewer_.get_root_())
			// 	action.play()
			// }


		}

	}

	before_render_(time, delta) {
		if (this.mixer__) {
			this.mixer__.update(delta)
		}
	}

	whenUnload() {
		if (this.mixer__) {
			// stop
			this.mixer__.stopAllAction()
			// let root = this.mixer__.getRoot()
			let root = this.viewer_.get_root_()
			// console.log('#release mixer with root', root)
			this.mixer__.uncacheRoot(root)
			this.mixer__ = null
		}

		// try release state animation
		this.state_v_ = 0
		this.state_0_ = null
		this.state_1_ = null
	}

	toAnimation(opt) {
		// console.log('to anim', opt)
		// if (opt.hasOwnProperty('state')) {
		// init state animation

		if (this.state_v_ != opt.state) {
			this.state_v_ = opt.state

			// console.log('switch', opt.state)

			const clip = this.clips__[0]

			if (opt.state == 1) {
				console.log('\tto 1')

				this.state_1_ = this.mixer__.clipAction(clip, this.viewer_.get_root_())
				this.state_1_.reset()
				this.state_1_.setLoop(LoopOnce)
				this.state_1_.timeScale = clip.duration
				this.state_1_.clampWhenFinished = true

				this.state_1_.play()
			} else { // 0
				console.log('\tto 0')

				this.state_0_ = this.mixer__.clipAction(clip, this.viewer_.get_root_())
				this.state_0_.paused = false
				this.state_0_.time = clip.duration
				this.state_0_.setLoop(LoopOnce)
				this.state_0_.timeScale = - clip.duration

				this.state_0_.play()
			}

		}

	}



}




