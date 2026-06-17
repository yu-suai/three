import { TextureLoader, LinearSRGBColorSpace } from "three"

const check_uv2_ = (meshes, depressWarning) => {
    if (!depressWarning) {
        if (meshes && meshes.length > 0) {
            meshes.forEach(m => {
                if (!m.geometry.attributes['uv2']) {
                    console.warn('mesh', m, 'has no uv2!')
                }
            })
        }
    }
}

// #20220603, 通过string或者直接引用变量
const find_map__ = (maps, map) => {
    if (typeof map === 'string') {
        return maps[map]
    } else {
        return map
    }
}

// meshes for validate!
const process_def_material_ = (def, material, maps, meshes, data) => {

    if (def.hasOwnProperty('map')) {
        if (def.map == null) {
            material.map = null
        } else {
            // let fm = maps[def.map]
            let fm = find_map__(maps, def.map)
            if (fm) {
                material.map = fm.tex_
            } else {
                console.warn('map未發現(map)', def.map)
            }
        }
    }
    if (def.hasOwnProperty('lightMap')) {

        check_uv2_(meshes, data.depressWarning)

        if (def.lightMap == null) {
            material.lightMap = null // 不太可能發生，目前導出來看！
        } else {
            // let fm = maps[def.lightMap]
            let fm = find_map__(maps, def.lightMap)
            if (fm) {
                material.lightMap = fm.tex_
                // material.lightMapIntensity = 10 // material.envMapIntensity
                // material.envMapIntensity = .9
            } else {
                console.warn('map未發現(lightMap)', def.lightMap)
            }
        }
    }
    if (def.hasOwnProperty('aoMap')) {

        check_uv2_(meshes, data.depressWarning)

        if (def.aoMap == null) {
            material.aoMap = null // 不太可能發生，目前導出來看！
        } else {
            // let fm = maps[def.aoMap]
            let fm = find_map__(maps, def.aoMap)
            if (fm) {
                if (data.aoMapLinearEncoding) { // #20220603,for kiwi
                    // fm.tex_.encoding = LinearEncoding
                    fm.tex_.colorSpace = LinearSRGBColorSpace
                    fm.tex_.needsUpdate = true
                }

                material.aoMap = fm.tex_
            } else {
                console.warn('map未發現(aoMap)', def.aoMap)
            }
        }
    }

    if (def.hasOwnProperty('lightMapIntensity')) {
        material.lightMapIntensity = def.lightMapIntensity
    }

    if (def.hasOwnProperty('aoMapIntensity')) {
        material.aoMapIntensity = def.aoMapIntensity
    }

    if (def.hasOwnProperty('envMapIntensity')) {
        material.envMapIntensity = def.envMapIntensity
    }

    if (def.hasOwnProperty('blending')) {
        material.blending = def.blending
    }

    if (def.hasOwnProperty('color')) {
        material.color = def.color
    }

    if (def.hasOwnProperty('opacity')) {
        material.opacity = def.opacity
    }

    // #20220404
    if (def.hasOwnProperty('metalness')) {
        material.metalness = def.metalness
    }

    if (def.hasOwnProperty('roughness')) {
        material.roughness = def.roughness
    }

    material.needsUpdate = true
}


const def_geo_process_ = (geo, m) => {

    // m.geometry
    let uv = m.geometry.attributes['uv']
    let uv2 = m.geometry.attributes['uv2']

    if (geo.swapUv) {
        if (uv && uv2) {
            m.geometry.attributes['uv'] = uv2
            m.geometry.attributes['uv2'] = uv
        }
    } else if (geo.uvToUv2) {
        if (uv) {
            console.log('geo.uvToUv2')
            m.geometry.attributes['uv2'] = uv
            // m.geometry.deleteAttribute('uv')
        }
    }

}

// from jx-map
// #20220126, for campus
class BuilderModel {

    constructor({ prefixAsset, data }) {
        this.prefixAsset_ = prefixAsset
        this.data_ = data
        // aoMapLinearEncoding
        this.data_.depressWarning = this.data_.depressWarning || false
    }

    process(o3d, onCompletion) {

        let maps = this.data_.maps
        if (maps) {

            Promise.all(
                Object.values(maps).map(map => {
                    return new Promise((resolv, reject) => {
                        new TextureLoader().load(`${this.prefixAsset_}/${map.url}`, tex => {
                            tex.flipY = false
                            // tex.encoding = sRGBEncoding
                            // tex.encoding = LinearEncoding // aoMap 在後續修正
                            tex.colorSpace = LinearSRGBColorSpace
                            tex.needsUpdate = true
                            map.tex_ = tex
                            resolv(tex)
                        }, null, () => {
                            reject()
                        })
                    })
                })
            ).then(() => {
                // console.log(maps)
                this.process_2_(o3d, onCompletion)
            })

        } else {
            this.process_2_(o3d, onCompletion)
        }
    }

    process_2_(o3d, onCompletion) {

        let maps = this.data_.maps

        {// #20220314, from vlab3-lab
            let mats_re = this.data_.materials_re // 未经测试！
            if (mats_re) {
                this.data_.materials = this.data_.materials || {}
                o3d.traverse(c => {
                    // if (c.isMesh) {
                    let matname = c.material.name
                    mats_re.forEach(d => {
                        if (d.re.test(matname)) {
                            this.data_.materials[matname] = Object.assign(
                                Object.assign({}, d),
                                this.data_.materials[matname]
                            )
                        }
                    })
                    // }
                })
            }
            let objs_re = this.data_.objects_re
            if (objs_re) {
                this.data_.objects = this.data_.objects || {}
                o3d.traverse(c => {
                    // if (c.isMesh) {
                    let cname = c.name
                    objs_re.forEach(d => {
                        // console.log(d, cname, d.re.test(cname))
                        if (d.re.test(cname)) {

                            this.data_.objects[cname] = Object.assign(
                                Object.assign({}, d),
                                this.data_.objects[cname]
                            )
                        }
                    })
                    // }
                })
            }
        }

        let mats = this.data_.materials
        if (mats) {

            o3d.traverse(c => {
                if (c.isMesh) {
                    let mat = c.material
                    let fmat = mats[mat.name]
                    if (fmat) {
                        if (!fmat.material_) {
                            fmat.material_ = mat
                            // process!
                            fmat.meshes_ = [c]
                        } else {
                            fmat.meshes_.push(c)
                        }
                    }
                }
            })

            Object.values(mats).forEach(mat => {
                if (mat.material_) {

                    let def = mat
                    let geo = def.geo
                    if (geo) {
                        def.meshes_.forEach(m => {

                            def_geo_process_(geo, m)

                        })
                    }

                    process_def_material_(def, def.material_, maps, def.meshes_, this.data_)

                } else {
                    console.warn('未匹配的材質', mat)
                }
            })

        }

        // #20220126 for campus
        let objs = this.data_.objects
        if (objs) {

            o3d.traverse(c => {
                let fobj = objs[c.name]
                // console.log(c.name, fobj)
                if (fobj) {
                    fobj.o3d_ = c
                }
            })

            Object.values(objs).forEach(def => {
                if (def.o3d_) {
                    def.o3d_.traverse(c => {
                        if (c.isMesh) {
                            if (this.data_.objects_isolate_material) {
                                c.material = c.material.clone()
                            }

                            if (def.geo) {
                                def_geo_process_(def.geo, c)
                            }

                            process_def_material_(def, c.material, maps, [c], this.data_)
                        }
                    })
                } else {
                    console.warn('def o3d not found', def)
                }
            })


        }

        console.log('BUILDER MODEL', this.data_)

        onCompletion()
    }


}

export {
    BuilderModel
}