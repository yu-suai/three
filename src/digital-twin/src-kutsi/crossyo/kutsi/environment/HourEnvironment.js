import { BaseEnvironment } from "./BaseEnvironment"

import { PCFSoftShadowMap, DirectionalLight, Vector3, Object3D, AxesHelper, Matrix4, Euler } from 'three'

const default_opts_ = opts => {

    let hour = Object.assign({

        debug: false, // means debug axes

        useDirectionalLight: true,
        directionalLightIntensity: 1,

        useShadow: true,
        shadowMapWidth: 2048 / 2,
        // shadowBasePlane: 0,
        light1_shadow_d_: 10, // 200,
        light1_target_pos_: new Vector3(),

        // TODO
        // nightRatio: .2, // 越小 晚上越黑

        hour: 9,
        month: 3,
    }, opts && opts.hour)

    opts = Object.assign({
    }, opts)

    opts.hour = hour
    return opts
}

// #20220623, from kutsi/util/Builder
export class HourEnvironment extends BaseEnvironment {

    constructor(viewer, opts) {
        super(viewer, default_opts_(opts))
    }

    setup() {
        return new Promise(resolve => {
            super.setup().then(() => {

                console.log('setup hour env!')

                let hour = this.opts_.hour

                this.month_ = this.opts_.hour.month
                this.hour_ = this.opts_.hour.hour

                this.renderer_exp_0_ = this.viewer_.renderer_.toneMappingExposure

                let light1 = null // sun light
                if (hour.useDirectionalLight) {
                    light1 = new DirectionalLight(0xffffff, hour.directionalLightIntensity)
                    this.viewer_.scene_.add(light1)
                }
                this.light1_ = light1

                this.light1_shadow_d_ = hour.light1_shadow_d_
                this.light1_target_pos_ = hour.light1_target_pos_

                if (hour.useDirectionalLight && hour.useShadow) {
                    this.viewer_.renderer_.shadowMap.enabled = true
                    this.viewer_.renderer_.shadowMap.type = PCFSoftShadowMap

                    light1.castShadow = true
                    light1.shadow.camera.near = 10
                    light1.shadow.camera.far = 10000
                    let d = this.light1_shadow_d_
                    light1.shadow.camera.left = -d
                    light1.shadow.camera.right = d
                    light1.shadow.camera.top = d
                    light1.shadow.camera.bottom = -d

                    light1.shadow.mapSize.width = hour.shadowMapWidth
                    light1.shadow.mapSize.height = hour.shadowMapWidth
                    //

                    let tgt = new Object3D()
                    tgt.position.copy(this.light1_target_pos_)
                    this.viewer_.scene_.add(tgt)
                    light1.target = tgt
                    this.light1_tgt_ = tgt
                }

                this.sunDelta__.hold = 'hour'
               
                this.update_light1_target_pos_()

                this.light1_i_0_ = 2.5

                this.light1_i_hour_ = 1
                this.light1_i_month_ = 1

                this.update_light1_i_()

                this.hour_ = hour.hour
                this.month_ = hour.month

                {
                    this.update_month_rel__()
                    this.update_sun_rel__()
                }

                // GUI
                const c_hour = hour

                // const guiChanged = () => {
                //     console.log('hour_update__')
                // }

                if (this.gui__) {

                    let fh = this.gui__.addFolder('hour')
                    fh.add(this, 'month', 0, 11, 1) // .onChange(guiChanged)
                    fh.add(this, 'hour', 0, 24, 1 / (24 * 6)) // .onChange(guiChanged)

                    if (hour.useDirectionalLight) {

                    }

                    if (hour.useDirectionalLight && hour.useShadow) {

                    }

                }

                this.base_update__()
                // guiChanged()

                resolve()
            })
        })
    }

    updateLight1TargetPos(pos) {
        this.light1_target_pos_.copy(pos)
        this.update_light1_target_pos_()
    }

    update_light1_target_pos_() {
        // this.light1_target_pos_

        if (this.light1_) {
            this.light1_.position.set(
                this.light1_target_pos_.x + this.sunDelta__.value.x,
                this.light1_target_pos_.y + this.sunDelta__.value.y,
                this.light1_target_pos_.z + this.sunDelta__.value.z
            )

            this.light1_tgt_.position.copy(this.light1_target_pos_)
        }
    }

    // -------------------------------------------------------------------------

    update_light1_i_() {
        this.viewer_.renderer_.toneMappingExposure = this.renderer_exp_0_
    }

    // -------------------------------------------------------------------------

    get exposure__() {
        return 1
    }

    // override
    update_light1_i_() {
        // console.log(
        //     this.light1_i_0_,
        //     this.light1_i_hour_,
        //     this.light1_i_month_,
        //     this.renderer_exp_0_,
        //     this.exposure__
        // )
        if (this.light1_) {
            this.light1_.intensity = this.light1_i_0_ * this.light1_i_hour_ * this.light1_i_month_
        }
        this.viewer_.renderer_.toneMappingExposure = this.renderer_exp_0_ * (.2 + this.light1_i_hour_ * .8) * this.exposure__
        // console.log(
        //     this.light1_ ? this.light1_.intensity : null,
        //     this.viewer_.renderer_.toneMappingExposure
        // )
    }

    makeSunMatrix() {
        // month 6: 最小, 0: 最大
        return new Matrix4().makeRotationFromEuler(new Euler(
            (1 - this.month_t__) * .25 * Math.PI,
            0,
            (this.hour_ - 6) / 24 * Math.PI * 2, 'XYZ'
        ))
    }
    
   
    // -------------------------------------------------------------------------

    get hour() {
        return this.hour_
    }

    set hour(v) {
        if (v != this.hour_) {
            // console.log('set hour', v)
            this.hour_ = v
            this.update_sun_rel__()
            // console.log('\tpv', pv)

            this.update_light1_i_()
        }
    }


    // -------------------------------------------------------------------------

    get month() {
        return this.month_
    }

    set month(v) { // 0 ~ 11
        if (v != this.month_) {
            // console.log('set month', v)
            // 3, 6, 9, 0
            this.month_ = v
            this.update_month_rel__()
            this.update_sun_rel__()

            this.update_light1_i_()

        }
    }

    // -------------------------------------------------------------------------

    update_month_rel__() {
        this.month_t__ = .5 - .5 * Math.cos(this.month_ / 12 * Math.PI * 2) // 0 ~ 1 ~ 0
        this.light1_i_month_ = .5 + .5 * this.month_t__ // .5 ~ 1
    }

    update_sun_rel__() {
        let radius = this.light1_shadow_d_ * 2

        let delta = new Vector3(radius, 0, 0).applyMatrix4(this.makeSunMatrix())
        if (this.opts_.debug && this.opts_.hour.debug) {
            if (!this.pt_sun_) {
                this.pt_sun_ = new AxesHelper(100)
                this.viewer_.scene_.add(this.pt_sun_)
            }
            // console.log(this.light1_target_pos_, delta)
            this.pt_sun_.position.set(
                this.light1_target_pos_.x + delta.x,
                this.light1_target_pos_.y + delta.y,
                this.light1_target_pos_.z + delta.z
            )
            if (!this.pt_sun_target_) {
                this.pt_sun_target_ = new AxesHelper(1000)
                this.pt_sun_target_.position.copy(this.light1_target_pos_)
                this.viewer_.scene_.add(this.pt_sun_target_)
            }
        }

        if (this.sky_) {
            let sky_ufs = this.sky_.material.uniforms
            sky_ufs['sunPosition'].value.copy(delta)
        }

        if (this.light1_) {
            this.light1_.position.set(
                this.light1_target_pos_.x + delta.x,
                this.light1_target_pos_.y + delta.y,
                this.light1_target_pos_.z + delta.z
            )
        }
        let pv = Math.pow(delta.y / radius, .1)
        // this.light1_.intensity = pv * this.light1_i_hour_
        this.light1_i_hour_ = isNaN(pv) ? 0 : pv

        // return delta
        this.sunDelta__.value.copy(delta)
        this.update_sun_delta_()
    }


    // -------------------------------------------------------------------------



}