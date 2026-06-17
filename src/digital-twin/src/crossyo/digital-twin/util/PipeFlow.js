import * as THREE from "three";

// 设置管道流动动画
function set_pipe_flow(scene, nodes) {
  nodes?.forEach((pipeNode) => {
    const useMaterial = pipeNode.pipeFlowMaterial ?? 'default';
    const useRunSpeed = pipeNode.pipeFlowRunSpeed ?? 0.5;
    const useSetMeshs = pipeNode.pipeFlowSetMeshs ?? [];

    useSetMeshs?.forEach((nodeName) => {
      const child = scene.getObjectByName(nodeName);
      if (child) {
        if (child.isMesh && child.visible) {
          // 该管道没有执行动画
          if(!child.userData.isFlowing) {
            setPipeFlow(child, useMaterial, useRunSpeed);
          }
        } else if (child.isGroup && child.visible) {  // 移除错误的条件检查
          child.children?.forEach((groupChild) => {    // 使用正确的变量名
            if (groupChild.isMesh && groupChild.visible && !groupChild.userData.isFlowing) {  // 检查每个子网格的状态
              setPipeFlow(groupChild, useMaterial, useRunSpeed);
            }
          });
        }
      }
    });

  });
}

// 管道流动动画
function setPipeFlow(pipeKid, texturePath, runSpeed) {
  if(texturePath.includes('pipe_tex3.png')) {
    shader1(pipeKid, texturePath, runSpeed)  // 传入 runSpeed
  } else if('customShader1' === texturePath) {
    customShader1(pipeKid, "#222222", "#ffff00", 0.05, runSpeed)  // 使用传入的 runSpeed
  }
}

// 取消指定的管道流动动画
function cancel_pipe_flow(pipeKid) {
  if (pipeKid.userData.cancelAnimation) {
    pipeKid.userData.cancelAnimation();
  }
}

// 取消所有的管道流动动画
function cancel_all_pipe_flow(scene) {
  scene.traverse((child) => {
    if (child.isMesh && child.userData.cancelAnimation) {
      child.userData.cancelAnimation();
    }
  });
}


function shader1(pipeKid, texturePath, runSpeed) {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(texturePath, (texture) => {
    console.log(`管道贴图`, texturePath);

    // 配置纹理属性
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0, 0);
    texture.repeat.set(10, 1); // 调整贴图重复比例

    // 保留原始材质
    const originalMaterial = pipeKid.material;

    // 检查材质是否已经包含 `uniforms`，如果没有则初始化
    if (!pipeKid.material.uniforms) {
      pipeKid.material.uniforms = {
        map: { value: texture }, // 传入的贴图
        time: { value: 0.0 },    // 时间变量，用于动态流动
        opacity: { value: 0.8 }, // 控制透明度
      };
    }

    // 使用 ShaderMaterial 替换材质
    pipeKid.material = new THREE.ShaderMaterial({
      uniforms: pipeKid.material.uniforms, // 使用已有的 `uniforms`
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv; // 将模型的 UV 传递到片段着色器
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;  // 贴图
        uniform float time;     // 动态时间
        uniform float opacity;  // 透明度
        varying vec2 vUv;       // 传入的 UV 坐标

        void main() {
          // 动态流动效果：沿 V 轴偏移 UV 坐标
          vec2 uv = vUv;
          uv.y += time;  // 让流动效果沿 Y 轴正向持续递增
          uv.y = fract(uv.y); // 使用 fract() 保持 UV 在 [0, 1] 范围内循环

          // 采样贴图
          vec4 color = texture2D(map, uv);

          // 输出颜色，应用透明度
          gl_FragColor = vec4(color.rgb, color.a * opacity);
        }
      `,
      transparent: true,
    });

    // 动画更新
    const speed = runSpeed ?? -0.5;  // 使用传入的 runSpeed，如果未定义则使用默认值
    const clock = new THREE.Clock();

    function animateFlow() {
      if (!pipeKid || !pipeKid.material || !pipeKid.material.uniforms || !pipeKid.userData.isFlowing) {
        return;
      }

      const elapsedTime = clock.getElapsedTime();
      pipeKid.material.uniforms.time.value = elapsedTime * speed;  // 使用传入的速度

      // requestAnimationFrame(animateFlow);
      // 使用 RAF 的返回值
      const animationId = requestAnimationFrame(animateFlow);
      // 存储 animationId 以便后续取消
      pipeKid.userData.animationId = animationId;
    }

    // 更新取消动画的逻辑
    pipeKid.userData.isFlowing = true;
    pipeKid.userData.cancelAnimation = () => {
      pipeKid.userData.isFlowing = false;
      if (pipeKid.userData.animationId) {
        cancelAnimationFrame(pipeKid.userData.animationId);
        pipeKid.userData.animationId = null;
      }
      pipeKid.material = originalMaterial;
    };

    animateFlow(); // 启动动画
  });
}

function customShader1(pipeKid, baseColor, highlightColor, highlightSize, runSpeed) {
  // 保留原始材质
  const originalMaterial = pipeKid.material;

  // 创建 ShaderMaterial
  pipeKid.material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      baseColor: { value: new THREE.Color('#000000') }, // 基础颜色
      highlightColor: { value: new THREE.Color('#ffff00') }, // 高亮颜色
      highlightSize: { value: 0.05 }, // 调整高亮区域大小
      opacity: { value: 0.5 }, // 控制透明度
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 baseColor;
      uniform vec3 highlightColor;
      uniform float highlightSize;
      uniform float opacity;  // 透明度
      varying vec2 vUv;
  
      void main() {
        // 单向流动偏移
        float offsetY = fract(vUv.y + time * 0.1); // 时间流速调整为 0.1 倍
        float highlight = smoothstep(0.5 - highlightSize, 0.5 + highlightSize, abs(offsetY - 0.5));
        
        // 混合颜色
        vec3 color = mix(baseColor, highlightColor, highlight);
        gl_FragColor = vec4(color, opacity);
      }
    `,
    transparent: true,
  });
  

  // 动画更新
  const clock = new THREE.Clock();
  function animateFlow() {
    if (!pipeKid || !pipeKid.material || !pipeKid.material.uniforms || !pipeKid.userData.isFlowing) {
      return;
    }

    const deltaTime = clock.getDelta(); // 获取每帧时间间隔
    pipeKid.material.uniforms.time.value += deltaTime * runSpeed; // 根据时间更新高亮点位置

    // requestAnimationFrame(animateFlow);
    const animationId = requestAnimationFrame(animateFlow);
    pipeKid.userData.animationId = animationId;
  }

  // 开始动画并记录状态
  pipeKid.userData.isFlowing = true;
  pipeKid.userData.cancelAnimation = () => {
    pipeKid.userData.isFlowing = false;
    if (pipeKid.userData.animationId) {
      cancelAnimationFrame(pipeKid.userData.animationId);
      pipeKid.userData.animationId = null;
    }
    pipeKid.material = originalMaterial;
  };

  animateFlow(); // 启动动画
}


export {set_pipe_flow, cancel_pipe_flow, cancel_all_pipe_flow}