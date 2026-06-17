
import { ViewTransformDetector } from './ViewTransformDetector'

class BaseUpdateList {

    constructor() {
        this.list_ = []
    }

    push(obj) {
        this.list_.push(obj)
    }

    remove(obj) {
        let idx = this.list_.indexOf(obj)
        if (idx >= 0) {
            this.list_.splice(idx, 1)
        }
    }

    // 兼容 pamir
    remove_(obj) {
        this.remove(obj)
    }

    clear() {
        this.list_ = []
    }

    dispose() {
        this.list_ = []
    }

}

export class UpdateList extends BaseUpdateList {

    constructor() {
        super()
    }

    update(viewer, time, delta) {
        this.list_.forEach(itm => {
            // itm.update(dt, t)
            itm.update(delta, time) // 兼容 pamir 调用顺序
        })
    }
}

export class UpdateViewList extends BaseUpdateList {

    constructor() {
        super()
        this.detetor_ = new ViewTransformDetector(0)
        this.first_list_ = []
    }

    push(obj) {
        this.first_list_.push(obj)
    }

    update(viewer, time, delta) {

        let result = this.detetor_.updateResult(viewer)
        if (result) {
            this.list_.forEach(itm => {
                // itm.updateView(dt, t, isFirst, cam)
                itm.updateView(delta, time, false, viewer.camera_) // 兼容 pamir 调用顺序
            })
        }

        this.first_list_.forEach(itm => {
            itm.updateView(delta, time, true, viewer.camera_)
            this.list_.push(itm)
        })
        this.first_list_ = []

    }

    dispose() {
        this.first_list_ = []
        super.dispose()
    }

}
