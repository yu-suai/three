
const lib_ = (funcs, outputs) => {
    if (funcs) {
        return Object.keys(funcs).reduce((prev, func_name) => {
            if (!outputs[func_name]) {
                outputs[func_name] = true
                let func = funcs[func_name]
                return prev + lib_(func.deps, outputs) + func.src
            } else {
                return prev
            }
        }, '')
    } else {
        return ''
    }
}

export const lib = funcs => {
    return lib_(funcs, {})
}
