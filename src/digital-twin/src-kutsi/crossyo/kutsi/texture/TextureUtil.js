import { TextureLoader } from 'three'

import w8 from './w8.png'
import t8 from './w8.png'
import c8 from './c8.png' // #20220123

let tex_w8_ = null
const get_tex_w8 = () => {
    if (!tex_w8_) {
        tex_w8_ = new TextureLoader().load(w8)
    }
    return tex_w8_
}

let tex_t8_ = null
const get_tex_t8 = () => {
    if (!tex_t8_) {
        tex_t8_ = new TextureLoader().load(t8)
    }
    return tex_t8_
}

let tex_c8_ = null
const get_tex_c8 = () => {
    if (!tex_c8_) {
        tex_c8_ = new TextureLoader().load(c8)
    }
    return tex_c8_
}

let keys_ = {}
const get_tex_by_key = (key, img) => {
    let f = keys_[key]
    if (!f) {
        f = new TextureLoader().load(img)
        keys_[key] = f
    }
    return f
}

export {
    get_tex_w8,
    get_tex_t8,
    get_tex_c8,
    get_tex_by_key,
}

