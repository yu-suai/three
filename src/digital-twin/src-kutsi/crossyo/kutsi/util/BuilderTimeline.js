
import { Vector3 } from 'three';

const easeInOutQuad = function (x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export {
    easeInOutQuad
}

class CommonTrack {
    //keyframes: []
    constructor() {
    }

    init_(track) {
    }

    update_({ kf1, kf2, ut, v }) {
        // let s1 = kf1.stage
        // let s2 = kf2.stage

    }

}

export {
    CommonTrack
}

const track_common_mixin = {
    init_() {
        this.kf_idx_ = 0
    },

    next_kf_idx_(kf_idx) {
        return (kf_idx + 1) % this.keyframes.length
    },

    update_(ct) {
        let kf_idx = this.kf_idx_
        let next_kf_idx = this.next_kf_idx_(kf_idx)
        let keyframes = this.keyframes
        let kf1 = keyframes[kf_idx]
        let kf2 = keyframes[next_kf_idx]
        for (let i = 0; i < keyframes.length; i++) {
            if (ct == kf1.time || (ct > kf1.time && ct < kf2.time)) {
                // console.log(`find ${i+1} times, ${kf_idx} - ${next_kf_idx}`)
                break;
            }
            kf_idx = next_kf_idx
            next_kf_idx = this.next_kf_idx_(kf_idx)
            kf1 = keyframes[kf_idx]
            kf2 = keyframes[next_kf_idx]
        }
        this.kf_idx_ = kf_idx

        //
        let ut = 0
        if (kf2.time > kf1.time) {
            ut = (ct - kf1.time) / (kf2.time - kf1.time)
        }

        let v = easeInOutQuad(ut)

        return {
            kf1,
            kf2,
            ut,
            v,
            ct,
        }
    }

}

// from jx-map
class BuilderTimeline {

    constructor({ viewer, data, trackObjects }) {
        this.viewer_ = viewer
        this.data1_ = data

        this.work_ = 0 // 1 work, 2, end

        this.total_time_ = 0
        this.data1_.tracks.forEach((track, i) => {
            let kfs = track.keyframes
            this.total_time_ = Math.max(this.total_time_, kfs[kfs.length - 1].time)
            //
            Object.assign(track, track_common_mixin)
            track.init_()

            let hasLookAt = false
            let hasStage = false
            kfs.forEach(kf => {
                hasLookAt |= kf.hasOwnProperty('lookAt')
                hasStage |= kf.hasOwnProperty('stage')
            })
            track.objects_ = []
            // TODO 完善名称实例匹配
            if (hasLookAt && trackObjects.lookAt) {
                trackObjects.lookAt.init_(track)
                track.objects_.push(trackObjects.lookAt)
            }
            if (hasStage && trackObjects.stage) {
                trackObjects.stage.init_(track)
                track.objects_.push(trackObjects.stage)
            }
        })

    }

    startup(startupTime) {
        this.work_ = 1
        this.time0_ = this.viewer_.u_time_.value
    }

    update(time) {
        if (this.work_ == 1) {
            let t = time - this.time0_

            // cycle time
            let ct = t % this.total_time_

            // console.log(ct)

            this.data1_.tracks.forEach((track, i) => {
                let calc = track.update_(ct)
                // console.log(calc)
                track.objects_.forEach(obj => {
                    obj.update_(calc)
                })
            })

        }
    }

}

export {
    BuilderTimeline
}
