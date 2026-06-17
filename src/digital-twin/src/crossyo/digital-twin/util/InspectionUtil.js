
import { ArrowHelper, Box3Helper, BufferGeometry, Line, LineBasicMaterial, Triangle, Vector3 } from "three"
import { roundSegmentCorner } from "./CurveUtil"
import gsap from "gsap"
import { WrapperNode } from "../object/WrapperNode"
import { GroupHighlight } from "./GroupHighlight"

// bake动画path 并不是 bake动画（因为不包括时间）
// #20231106 + devices
// 有devices时，需要就近弹出设备信息
// 没有devices时，单纯的走一遍
// #20231106 + distance 触发观察事件的距离！
export const bake_inspection_start_ = ({ points, eyeHeight, speed, distance, camera_, devices = null, debug = false, scene_, viewer }) => {

    // console.log('## inspection start', points)

    // bake animation for play


    const INSPECTION_ANGLE = 45

    const draw_pts_ = pts => {
        const geo = new BufferGeometry().setFromPoints(pts)
        scene_.add(new Line(geo, new LineBasicMaterial({
            color: 0x0000ff,
        })))
    }

    const pts = points.map(itm => new Vector3(...itm))

    const LAND_HEIGHT = pts[0].y

    // console.log('pts', pts, LAND_HEIGHT)


    // 两种方法
    // 1）blender中 曲线 转 线段！直接使用 pts
    // 2）在corner 前后插入矫正控制点！参考 hvac / tube
    // 创建一个corner round curve
    // 3) CurvePath

    const cp = roundSegmentCorner({ pts, cornerRadius: .5 })
    if (cp) {

        const len = cp.getCurveLengths()
        const len_all = len[len.length - 1]
        const duration = len_all / speed
        console.log(`len_all = ${len_all}, LAND_HEIGHT = ${LAND_HEIGHT}, speed = ${speed}, duration = ${duration} `, pts)

        const pts2 = []
        const pt = new Vector3()
        const DIVS = 1000
        for (let i = 0; i <= DIVS; i++) {
            cp.getPoint(i / DIVS, pt)
            pts2.push(pt.clone())
        }

        // -----------------------------

        let debug_arrow__ = null
        const debug_arrow_ = (pos, tgt) => {
            const dir = new Vector3(tgt.x - pos.x, tgt.y - pos.y, tgt.z - pos.z).normalize()
            if (!debug_arrow__) {
                debug_arrow__ = new ArrowHelper(dir, new Vector3(0, 0, 0), distance)
                scene_.add(debug_arrow__)
            } else {
                debug_arrow__.setDirection(dir)
            }
            debug_arrow__.position.copy(pos)

        }
        if (debug) {
            draw_pts_(pts2)

            // 注视点bbx

            devices?.forEach(dev => {
                scene_.add(new Box3Helper(dev.bbx_))
            });

        }

        const util_ = {
            endPoint: null,
            endTarget: null,
            
            get_turn_tgt_: (pt, tgt, turn) => {// 三维空间计算不正确！
                const a0 = Math.atan2(tgt.z - pt.z, tgt.x - pt.x)
                const a1 = a0 + turn * Math.PI / 180.0
                const tgt2 = new Vector3(pt.x + Math.cos(a1), tgt.y, pt.z + Math.sin(a1))
                // console.log('get_turn_tgt_', turn, a0, a1, tgt2)
                return tgt2
            },
        }
        // init
        util_.endPoint = pts[pts.length - 1]
        util_.endPoint.y = LAND_HEIGHT + eyeHeight
        util_.endTarget = (() => {
            const pt_e1 = pts[pts.length - 2]
            const pt_e0 = pts[pts.length - 1]
            return new Vector3(pt_e0.x + (pt_e0.x - pt_e1.x), LAND_HEIGHT + eyeHeight, pt_e0.z + (pt_e0.z - pt_e1.z))
        })()

        // -----------------------------
        const tl = gsap.timeline()

        // -----------------------------
        // int0 状态翻转的管理 

        let prev_int0_dev_ = null
        let wrapperNode = null
        let active_o3d_ = null
        const update_int0_ = int0 => {

            if (int0.dev != prev_int0_dev_) {
                prev_int0_dev_ = int0.dev
                
                // disable highlight, dispose material?
                if (active_o3d_) {
                    GroupHighlight.deactiveS2(active_o3d_, scene_)
                    active_o3d_ = null
                }

                if (int0.dev) {
                    // console.log('#INT0 DEV', int0)
                    // hit?
                    // tl.timeScale(.25)
                    tl.timeScale(.1) // #20231215

                    active_o3d_ = int0.dev.o3d_
                    wrapperNode = new WrapperNode(active_o3d_, viewer)
                    viewer.emit('inspectionNodeBegin', wrapperNode)

                    //highlight 
                    GroupHighlight.activeS2(active_o3d_, scene_)
                } else {
                    // console.log('#INT0 NOTHING')
                    tl.timeScale(1)

                    viewer.emit('inspectionNodeEnd')
                }

            }

            if (int0.dev) {
                // emit change!
                viewer.emit('inspectionNodePositionChange', wrapperNode)
            }

        }

        // -----------------------------

        let insp_1__ = { t: 0, r: INSPECTION_ANGLE }

        const update_ = (t, dir) => {
            // console.log('F', this.insp_1__.t)

            const pt = cp.getPoint(t)
            pt.y = LAND_HEIGHT + eyeHeight
            const tt = t + dir * .01 // target 未来目标距离需要计算
            let tgt = null
            if (tt <= 1) {
                tgt = cp.getPoint(tt)
            } else {
                tgt = util_.endTarget
            }

            // if (tgt) {
            // TODO 计算转头的区段
            tgt.y = LAND_HEIGHT + eyeHeight
            // camera_.lookAt(tgt)
            //

            const tgt2 = util_.get_turn_tgt_(pt, tgt, INSPECTION_ANGLE)
            if (debug) {
                debug_arrow_(pt, tgt2)
            } else {
                camera_.position.copy(pt)
                camera_.lookAt(tgt2)
            }
            // }

            const vec_dir = new Vector3(tgt2.x - pt.x, tgt2.y - pt.y, tgt2.z - pt.z).normalize()
            const ray_tri = new Triangle(
                pt,
                new Vector3(pt.x + vec_dir.x * distance, pt.y - eyeHeight * 4, pt.z + vec_dir.z * distance),
                new Vector3(pt.x + vec_dir.x * distance, pt.y + eyeHeight * 4, pt.z + vec_dir.z * distance)
            )
            const int0 = {
                dist: Number.MAX_VALUE,
                dev: null,
            }
            devices?.forEach(dev => {
                const int0_f = dev.bbx_.intersectsTriangle(ray_tri)
                if (int0_f) {
                    const dist = dev.bbx_.distanceToPoint(pt)
                    if (dist < int0.dist) {
                        int0.dist = dist
                        int0.dev = dev
                    }
                }
            })

            update_int0_(int0)


        }

        const update_r_ = r => {
            // 0 ~ 180

            // TODO 计算末端方向

            const pt = util_.endPoint
            const tgt = util_.endTarget

            // 末端 0 to 180

            const tgt2 = util_.get_turn_tgt_(pt, tgt, r)
            tgt2.y = LAND_HEIGHT + eyeHeight
            if (debug) {
                debug_arrow_(pt, tgt2)
            } else {
                camera_.position.set(pt.x, LAND_HEIGHT + eyeHeight, pt.z)
                camera_.lookAt(tgt2)
            }

            update_int0_({ dev: null })
        }


        tl.to(insp_1__, {
            t: 1,
            duration,
            ease: 'none',
            // ease: 'steps(100)',
            onUpdate: () => {
                update_(insp_1__.t, 1)
            }
        }).to(insp_1__, {
            // delay: 1,
            r: - 180 + INSPECTION_ANGLE,
            duration: 4,
            ease: 'power4.inOut',
            onUpdate: () => {
                update_r_(insp_1__.r)
            }
        }).to(insp_1__, {
            t: 0,
            duration,
            // delay: 4,
            ease: 'none',
            onUpdate: () => {
                // console.log('B', insp_1__.t)
                update_(insp_1__.t, -1)
            }
        })

        return {
            tl, insp_1__, onStop: () => {
                if (active_o3d_) {
                    GroupHighlight.deactiveS2(active_o3d_, scene_)
                    active_o3d_ = null
                }
            }
        }

    } else {
        return null
    }

}

export const stop_inspection_ = ({ tl, insp_1__, onStop }) => {
    onStop()
    tl.kill()
    gsap.killTweensOf(insp_1__)
}
