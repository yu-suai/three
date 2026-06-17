
import { WebGLRenderer } from 'three'
import { Base_pp } from './Base_pp'

export class PPRenderer extends WebGLRenderer {

    constructor(opts) {
        super(opts)

        // console.log('## PRRenderer', opts)

        this.pp_ = null
        this.default_pp__ = new Base_pp()
    }

    setup__(viewer, scene, camera, cssRenderer) {
        this.viewer_ = viewer
        this.scene_ = scene
        this.camera_ = camera
        this.cssRenderer_ = cssRenderer
        this.use_pp__(this.default_pp__)
    }

    use_pp__(pp) {
        this.pp_ = pp
        this.pp_.renderer_ = this
        this.pp_.viewer_ = this.viewer_
        this.pp_.scene_ = this.scene_
        this.pp_.camera_ = this.camera_
        this.pp_.cssRenderer_ = this.cssRenderer_
        this.pp_.use()
    }

    use_pp_default__() {
        this.use_pp__(this.default_pp__)
    }

    setSize__(w, h) {
        // this.setSize(w, h)

        this.pp_.setSize(w, h)
    }

    render__() {
        this.pp_.render()
    }



}
