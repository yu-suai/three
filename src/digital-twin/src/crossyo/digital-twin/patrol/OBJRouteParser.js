import { Box3, Vector3 } from 'three'
import { RouteModel } from './RouteModel'

const getAxisValue_ = (point, axis) => {
	if (axis === 'x') return point.x
	if (axis === 'y') return point.y
	return point.z
}

export class OBJRouteParser {
	static parsePoints(objText = '', opts = {}) {
		const sourcePoints = []
		String(objText || '').split(/\r?\n/).forEach(line => {
			const value = line.trim()
			if (!value.startsWith('v ')) return
			const parts = value.split(/\s+/)
			const x = Number(parts[1])
			const y = Number(parts[2])
			const z = Number(parts[3])
			if ([x, y, z].some(Number.isNaN)) return
			sourcePoints.push(new Vector3(x, y, z))
		})

		if (!sourcePoints.length) return []

		const axis = opts.axis || 'xz'
		const scale = Number(opts.scale ?? 1)
		const routeY = opts.y
		const shouldCenter = opts.center !== false
		let center = new Vector3()
		if (shouldCenter) new Box3().setFromPoints(sourcePoints).getCenter(center)
		if (opts.center instanceof Vector3) center = opts.center.clone()
		if (opts.center && typeof opts.center === 'object' && !(opts.center instanceof Vector3)) {
			center = new Vector3(Number(opts.center.x || 0), Number(opts.center.y || 0), Number(opts.center.z || 0))
		}

		return sourcePoints.map(point => {
			const x = getAxisValue_(point, axis[0] || 'x')
			const z = getAxisValue_(point, axis[1] || 'z')
			const cx = getAxisValue_(center, axis[0] || 'x')
			const cz = getAxisValue_(center, axis[1] || 'z')
			return new Vector3(
				(x - (shouldCenter ? cx : 0)) * scale + Number(opts.offsetX || 0),
				Number(routeY ?? point.y),
				(z - (shouldCenter ? cz : 0)) * scale + Number(opts.offsetZ || 0),
			)
		})
	}

	static parse(objText = '', opts = {}) {
		const points = OBJRouteParser.parsePoints(objText, opts)
		return new RouteModel(points, {
			fallbackY: Number(opts.y ?? 0),
			meta: points.map((point, index) => ({ id: String(index + 1), name: `P${index + 1}` })),
		})
	}
}

export const parse_obj_route_ = (objText, opts = {}) => OBJRouteParser.parsePoints(objText, opts)
