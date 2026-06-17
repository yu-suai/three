
// #20220612, for floor-deco
/*

        this.cm_ = new ControlsManagementInstances(this, {
            instances: { // instances + switchTo
                'orbit': { controls: this.controls_ },
                // maybe clz for lazy create / or create every time !
                'fps': { controls: new FPSa(this.camera_, this.renderer_.domElement) }
            },
            defaultInstanceName: 'orbit'
        })

*/
export class ControlsManagementInstances {

    constructor(viewer, opts) {
        this.viewer_ = viewer

        // ? simple version usage
        this.instances_ = opts.instances
        this.instance_name_ = null
        this.instance_ = null

        Object.values(this.instances_).forEach(i => {
            if (i.controls) {
                i.controls.enabled = false
            }
        })

        this.switchTo(opts.defaultInstanceName)

    }

    switchTo(name, opts) {
        opts = Object.assign({
            useCopyPrev: false
        }, opts)
        if (name != this.instance_name_) {
            let curr = this.instances_[name]
            if (curr) {

                let copy = null

                let prev = this.instance_
                if (prev) { // prev
                    if (prev.controls) {
                        prev.controls.enabled = false
                        if (opts.useCopyPrev) {
                            copy = {
                                position: prev.controls.object.position,
                                target: prev.controls.target,
                            }
                        }
                    }
                }

                this.instance_name_ = name
                this.instance_ = curr

                // curr
                // TODO ! curr.controls ? lazy create here!
                if (curr.controls) {
                    if (copy) {
                        console.log('use copy prev true', copy)
                        curr.controls.object.position.copy(copy.position)
                        curr.controls.target = copy.target.clone()
                    }
                    curr.controls.enabled = true
                    this.viewer_.controls_ = curr.controls
                }

            } else {
                console.warn('0dNBkfsQasdokmKw')
            }
        }
    }

    findInstance(name) {
        return this.instances_[name]
    }

}