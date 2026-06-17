
export class BaseNode {

    constructor(viewer, { nodeName }) {
        this.viewer_ = viewer
        if (nodeName) {
            this.o3d_ = this.find_by_name_(nodeName)
        }
    }

    // TODO cache here?
    find_by_name_(nodeName) {
        let f = null
        this.viewer_.scene_.traverse(n => {
            if (n.name == nodeName) {
                f = n
            }
        })
        return f
    }

}
