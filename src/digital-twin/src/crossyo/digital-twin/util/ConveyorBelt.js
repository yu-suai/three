import gsap from "gsap";
import * as THREE from "three";

// 传送带路径（每个点包含位置和旋转）
const conveyorPath = [
  { position: [14.01, 1.47, -5.87], rotation: [0, 0, 0], duration: 3 }, // 散料皮带1开始/敏化机掉落
  { position: [7.32, 3.73, -5.88], rotation: [0, 0, 0], duration: 7 }, // 散料皮带1结束

  { position: [7.09, 3.42, -5.88], rotation: [0, 0, 0], duration: 1 }, // 散料皮带2起点
  { position: [4.15, 5.12, -5.88], rotation: [0, 0, -Math.PI / 4], duration: 3 }, // 散料皮带2终点

  { position: [3.78, 4.92, -5.88], rotation: [0, Math.PI / 4, 0], duration: 1 }, // 散料皮带4起点
  { position: [3.78, 4.92, -8.22], rotation: [0, Math.PI / 2, 0], duration: 3 }, // 散料皮带4终点
  { position: [3.74, 4.05, -8.51], rotation: [-Math.PI / 2, Math.PI, 0], duration: 1 }, // 终点
];

function set_conveyor_belt(scene, sourceModelName, modelsToRemove = []) {
  if (scene.userData.conveyorBeltInterval) {
    console.warn("⚠️ 传送带已在运行，忽略重复启动");
    return;
  }

  const interval = setInterval(() => {
    removeModels(scene, modelsToRemove);
    cloneAndAnimate(scene, sourceModelName);
  }, 1500);

  scene.userData.conveyorBeltInterval = interval;
  console.log("✅ 传送带启动");
}

// **删除指定的模型**
const removeModels = (scene, modelsToRemove) => {
  modelsToRemove.forEach((name) => {
    const model = scene.getObjectByName(name);
    if (model) {
      disposeModel(scene, model);
      console.log(`✅ 删除模型: ${name}`);
    } else {
      console.warn(`⚠️ 未找到模型: ${name}`);
    }
  });
};

// **释放模型资源**
const disposeModel = (scene, model) => {
  if (!model) return;
  scene.remove(model);
  if (model.isMesh) {
    model.geometry.dispose();
    model.material.dispose();
  } else if (model.isGroup) {
    model.children.forEach((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
};

// **克隆并执行动画**
const cloneAndAnimate = (scene, sourceModelName) => {
  const sourceModel = scene.getObjectByName(sourceModelName);
  if (!sourceModel) {
    console.warn(`未找到物体: ${sourceModelName}`);
    return;
  }

  const clonedModel = sourceModel.clone();
  clonedModel.name = `cloned_${sourceModelName}_${Date.now()}`;
  clonedModel.position.copy(sourceModel.position);
  clonedModel.rotation.set(0, 0, 0); // ✅ 重置旋转，防止意外旋转
  scene.add(clonedModel);

  console.log(`✅ 克隆物体: ${clonedModel.name}`);
  animateAlongPath(scene, clonedModel, conveyorPath);
};

// **沿路径执行动画**
const animateAlongPath = (scene, model, path, index = 0, isFirstStep = true) => {
  if (index >= path.length) {
    disposeModel(scene, model);
    console.log(`✅ 物体到达终点并移除: ${model.name}`);
    return;
  }

  const { position, rotation, duration } = path[index];

  // 计算目标四元数旋转
  const targetQuaternion = new THREE.Quaternion();
  targetQuaternion.setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));

  // 移动动画
  gsap.to(model.position, {
    x: position[0],
    y: position[1],
    z: position[2],
    duration: duration,
    ease: "power1.inOut",
    onComplete: () => {
      animateAlongPath(scene, model, path, index + 1, false);
    },
  });

  // 旋转动画，使用四元数
  if (!isFirstStep) {
    gsap.to(model.quaternion, {
      x: targetQuaternion.x,
      y: targetQuaternion.y,
      z: targetQuaternion.z,
      w: targetQuaternion.w,
      duration: duration,
      ease: "power1.inOut",
    });
  }
};

// **停止传送带**
// **停止传送带（仅停止复制，不影响已有物体的动画）**
function cancel_conveyor_belt(scene) {
  if (scene.userData.conveyorBeltInterval) {
    clearInterval(scene.userData.conveyorBeltInterval);
    delete scene.userData.conveyorBeltInterval;
    console.log("⛔ 传送带停止：不再生成新物体，已有物体继续运动");
  }
}

export { set_conveyor_belt, cancel_conveyor_belt };
