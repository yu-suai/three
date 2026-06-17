import { Vector2, Vector3 } from "three"

const o3dToViewPosition = (viewer, o3d) => {
	let wpos = o3d.getWorldPosition(new Vector3())
	return wposToViewPosition(viewer, wpos)
}

const wposToViewPosition = (viewer, wpos) => {
	wpos.project(viewer.camera_)
	return new Vector2(
		Math.round((wpos.x + 1) * viewer.size_.w / 2),
		Math.round((1 - wpos.y) * viewer.size_.h / 2)
	)
}

export {
	o3dToViewPosition,
	wposToViewPosition,
}