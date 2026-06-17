import { Color } from 'three'

// 0 ~ 1
// 240 ~ 0
export const hsl_t_ = t => (new Color(`hsl(${Math.round((1 - t) * 240)}, 100%, 50%)`))

export class Histogram {

    constructor() {
        this.data_ = []
    }

    push(v) {
        this.data_.push(v)
    }

    report({ step = 10, filter = null }) {

        const d2 = filter ? filter(this.data_) : this.data_

        let min_ = Number.POSITIVE_INFINITY
        let max_ = Number.NEGATIVE_INFINITY
        d2.forEach(v => {
            if (v < min_) min_ = v
            if (v > max_) max_ = v
        })

        const step_func_ = (min, max, v) => {
            if (v == max) {
                return step - 1
            } else {
                const u = (v - min) / (max - min)
                return Math.floor(u * step)
            }
        }

        const to_range_ = (min, max, s) => {
            const vs = (max - min) / step
            // return [min + vs * s, min + vs * (s + 1)]
            return `${min + vs * s} - ${min + vs * (s + 1)}`
        }

        const dict = {}
        this.data_.forEach(v => {
            const s = step_func_(min_, max_, v)
            let f = dict[s]
            if (!f) {
                f = { count: 0, range: to_range_(min_, max_, s) }
                dict[s] = f
            }
            f.count++
        })

        // console.log('report 1', min_, max_)
        // console.log('report 2', dict)

        const equs = []
        this.data_.sort((d1, d2) => (d1 - d2))
        const delta = this.data_.length / step
        for (let i = 0; i < step; i++) {
            // Number.NEGATIVE_INFINITY 导致 json
            const min = i == 0 ? (-1e+38) : this.data_[Math.round(i * delta)]
            const max = i < (step - 1) ? this.data_[Math.round((i + 1) * delta)] : (1e+38)
            equs.push({ min, max })
        }
        // console.log('report 3', equs)
        return {
            min_,
            max_,
            dict,
            equs,
        }
    }

}
