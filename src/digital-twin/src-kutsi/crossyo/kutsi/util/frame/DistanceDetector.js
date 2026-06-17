
class Log {

    constructor(n, onUpdate) {
        this.n_ = n
        this.onUpdate_ = onUpdate
        this.log_base_ = Math.log(n)
        this.prev_step_ = - 100
    }

    update(dist) {
        let log_dist = Math.log(dist) / this.log_base_
        let step = Math.floor(log_dist)
        if (step != this.prev_step_) {
            this.prev_step_ = step
            this.onUpdate_(dist, step)
        }
    }

}

/*
    this.distanceDetector_ = new DistanceDetector()
    this.distanceDetector_.setLog(10, dist => {
        // console.log('## log10 change', dist)
        this.update_camera_near_far_(dist)
    })
*/
// for kiwi
export class DistanceDetector {

    constructor() {
        this.logs_ = []
        this.prev_ = 0
    }

    setLog(n, onUpdate) {
        this.logs_.push(new Log(n, onUpdate))
    }

    // 通知订阅
    update(viewer) {
        let dist = viewer.controls_distance_.value
        if (dist != this.prev_) {
            this.logs_.forEach(log => { log.update(dist) })
            this.prev_ = dist
        }
    }

    // 计算返回
    // updateResult(viewer) {
    // }

    dispose() {
        this.logs_ = []
    }

}
