const LazyBuilderDef = {
    func_after__: 'onAfter' // 兼容pamir写法，after可能与pamir中的ald_冲突，老版本可以定义为 'after'，可以参照subsoiling3d
}

export {
    LazyBuilderDef
}

export class LazyBuilder {

    constructor(builder) {
        this.builder_ = builder
        this.cache_ = {} // key, {subs:[], result:null, param}
    }

    run(def) {
        return new Promise(resolve => {
            // def:{func: '', param: {onAfter:r=>{}}}
            // call builder[func] (param,  next)

            let param = def.param
            let key = `${def.func}-${param.url || (param.path + ',' + param.name)}`
            let find = this.cache_[key]
            // console.log('## key', key, find)
            if (!find) {

                this.cache_[key] = find = { subs: [], result: null, param }
                find.subs.push(resolve)

                param[LazyBuilderDef.func_after__] = ret => {
                    find.result = ret
                }

                this.builder_[def.func](param, () => {
                    find.subs.forEach(r => {
                        r(find)
                    })
                    delete find.subs
                })
            } else {
                if (find.subs) {
                    find.subs.push(resolve)
                } else {
                    resolve(find)
                }
            }
        })
    }

}