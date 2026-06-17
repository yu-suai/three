

// import { Mesh, SphereBufferGeometry, MeshStandardMaterial, MeshPhysicalMaterial, Object3D, AxesHelper } from 'three'
// #20230922 SphereBufferGeometry 在 156 中彻底变为 SphereGeometry
import { Mesh, SphereGeometry, MeshStandardMaterial, MeshPhysicalMaterial, Object3D, AxesHelper } from 'three'

import { registerClass } from '../BaseViewer'

class Tuning {

    constructor() {
        this.gui_ = null
    }

    create_env_ball = apply => {
        let ball = new Mesh(new SphereGeometry(.5, 64, 32), new MeshStandardMaterial({
            metalness: 1,
            roughness: 0,
        }))
        if (apply) {
            apply(ball)
        }
        return ball
    }
    
    create_sample_balls = apply => {
        const vals = [0, .125, .5, .875, 1]
        let grp = new Object3D()
        let vlen = vals.length
        let vlen2 = vlen / 2
    
        let geo = new SphereGeometry(.1, 64, 32)
    
        for (let i = 0; i < vlen; i++) {
            for (let j = 0; j < vlen; j++) {
                let ball = new Mesh(
                    geo,
                    // new MeshStandardMaterial({
                    new MeshPhysicalMaterial({
                        roughness: vals[i],
                        metalness: vals[j],
                        // clearcoat: 1,
                    })
                )
                ball.position.set(0, (j - vlen2 + .5) / 4, (i - vlen2 + .5) / 4)
                grp.add(ball)
            }
        }
        grp.add(new AxesHelper(1))
        if (apply) {
            apply(grp)
        }
        return grp
    }
    
    get gui() {
        if (!this.gui_) {
            if (registerClass.GUI) {
                this.gui_ = new registerClass.GUI()
            }
        }
        return this.gui_
    }

}

const ref = {
    tuning_: null
}

const getTuning = ()=>{
    if (!ref.tuning_) {
        ref.tuning_ = new Tuning()
    }
    return ref.tuning_
}

export {
    // create_env_ball,
    // create_sample_balls,
    getTuning,
}
