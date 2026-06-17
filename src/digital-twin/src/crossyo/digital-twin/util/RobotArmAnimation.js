import { StickAnimator } from "./AnimationController";
import * as THREE from "three";

let yx_process_jqr_1_main, // 主体
  polySurface4340273_1, // 夹子组1
  polySurface4340273_2, // 夹子组2
  polySurface4340242_1, // 小臂组1
  polySurface4340242_2, // 小臂组2
  boom; // 大臂

let conveyorBelt;
let isInitialized = false; // 标志变量，确保位置调整逻辑只执行一次
let targetRotation = 0;
let isRotating = false;
let currentRotation = 0; // 当前累计的旋转角度
const rotationStep = Math.PI / 2; // 每次旋转 90 度

export function initModelAnimations(scene) {
  if(isInitialized) return
  isInitialized = true

  const originalModel = scene;

  // 计算模型几何中心并调整到原点
  const box = new THREE.Box3().setFromObject(originalModel);
  const center = new THREE.Vector3();
  box.getCenter(center);
  originalModel.position.sub(center);
  conveyorBelt = scene;

  const yx_process_jqr_1_dibudizuo = conveyorBelt.getObjectByName(
    "yx_process_jqr_1_dibudizuo"
  );
  yx_process_jqr_1_main = conveyorBelt.getObjectByName(
    "yx_process_jqr_1_main"
  );
  console.log(`yx_process_jqr_1_main `,yx_process_jqr_1_main);

  if (yx_process_jqr_1_main) {
    const box = new THREE.Box3().setFromObject(yx_process_jqr_1_dibudizuo);
    const center = new THREE.Vector3();
    console.log(yx_process_jqr_1_dibudizuo);
    
    box.getCenter(center);
    const d = yx_process_jqr_1_dibudizuo.position.clone()
    // 将组内所有子元素的位置偏移到相对中心点
    yx_process_jqr_1_main.children.forEach((child) => {
      child.position.sub(center);
    });

    d.x =  -18.361507
    d.y = 0.001814105
    d.z = -2.8464373200000003
    yx_process_jqr_1_dibudizuo.position.copy(d)
    // 设置组的位置为原中心点（保持全局位置不变）
    yx_process_jqr_1_main.position.copy(center);
    yx_process_jqr_1_main.position.y = 0.22814105;
  }

  //获取目标组
  polySurface4340273_1 = new StickAnimator(
    scene.getObjectByName("polySurface4340273_1")
  );
  polySurface4340273_2 = new StickAnimator(
    scene.getObjectByName("polySurface4340273_2"),
    false,
    [polySurface4340273_1],
    true
  );
  polySurface4340242_1 = new StickAnimator(
    scene.getObjectByName("polySurface4340242_1")
  );
  polySurface4340242_2 = new StickAnimator(
    scene.getObjectByName("polySurface4340242_2"),
    false,
    [polySurface4340273_1, polySurface4340273_2]
  );
  boom = new StickAnimator(
    scene.getObjectByName("polySurface4340261"),
    true,
    [
      polySurface4340242_2,
      polySurface4340242_1,
      polySurface4340273_1,
      polySurface4340273_2,
    ]
  );
}

export function rotateModelRight(state) {
  if (yx_process_jqr_1_main) {
    isRotating = true;
    currentRotation += rotationStep; // 累加旋转角度
    animateRotation(state == 1 ? 1 : -1);
  }
}

function animateRotation(direction = 1) {
  if (yx_process_jqr_1_main) {
    targetRotation += direction * (Math.PI / 2);
    const animate = () => {
      if (direction === 1) {
        if (yx_process_jqr_1_main.rotation.y < targetRotation) {
          yx_process_jqr_1_main.rotation.y += 0.03;

          // 强制保持组的全局位置不变
          const currentPosition = yx_process_jqr_1_main.position.clone();
          yx_process_jqr_1_main.updateMatrixWorld();
          yx_process_jqr_1_main.position.copy(currentPosition);

          requestAnimationFrame(animate);
        } else {
          yx_process_jqr_1_main.rotation.y = targetRotation;
          isRotating = false;
          currentRotation = targetRotation;
        }
      } else {
        if (yx_process_jqr_1_main.rotation.y > targetRotation) {
          yx_process_jqr_1_main.rotation.y -= 0.03;

          // 强制保持组的全局位置不变
          const currentPosition = yx_process_jqr_1_main.position.clone();
          yx_process_jqr_1_main.updateMatrixWorld();
          yx_process_jqr_1_main.position.copy(currentPosition);

          requestAnimationFrame(animate);
        } else {
          yx_process_jqr_1_main.rotation.y = targetRotation;
          isRotating = false;
          currentRotation = targetRotation;
        }
      }
    };
    animate();
  }
}

export function boomAnimation() {
  boom.animate("click");
}
export function forearmAnimation() {
  polySurface4340242_2.animate("click");
  polySurface4340242_1.animate("click");
}
export function polySurface4340242Animation() {
  polySurface4340273_2.animate("click");
}

export function loadGoods() {
  rotateModelRight(-1)
  setTimeout(() => {
    boomAnimation();
  }, 500);
  polySurface4340242Animation();
}

export function unloadGoods() {
  rotateModelRight(1)
  setTimeout(() => {
    polySurface4340242Animation();
  }, 500);
  boomAnimation();
}
