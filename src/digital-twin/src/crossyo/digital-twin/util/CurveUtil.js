import { CurvePath, LineCurve3, QuadraticBezierCurve3, Vector3 } from "three"

const get_v_back_ = (pt0, pt1, cornerRadius) => {
    let v = new Vector3(pt0.x - pt1.x, pt0.y - pt1.y, pt0.z - pt1.z).normalize()
    return new Vector3(pt1.x + v.x * cornerRadius, pt1.y + v.y * cornerRadius, pt1.z + v.z * cornerRadius)
}

export const roundSegmentCorner = ({ pts, cornerRadius = 1 }) => {

    const cp = new CurvePath()

    if (pts.length == 2) {
        cp.add(new LineCurve3(pts[0], pts[1]))

        return cp
    } else if (pts.length > 2) {

        for (let i = 1; i < pts.length; i++) {
            let pt0 = pts[i - 1]
            let pt1 = pts[i]
            if (i == 1) {// 直
                // pt0 - pt1a
                let pt1a = get_v_back_(pt0, pt1, cornerRadius)
                cp.add(new LineCurve3(pt0, pt1a))
            } else {// 弯，直
                // pt0a ~ pt0 ~ pt0b
                let pt0a = get_v_back_(pts[i - 2], pt0, cornerRadius)
                let pt0b = get_v_back_(pt1, pt0, cornerRadius)
                cp.add(new QuadraticBezierCurve3(pt0a, pt0, pt0b))

                // 直
                if (i < pts.length - 1) { // pt0b - pt1a
                    let pt1a = get_v_back_(pt0, pt1, cornerRadius)
                    cp.add(new LineCurve3(pt0b, pt1a))
                } else { // pt0b - pt1
                    cp.add(new LineCurve3(pt0b, pt1))
                }
            }
        }

        return cp
    } else { // 0, 1
        return null
    }
}
