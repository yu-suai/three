if(isPerspective) {
    if (perspType == 2) { // no persp
        scale *= - mvPosition.z;
    } else if (perspType == 3) { // near far persp
        float mz = - mvPosition.z;
        scale *= mz;
        if(mz <= no_persp_near) {
            //scale *= 1;
        } else if(mz <= no_persp_far) {
            // near-far -> 1, no_persp_far_scale
            scale *= 1. + (mz - no_persp_near)/(no_persp_far - no_persp_near) * (no_persp_far_scale - 1.);
        } else {
            scale *= no_persp_far_scale;
        }
    }
}