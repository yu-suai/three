import { Color } from "three"

// #20220210, from metro-l6/SkyDome uniforms
const mixin_props_from_uniforms = (mat, names) => {

    names.forEach(name => {
        if (mat.uniforms[name].value instanceof Color) {

            Object.defineProperty(mat, name, {
                get() { return '#' + this.uniforms[name].value.getHexString() },
                set(v) { this.uniforms[name].value.setStyle(v) }
            })

        } else {

            Object.defineProperty(mat, name, {
                get() { return this.uniforms[name].value },
                set(v) { this.uniforms[name].value = v }
            })

        }
    })

}

export {
    mixin_props_from_uniforms
}