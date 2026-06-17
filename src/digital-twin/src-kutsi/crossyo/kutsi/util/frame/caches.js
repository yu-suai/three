
import { Vector3 } from 'three'

export class ControlsDistance {

    constructor(v) { // viewer
        this.v_ = v
        this.value_ = 0
        this.valid_ = false
    }

    invalid() {
        this.valid_ = false
    }

    get value() {
        if (!this.valid_) {
            this.value_ = new Vector3().subVectors(
                this.v_.controls_.object.position,
                this.v_.controls_.target
            ).length()
            this.valid_ = true
        }
        return this.value_
    }
}
