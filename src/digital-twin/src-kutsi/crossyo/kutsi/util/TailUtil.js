
export const TAIL_CURSOR = 1
// export const TAIL_TEXT = 2 // TODO

// #20220919, hvac
export class TailUtil {

    constructor(viewer, opts) {
        this.viewer_ = viewer
        this.content_ = null
        this.opts_ = Object.assign({
            type: TAIL_CURSOR,
        }, opts)
    }

    show(content = '') {
        if (content != this.content_) {
            this.content_ = content
            if (this.opts_.type == TAIL_CURSOR) {
                this.viewer_.container_.style.cursor = 'pointer'
            } // TODO else
        }
    }

    hide() {
        if (this.content_ != null) {
            this.content_ = null
            if (this.opts_.type == TAIL_CURSOR) {
                this.viewer_.container_.style.cursor = 'auto'
            } // TODO else
        }
    }

}