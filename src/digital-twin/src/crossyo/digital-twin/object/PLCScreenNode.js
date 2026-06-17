import { CanvasTexture, Color, LinearSRGBColorSpace, MeshBasicMaterial } from "three"
import { BaseNode } from "./BaseNode"

class HTMLCanvasTexture {

    constructor(tex) {

        this.origin_ = tex.source.data // ImageBitmap
        const { width, height } = this.origin_

        let canvas = document.createElement('canvas')
        canvas.setAttribute('width', width)
        canvas.setAttribute('height', height)
        // TODO dispose!

        this.ctx_ = canvas.getContext('2d')

        this.tex_ = new CanvasTexture(canvas)
        this.tex_.flipY = false
        this.tex_.colorSpace = LinearSRGBColorSpace

        this.width_ = width
        this.height_ = height
    }

    get ctx() {
        return this.ctx_
    }

    get tex() {
        return this.tex_
    }

    get width() {
        return this.width_
    }

    get height() {
        return this.height_
    }

    get origin() {
        return this.origin_
    }
}

export class PLCScreenNode extends BaseNode {

    constructor(viewer, { nodeName, materialName }) {
        super(viewer, { nodeName })

        console.log('## PLC', this.o3d_)

        //try find some mesh with biggest texture

        {
            let f_mat = {
                o3d: null,
            }
            this.o3d_.traverse(n => {
                if (n.type == 'Mesh') {
                    const mat = n.material
                    if (mat.name == materialName) {
                        // const { width, height } = mat.map.source.data

                        f_mat.o3d = n
                    }
                }
            })
            if (f_mat.o3d != null) {
                // console.log('f_mat', f_mat)

                const mat = f_mat.o3d.material.clone()
                f_mat.o3d.material = mat

                // mat.emissive = new Color(1, 1, 1)
                mat.emissive = new Color(0.5, 0.5, 0.5)

                const tex = mat.map

                // mat.emissiveMap = tex
                // console.log('## PLCScreenNode mat', mat, tex) // tex.source.data

                this.canvas_ = new HTMLCanvasTexture(tex)
                mat.map = mat.emissiveMap = this.canvas_.tex

            }
        }

    }

    redraw(callback) {
        callback({
            ctx: this.canvas_.ctx,
            width: this.canvas_.width,
            height: this.canvas_.height,
            imgOrigin: this.canvas_.origin,
        })
        this.canvas_.tex.needsUpdate = true
    }

}
