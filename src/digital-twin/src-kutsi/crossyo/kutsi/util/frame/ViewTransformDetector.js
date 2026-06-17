import { Vector3 } from "three"

// #20220212, for smart-farm
// #20220626 ObserveCameraHelper -> ViewTransformDetector
// #20221216 shelves add useTarget = false
export class ViewTransformDetector {

    constructor(deltaRatio = 1 / 1000, useTarget = true) {

        this.deltaRatio_ = deltaRatio
        this.use_target_ = useTarget

        this.prev_pos_ = new Vector3()
        this.prev_tgt_ = new Vector3()

        this.prev_pos_1_ = new Vector3()
        this.prev_tgt_1_ = new Vector3()
    }

    roundVector3__(vec3, dist) {
        return new Vector3(Math.round(vec3.x / dist), Math.round(vec3.y / dist), Math.round(vec3.z / dist))
    }

    // 通知订阅
    // update(viewer, ) {
    // }

    // 计算返回
    updateResult(viewer) {

        let result = null

        let controls = viewer.controls_
        // let position = controls.object.getWorldPosition(new Vector3())
        let position = controls.object.position
        let target = controls.target
        // let dist = new Vector3().subVectors(position, target).length()
        let dist = viewer.controls_distance_.value

        // controls
        {

            let pos_1 = null
            let tgt_1 = null
            let delta = 0

            if (this.deltaRatio_ > 0) {

                delta = dist * this.deltaRatio_

                pos_1 = this.roundVector3__(position, delta)
                tgt_1 = this.use_target_ ? this.roundVector3__(target, delta) : null

            } else {

                pos_1 = position.clone()
                tgt_1 = this.use_target_ ? target.clone() : null

            }

            if (this.use_target_) {
                if (!pos_1.equals(this.prev_pos_1_) || !tgt_1.equals(this.prev_tgt_1_)) {
                    result = {
                        delta,
                        position,
                        target,
                        dist,
                    }

                    this.prev_pos_1_ = pos_1
                    this.prev_tgt_1_ = tgt_1
                }
            } else {
                if (!pos_1.equals(this.prev_pos_1_)) {
                    result = {
                        delta,
                        position,
                        // target,
                        // dist,
                    }

                    this.prev_pos_1_ = pos_1
                    // this.prev_tgt_1_ = tgt_1
                }
            }

        }

        return result
    }

}
