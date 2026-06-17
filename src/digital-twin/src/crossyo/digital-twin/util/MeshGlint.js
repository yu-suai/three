import * as THREE from "three";

// 设置mesh闪烁
function set_mesh_glint(scene, nodeNames) {
  // console.log("set_mesh_glint", nodeNames);
  nodeNames?.forEach((nodeName) => {
    const child = scene.getObjectByName(nodeName);
    if (child) {
      if (child.isMesh && child.visible) {
        if (child.name === nodeName) {
          setChildGlint(child, scene);
        }
      } else if (child.isGroup && child.visible) {
        if (child.name === nodeName) {
          child.children?.forEach((c) => {
            if (c.isMesh && c.visible) {
              setChildGlint(c, scene);
            }
          });
        }
      }
    }
  });
}

// 取消mesh闪烁
function cancel_mesh_glint(scene, nodeNames) {
  // console.log("cancel_mesh_glint", nodeNames);
  nodeNames?.forEach((nodeName) => {
    const child = scene.getObjectByName(nodeName);
    if (child) {
      if (child.isMesh) {
        if (child.name.indexOf(nodeName) !== -1) {
          cancelChildGlint(child, scene);
        }
      } else if (child.isGroup) {
        if (child.name.indexOf(nodeName) !== -1) {
          child.children?.forEach((c) => {
            if (c.isMesh) {
              cancelChildGlint(c, scene);
            }
          });
        }
      }
    }
  });
}

// 设置模型节点闪烁
function setChildGlint(child) {
  // console.log("setChildGlint", child);

  if (!child.orig_mat___) {
    // 记录原始节点
    child.orig_mat___ = child.material.clone();
    child.orig_mat___.emissive = new THREE.Color(0x000000); // 巡视过程中或点击会有额外的颜色设置避免重叠，故重置
  }
  const mat = child.orig_mat___.clone();
  mat.emissive = new THREE.Color(0xf2637b); // 不需光源
  mat.transparent = true;
  mat.opacity = 1;
  // mat.depthFunc = THREE.AlwaysDepth; // 整个模型透视
  child.isGlinting = true; // 标记当前是否正在闪烁
  child.glinClock = new THREE.Clock(); // 用于计时
  // 将闪烁效果应用到模型
  child.material = mat;
  child.gh_mat__ = mat;

  startGlinting(child);
}

// 开启material循环闪烁
function startGlinting(child, flashDuration = 1000) {
  const clock = new THREE.Clock();

  function animate() {
    if (!child.isGlinting) {
      cancelChildGlint(child);
      return;
    }
    requestAnimationFrame(animate);

    // 获取自时钟创建以来经过的毫秒数
    const elapsed = clock.getElapsedTime() * 1000;

    // 计算完整的闪烁周期数
    const fullCycles = Math.floor(elapsed / flashDuration);

    // 计算当前是在奇数周期还是偶数周期
    const isOddCycle = fullCycles % 2 !== 0;

    // 设置网格的不透明度-达到闪烁效果
    child.material.opacity = isOddCycle ? 1 : 0.5;
  }

  animate();
}

// 手动停止所有闪烁
function cancel_all_mesh_glint(scene) {
  scene.traverse((child) => {
    if (child) {
      if (child.isMesh) {
        cancelChildGlint(child, scene);
      } else if (child.isGroup) {
        child.children?.forEach((c) => {
          if (c.isMesh) {
            cancelChildGlint(c, scene);
          }
        });
      }
    }
  });
}

// 停止material循环闪烁
function cancelChildGlint(child) {
  // console.log('cancelChildGlint', child)
  if (child.isGlinting || child.hasOwnProperty("isGlinting")) {
    delete child.isGlinting;
    child.glinClock && child.glinClock.stop();
    child.material = child.orig_mat___.clone();
    child.gh_mat__ = null;
  }

}

export { set_mesh_glint, cancel_mesh_glint, cancel_all_mesh_glint };
