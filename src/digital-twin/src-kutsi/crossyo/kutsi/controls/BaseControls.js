import EventEmitter from 'events'

import { Vector3 } from 'three'

const STATE = {
    NONE: 0x00,
    PAN: 0x01,
    ROTATION: 0x02,
    ZOOM: 0x04,
    MOVE: 0x08,
    LOOK: 0x10,
}

/**
 * @class
 * @memberof module:pamir_base
 */
class BaseControls extends EventEmitter {

    constructor(object, domElement, opts) {
        super()
        this.object_ = object
        this.domElement_ = domElement
        this.opts_ = opts || {}

        // for reset!
        // this.position0
        // this.target0

        this.state_ = STATE.NONE

        this.enabled_ = true
        this.update_enabled_() // call by extended class

        // #20220610, 兼容 orbit
        this.position0 = new Vector3()
        this.target0 = new Vector3()
    }

    set object(v) {
        this.object_ = v
    }

    get object() {
        return this.object_
    }

    get enabled() {
        return this.enabled_
    }

    set enabled(v) {
        if (v != this.enabled_) {
            this.enabled_ = v
            this.update_enabled_()
        }
    }

    // #20220610, 兼容 orbit
    reset() {
        // use position0, target0
    }

    update_enabled_() {
    }

    reset() {
        // ref to orbit!
        if (this.position0) {
            this.object_.position.copy(this.position0)
        }
    }

    dispose() {
        this.enabled = false
    }

    // ---------------------------------------------------------------------------

    get state() {
        return this.state_
    }

    hasState(def_s) {
        return (this.state_ & def_s) > 0
    }

}

export default BaseControls

export {
    STATE
}