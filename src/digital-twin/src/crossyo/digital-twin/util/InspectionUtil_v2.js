
import { ArrowHelper, Box3Helper, BufferGeometry, Color, Line, LineBasicMaterial, MathUtils, Matrix4, Triangle, Vector3 } from "three"
import { roundSegmentCorner } from "./CurveUtil"
import gsap from "gsap"
import { WrapperNode } from "../object/WrapperNode"
import { GroupHighlight } from "./GroupHighlight"
import { geo_world_bbx_, group_world_bbx_ } from "./Level2PositionTracer"


const pan_by_target_ = (viewer, tgt) => {
    const controls = viewer.controls_
    const delta = new Vector3().subVectors(controls.object.position, controls.target)

    controls.target.copy(tgt)
    controls.object.position.copy(new Vector3().addVectors(delta, tgt))
}

// bake动画path 并不是 bake动画（因为不包括时间）
// #20231106 + devices
// 有devices时，需要就近弹出设备信息
// 没有devices时，单纯的走一遍
// #20231106 + distance 触发观察事件的距离！
export const bake_inspection_start_ = ({ points, eyeHeight, speed, distance, camera_, devices = null, debug = false, scene_, viewer, beginTime = 0 }, callbackT) => {

    const TUNE = {
        OVERVIEW_LINE: debug,
        MANUAL_TIMELINE: false,
        BEGIN_U_TIME: beginTime,  // 0 ~ 1
        END_U_TIME: 1,  // 0 ~ 1
        COLLIDE_ONCE: true,
        USE_COUNT_DOWN: true,
        DEV_COUNT_DOWN: 4, // sec
        DEV_COUNT_DOWN_FADE: 0.4, // fade
    }

    //

    // TUNE.OVERVIEW_LINE = true
    // TUNE.MANUAL_TIMELINE = true
    // TUNE.BEGIN_U_TIME = 0.17
    // TUNE.END_U_TIME = 0.53 // 0.19 // 0.25
    // TUNE.END_U_TIME = 0.11 // route shengc 调试水位表

    // TUNE.COLLIDE_ONCE = false
    // ? USE_COUNT_DOWN 常开
    // TUNE.DEV_COUNT_DOWN = 2
    // TUNE.DEV_COUNT_DOWN_FADE = 0.2
    //

    if (TUNE.OVERVIEW_LINE) {
        viewer.controls_.enabled = true
    } else {
        viewer.controls_.enabled = false
    }

    // console.log('## inspection start', points)

    // bake animation for play

    const INSPECTION_ANGLE = 45
    const C_M2 = new Matrix4()
    C_M2.makeRotationAxis(new Vector3(0, 1, 0), -INSPECTION_ANGLE * Math.PI / 180) // 右转
    const C_M2_b = new Matrix4()
    C_M2_b.makeRotationAxis(new Vector3(0, 1, 0), INSPECTION_ANGLE * Math.PI / 180) // 左转

    const draw_pts_ = pts => {
        const geo = new BufferGeometry().setFromPoints(pts)
        scene_.add(new Line(geo, new LineBasicMaterial({
            color: 0x0000ff,
        })))
    }

    const pts = points.map(itm => new Vector3(...itm))

    // const LAND_HEIGHT = pts[0].y

    // console.log('pts', pts, LAND_HEIGHT)


    // 两种方法
    // 1）blender中 曲线 转 线段！直接使用 pts
    // 2）在corner 前后插入矫正控制点！参考 hvac / tube
    // 创建一个corner round curve
    // 3) CurvePath

    const cp = roundSegmentCorner({ pts, cornerRadius: .5 })
    // const cp = roundSegmentCorner({ pts, cornerRadius: .25 })
    if (cp) {

        const len = cp.getCurveLengths()
        const len_all = len[len.length - 1]
        const duration_all = len_all / speed
        const duration = duration_all * (TUNE.END_U_TIME - TUNE.BEGIN_U_TIME)

        console.log(`## len_all = ${len_all}, speed = ${speed}, duration_all = ${duration_all} `, pts)

        const pts2 = []
        const pt = new Vector3()
        const DIVS = 1000
        for (let i = 0; i <= DIVS; i++) {
            cp.getPoint(i / DIVS, pt)
            pts2.push(pt.clone())
        }

        // -----------------------------

        const c_s__ = {}
        const C_1_ = 0xaf0000
        const C_2_ = 0x00af00
        const C_3_ = 0x0000ff

        const debug_arrow_c_ = (c, pos, tgt) => {
            const sub = new Vector3(tgt.x - pos.x, tgt.y - pos.y, tgt.z - pos.z)
            const dist = sub.length()
            const dir = sub.normalize()
            let f_c = c_s__[c]
            if (!f_c) {
                f_c = new ArrowHelper(dir, new Vector3(0, 0, 0), dist, c)
                scene_.add(f_c)
                c_s__[c] = f_c
            } else {
                f_c.setDirection(dir)
                f_c.setLength(dist)
            }
            f_c.position.copy(pos)
        }

        if (TUNE.OVERVIEW_LINE) {
            draw_pts_(pts2)

            // 注视点bbx

            devices?.forEach(dev => {
                scene_.add(new Box3Helper(dev.bbx_))
            });

        }

        const util_ = {
            endPoint: null,
            endTarget: null,
            delta_: 1e10, //用于time update
        }
        // init
        util_.endPoint = pts[pts.length - 1]
        // util_.endPoint.y = LAND_HEIGHT + eyeHeight
        util_.endPoint.y += eyeHeight
        // util_.endTarget = (() => {
        //     const pt_e1 = pts[pts.length - 2]
        //     const pt_e0 = pts[pts.length - 1]
        //     // return new Vector3(pt_e0.x + (pt_e0.x - pt_e1.x), LAND_HEIGHT + eyeHeight, pt_e0.z + (pt_e0.z - pt_e1.z))
        //     return new Vector3(pt_e0.x + (pt_e0.x - pt_e1.x), pt_e0.y + (pt_e0.y - pt_e1.y) + eyeHeight, pt_e0.z + (pt_e0.z - pt_e1.z))
        // })()

        // -----------------------------
        const tl = gsap.timeline()

        // -----------------------------
        // int0 状态翻转的管理 

        let prev_int0_dev_ = null
        let wrapperNode = null
        let active_o3d_ = null
        const update_int0_ = (t, { pt, tgt }, int0) => {

            if (int0.dev != prev_int0_dev_) {

                // disable highlight, dispose material?
                if (active_o3d_) {
                    GroupHighlight.deactiveS2(active_o3d_, scene_)
                    active_o3d_ = null
                }

                if (TUNE.USE_COUNT_DOWN) {
                } else {
                    if (prev_int0_dev_) {
                        // console.log('#INT0 NOTHING')

                        tl.timeScale(1)

                        prev_int0_dev_.hitted__ = true
                        viewer.emit('inspectionNodeEnd')

                    }
                }

                if (int0.dev) {

                    if (TUNE.USE_COUNT_DOWN) {
                        // tl.timeScale(0) // 会停止更新
                        tl.timeScale(0.0001)
                        util_.dev_cd_ = TUNE.DEV_COUNT_DOWN + util_.delta_
                    } else {
                        tl.timeScale(.05) // #20231215
                    }

                    active_o3d_ = int0.dev.o3d_
                    wrapperNode = new WrapperNode(active_o3d_, viewer)
                    viewer.emit('inspectionNodeBegin', wrapperNode, scene_)

                    //highlight 
                    // console.log('active_o3d_', active_o3d_)
                    GroupHighlight.activeS2(active_o3d_, scene_)
                }

                prev_int0_dev_ = int0.dev
            }

            let tgt_blend_dev = tgt.clone()
            if (int0.dev) {
                // emit change!
                viewer.emit('inspectionNodePositionChange', wrapperNode)

                //TODO require cache
                const o3d = active_o3d_
                let bbx = null
                if (o3d.isMesh) {
                    bbx = geo_world_bbx_(o3d)
                } else {
                    bbx = group_world_bbx_(o3d)
                }

                // console.log(pt, pos)
                const tgt2 = bbx.getCenter(new Vector3())

                util_.dev_cd_ -= util_.delta_
                // console.log('##', util_.dev_cd_)
                if (util_.dev_cd_ > 0) {

                    // target 权重函数！
                    if (!util_.fade_) {
                        const fade = {}
                        const t0 = TUNE.DEV_COUNT_DOWN
                        const t1 = TUNE.DEV_COUNT_DOWN - TUNE.DEV_COUNT_DOWN_FADE
                        const t2 = TUNE.DEV_COUNT_DOWN_FADE
                        const t3 = 0

                        fade.curr_ratio = () => {

                            const t = util_.dev_cd_
                            let r = 1
                            if (t > t1) {
                                r = 1 - MathUtils.smootherstep(t, t1, t0)
                            } else if (t > t2) {
                            } else {  // t2 ~  t3
                                r = MathUtils.smootherstep(t, t3, t2)
                            }

                            // console.log('##', util_.dev_cd_, r)
                            return r
                        }
                        util_.fade_ = fade
                    }

                    tgt_blend_dev = new Vector3().lerpVectors(tgt, tgt2, util_.fade_.curr_ratio())

                } else {
                    // 结束！

                    tl.timeScale(1)

                    prev_int0_dev_.hitted__ = true // 配合ONCE，确保不会再击中
                    viewer.emit('inspectionNodeEnd')

                }

            }

            return { tgt_blend_dev }
        }

        // -----------------------------

        let insp_1__ = {
            t: TUNE.BEGIN_U_TIME,
            r: INSPECTION_ANGLE
        }

        if (TUNE.COLLIDE_ONCE) {
            devices?.forEach(dev => {
                dev.hitted__ = false
            })
        }

        const update_detect_ = (t, { pt, tgt }) => {
            // console.log('F', this.insp_1__.t)

            // v2 模拟雷达扇形
            let ray_tri = null
            let tgt_right = null
            {
                const m1 = new Matrix4()
                m1.lookAt(pt, tgt, new Vector3(0, 1, 0))

                const dir_l = new Vector3(0, 0, -1)
                dir_l.applyMatrix4(new Matrix4().multiplyMatrices(m1, C_M2))

                const dir_r = new Vector3(0, 0, -1)
                dir_r.applyMatrix4(new Matrix4().multiplyMatrices(m1, C_M2_b))

                if (TUNE.OVERVIEW_LINE) {
                    debug_arrow_c_(C_2_, pt, new Vector3(
                        pt.x + dir_l.x * distance,
                        pt.y + dir_l.y * distance,
                        pt.z + dir_l.z * distance
                    ))
                }

                tgt_right = new Vector3(pt.x + dir_l.x * distance, pt.y + dir_l.y * distance, pt.z + dir_l.z * distance)
                ray_tri = new Triangle(
                    // pt,
                    new Vector3(pt.x, pt.y - 3, pt.z),
                    tgt_right,
                    new Vector3(pt.x + dir_r.x * distance, pt.y + dir_r.y * distance, pt.z + dir_r.z * distance),
                )
            }

            const int0 = {
                dist: Number.MAX_VALUE,
                dev: null,
            }

            const f_dev = TUNE.COLLIDE_ONCE
                ? devices?.filter(dev => !dev.hitted__)
                : devices
            f_dev?.forEach(dev => {
                const int0_f = dev.bbx_.intersectsTriangle(ray_tri)
                if (int0_f) {
                    const dist = dev.bbx_.distanceToPoint(pt)
                    if (dist < int0.dist) {
                        int0.dist = dist // 更近的
                        int0.dev = dev

                        // console.log(int0)

                    }
                }
            })

            return int0
        }

        //
        const update_ = (t, dir) => {

            const pt = cp.getPoint(t)
            // pt.y = LAND_HEIGHT + eyeHeight
            pt.y += eyeHeight
            // const tt = t + dir * .01 // target 未来目标距离需要计算
            // TODO 按照距离反算！

            // 前导距离 1m
            const leading_m = 1
            const leading_ratio = leading_m / len_all

            const tt = t + dir * leading_ratio

            let tgt = null
            if (tt >= 0 && tt <= 1) {
                tgt = cp.getPoint(tt)
                tgt.y += eyeHeight

                const n = new Vector3().subVectors(tgt, pt).normalize()
                util_.keep_dir_n_ = n
                util_.keep_dir_ = n.clone().multiplyScalar(leading_ratio)

                // console.log(t, pt, tt, tgt, util_)

            } else {

                tgt = new Vector3().addVectors(pt, util_.keep_dir_)

                // console.log('## tt > 1', tgt)
            }


            util_.time_ = viewer.clock_.elapsedTime
            if (util_.delta_ == 1e10) {
                util_.delta_ = 0.01
            } else {
                util_.delta_ = util_.time_ - util_.prev_time_
            }
            util_.delta_ = Math.max(0.005, util_.delta_) // keep safe?

            const int0 = update_detect_(t, { pt, tgt })
            const { tgt_blend_dev } = update_int0_(t, { pt, tgt }, int0)

            util_.prev_time_ = util_.time_

            if (TUNE.OVERVIEW_LINE) {
                debug_arrow_c_(C_3_, pt, tgt_blend_dev) // 目光
                debug_arrow_c_(C_1_, pt, tgt) // 走路方向后绘制，优先

                pan_by_target_(viewer, tgt)

            } else {
                camera_.position.copy(pt)
                camera_.lookAt(tgt_blend_dev)
            }

            return { pt, tgt, tgt_blend_dev }
        }


        if (!TUNE.MANUAL_TIMELINE) {

            tl.to(insp_1__, {
                t: TUNE.END_U_TIME,
                duration,
                ease: 'none',
                // ease: 'steps(100)',
                onUpdate: () => {
                    callbackT(insp_1__.t)

                    update_(insp_1__.t, 1)
                }
            })
            // .to(insp_1__, {
            //     // delay: 1,
            //     r: - 180 + INSPECTION_ANGLE,
            //     duration: 4,
            //     ease: 'power4.inOut',
            //     onUpdate: () => {
            //         update_r_(insp_1__.r)
            //     }
            // })
            // .to(insp_1__, {
            //     t: 0,
            //     duration,
            //     // delay: 4,
            //     ease: 'none',
            //     onUpdate: () => {
            //         // console.log('B', insp_1__.t)
            //         update_(insp_1__.t, -1)
            //     }
            // })

        } else {


            // const id = Math.random()
            let tune_work_ = false

            let keep_ = null // keep update result
            TUNE.keytune_work_ = e => {
                // console.log(e)
                if (e.code == 'KeyT') {
                    tune_work_ = true
                } else if (e.code == 'KeyF') {
                    // pan_by_target_(viewer, keep_.pt)
                    console.log('## LOG TIME-LINE', insp_1__.t)
                }
            }
            TUNE.keyup_ = e => {
                if (e.code == 'KeyT') {
                    tune_work_ = false
                }
            }

            TUNE.wheel_ = e => {
                if (tune_work_) {
                    insp_1__.t += 0.00001 * e.deltaY
                    insp_1__.t = Math.max(TUNE.BEGIN_U_TIME, Math.min(insp_1__.t, TUNE.END_U_TIME))

                    // console.log('#', id, insp_1__.t)

                    keep_ = update_(insp_1__.t, 1)

                    // 假定是orbit controls

                    e.stopPropagation()
                    return false
                }
            }


            keep_ = update_(insp_1__.t, 1)

            // 如果影响到controls可以
            document.addEventListener('wheel', TUNE.wheel_)
            document.addEventListener('keydown', TUNE.keytune_work_)
            document.addEventListener('keyup', TUNE.keyup_)

        }

        insp_1__.TUNE = TUNE

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

    const { TUNE } = insp_1__
    if (TUNE.MANUAL_TIMELINE) {

        // console.log('##STOP MANUAL_TIMELINE', TUNE)

        document.removeEventListener('wheel', TUNE.wheel_)
        document.removeEventListener('keydown', TUNE.keytune_work_)
        document.removeEventListener('keyup', TUNE.keyup_)

    }

    gsap.killTweensOf(insp_1__)

}
