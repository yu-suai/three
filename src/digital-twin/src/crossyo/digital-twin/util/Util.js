import { Vector3 } from "three"

export const xyz_2_vec3 = ({ x, y, z }) => new Vector3(x, y, z)
export const vec3_2_xyz = vec3 => ({ x: vec3.x, y: vec3.y, z: vec3.z })

