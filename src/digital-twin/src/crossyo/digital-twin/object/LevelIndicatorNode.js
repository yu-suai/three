import { BackSide, DoubleSide, MeshStandardMaterial, Vector3 } from "three"
import { BaseNode } from "./BaseNode"
import { geo_world_bbx_ } from "../util/Level2PositionTracer"

class BarMaterial extends MeshStandardMaterial {

    constructor(params) {
        super(params)

        this.u_val_ = {
            value: 0
        }

    }

    onBeforeCompile(shader, renderer) {

        // console.log(shader.vertexShader)
        // vWorldPosition 

        shader.uniforms.u_val = this.u_val_

        shader.vertexShader = shader.vertexShader.replace('void main() {', `
            varying vec3 vWPos;
            void main() {
        `)
        shader.vertexShader = shader.vertexShader.replace('}', `
                vWPos = (modelMatrix * vec4( transformed, 1.0 )).xyz;
            }
        `)

        // console.log(shader.fragmentShader)

        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
            varying vec3 vWPos;
            #include <common>
            uniform float u_val;
        `)

        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
            #include <color_fragment>
            // 
            diffuseColor.rgb = mix( vec3(0.0,0.85,1.0), diffuseColor.rgb, step(u_val, vWPos.y) );
        `)


    }

}

export class LevelIndicatorNode extends BaseNode {

    constructor(viewer, { min = 0, max = 70, bottomRatio = 0.038 / 1.114, topRatio = 0.037 / 1.114, value = 10,

        indicatorNodeName = null,
        tankNodeName = null,

    }) {
        super(viewer, { /*nodeName*/ })

        // console.log('## LevelIndicatorTank', indicatorNodeName, tankNodeName)

        this.min_ = min
        this.max_ = max

        this.value_ = 0

        const o3d_indicator_ = this.find_by_name_(indicatorNodeName)
        this.mat_indicator_ = null

        const o3d_tank_ = this.find_by_name_(tankNodeName)
        this.mat_tank_aqua_ = null

        if (o3d_indicator_ && o3d_indicator_.type == 'Mesh') {

            const bbx = geo_world_bbx_(o3d_indicator_)
            const size = bbx.getSize(new Vector3())
            const cnt = bbx.getCenter(new Vector3())

            // const r = (size.x * 0.7) / 2
            // const h = size.y * (1 - bottomRatio - topRatio)
            // console.log('## LevelIndicatorTank indicator cnt', cnt)

            this.y_min_ = cnt.y - size.y / 2 + bottomRatio * size.y
            this.y_max_ = cnt.y + size.y / 2 - topRatio * size.y

            this.mat_indicator_ = new BarMaterial().copy(o3d_indicator_.material)

            o3d_indicator_.material = this.mat_indicator_

        } else {
            console.warn(`## LevelIndicatorTank indicator [${indicatorNodeName}] not found!`)
        }

        if (o3d_tank_ && o3d_tank_.type == 'Mesh') {

            if (this.mat_indicator_) {
                // 依赖indicator的设置

                const mesh_aqua = o3d_tank_.clone()
                o3d_tank_.parent.add(mesh_aqua)

                this.mat_tank_aqua_ = new BarMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.75,
                    metalness: 0,
                    roughness: 0,
                    side: DoubleSide,
                })
                mesh_aqua.material = this.mat_tank_aqua_

                const mat_tank = o3d_tank_.material.clone()
                mat_tank.side = BackSide
                o3d_tank_.material = mat_tank

            } else {

                console.warn(`## LevelIndicatorTank tank [${tankNodeName}] depends on indicator!`)

            }

        } else {
            console.warn(`## LevelIndicatorTank tank [${tankNodeName}] not found!`)
        }


        this.value = value

    }

    set value(v) {
        this.value_ = v

        const u_v = (v - this.min_) / (this.max_ - this.min_) // 0~1
        const y = this.y_min_ + (this.y_max_ - this.y_min_) * u_v

        if (this.mat_indicator_) {
            this.mat_indicator_.u_val_.value = y
        }

        if (this.mat_tank_aqua_) {
            this.mat_tank_aqua_.u_val_.value = y
        }

    }

    get value() {
        return this.value_
    }

}



