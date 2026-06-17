import { Color } from "three"

// #20231207
export class GroupHighlight {

    constructor(o3d) {
        // dispose material immediate!
        // this.dmi_ = true
        this.o3d_ = o3d
    }

    // -------------------------------------------------------------------------
    // 目前没使用！
    active() {
        this.active_(this.o3d_)
    }

    deactive() {
        this.deactive_(this.o3d_)
    }

    // -------------------------------------------------------------------------

    active_(o3d) {
        // console.log('gh active', o3d, this.o3d_)
        o3d.traverse(c => {
            if (c.isMesh) {
                if (!c.orig_mat__) {
                    c.orig_mat__ = c.material
                }
                // console.log('group-light-active', c, !c.gh_mat__, !c.isGlinting)
                if (!c.gh_mat__ && !this.o3d_.isFlashing) { // isFlashing 外部设置闪烁效果, mess.isGlinting闪烁状态
                    const mat = c.orig_mat__.clone()
                    // mat.emissive = new Color(0x0a2f82)
                    mat.emissive = new Color(0x92E6FE)

                    mat.opacity = 1
                    c.material = mat
                    c.gh_mat__ = mat
                    // console.log('\t', c)
                }
            }
        })
    }

    deactive_(o3d) {
        o3d.traverse(c => {
            if (c.isMesh) {
                if (!c.orig_mat__) {
                    c.orig_mat__ = c.material
                }
                c.material = c.orig_mat__
                if (c.gh_mat__) {
                    c.gh_mat__.dispose()
                    c.gh_mat__ = null
                }
            }
        })
    }

    // -------------------------------------------------------------------------
    
    activeS2(scene) {

        this.o3d_.updateWorldMatrix(true, false)
        const m = this.o3d_.matrixWorld

        this.clone_o3d_ = this.o3d_.clone()
        m.decompose(
            this.clone_o3d_.position,
            this.clone_o3d_.quaternion,
            this.clone_o3d_.scale,
        )
        this.clone_o3d_.renderOrder = 10
        scene.add(this.clone_o3d_)

        this.active_(this.clone_o3d_)
    }

    deactiveS2(scene) {
        if (this.clone_o3d_) {

            this.deactive_(this.clone_o3d_)

            this.clone_o3d_.removeFromParent()
            this.clone_o3d_ = null
        }
    }

}

// -----------------------------------------------------------------------------

GroupHighlight.active = o3d => {

    if (!o3d.grp_1944__) {
        o3d.grp_1944__ = new GroupHighlight(o3d)
    }
    o3d.grp_1944__.active()

}

GroupHighlight.deactive = o3d => {

    if (!o3d.grp_1944__) {
        o3d.grp_1944__ = new GroupHighlight(o3d)
    }
    o3d.grp_1944__.deactive()

}

// -----------------------------------------------------------------------------
// active mesh from other scene!

GroupHighlight.activeS2 = (o3d, scene) => {

    if (!o3d.grp_1944__) {
        o3d.grp_1944__ = new GroupHighlight(o3d)
    }
    o3d.grp_1944__.activeS2(scene)

}

GroupHighlight.deactiveS2 = (o3d, scene) => {

    if (!o3d.grp_1944__) {
        o3d.grp_1944__ = new GroupHighlight(o3d)
    }
    o3d.grp_1944__.deactiveS2(scene)

}

// -----------------------------------------------------------------------------

