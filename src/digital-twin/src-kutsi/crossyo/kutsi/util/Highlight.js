
import * as THREE from 'three'

// for mesh group (start, count)
class Highlight {

    constructor() {

        this.prev_geo_ = null
        this.prev_start_ = -1

        this.mesh_ = new THREE.Mesh()
        // this.mesh_.material = new THREE.MeshBasicMaterial({
        //     color: 0xff0000,
        //     // depthWrite: false,
        //     depthTest: false,
        //     // wireframe: true,
        // })

        this.bb__ = null
    }

    show(geo, mg, pos) {

        if (this.prev_geo_ != geo || this.prev_start_ != mg.start) {
            this.prev_geo_ = geo
            this.prev_start_ = mg.start

            // console.log('show', geo, mg)

            let start = mg.start
            let end = start + mg.count
            let poss = geo.attributes.position

            let verts = []
            for (let i = start; i < end; i++) {
                verts.push(poss.getX(i), poss.getY(i), poss.getZ(i))
            }

            if (this.mesh_.geometry) {
                this.mesh_.geometry.dispose()
            }

            this.mesh_.visible = true

            let geo2 = new THREE.BufferGeometry()
            geo2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
            this.mesh_.geometry = geo2

            this.bb__ = null

            this.mesh_.position.copy(pos)
        }

    }

    get boundingBox() {
        if (!this.bb__) {
            let geo = this.mesh_.geometry
            if (geo) {
                geo.computeBoundingBox()
                this.bb__ = geo.boundingBox
            }
        }
        return this.bb__
    }

    hide() {

        if (this.prev_geo_ != null && this.prev_start_ != -1) {
            this.prev_geo_ = null
            this.prev_start_ = -1
            // console.log('hide')

            this.mesh_.visible = false

        }
    }

}

export {
    Highlight
}