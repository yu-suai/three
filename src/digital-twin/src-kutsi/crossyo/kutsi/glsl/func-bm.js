
export const bm_screen = {
    src: `
float bm_screen(float a, float b) {
    return 1. - (1. - a)*(1. - b);
}
    `,
    deps: null
}

export const bm_linear_burn = {
    src: `
float bm_linear_burn(float a, float b) {
    return max(0., a + b - 1.);
}
    `,
    deps: null
}

export const bm_linear_dodge = {
    src: `
float bm_linear_dodge(float a, float b) {
    return min(1., a + b);
}
    `,
    deps: null
}

export const bm_linear_light = {
    src: `
float bm_linear_light(float a, float b) {
    if (a<.5) {
        return bm_linear_burn(a*2., b);
    } else {
        return bm_linear_dodge(a*2. - 1., b);
    }
}
    `,
    deps: {
        bm_linear_burn,
        bm_linear_dodge,
    }
}