import gsap from 'gsap';
import * as THREE from "three";


const activeGages = new Map();

function set_pressure_gauge(scene, targetName, targetValue) {
  scene.traverse((child) => {
    if (child.name === targetName) {
      if (!activeGages.has(targetName)) {
        const gage = new PressureGauge(child);
        activeGages.set(targetName, gage);
      }
      const gage = activeGages.get(targetName);
      gage.setPressure(targetValue); // 修改这里
    }
  });
}

function cancel_pressure_gauge(targetName) {
  if (activeGages.has(targetName)) {
    const gage = activeGages.get(targetName);
    gage.stopAnimation();
    activeGages.delete(targetName);
  }
}

class PressureGauge {
  constructor(mesh) {
    this.mesh = mesh;
    this.pressure = 0;
    this.rotation = 0;
  }

  setPressure(newPressure) {
    this.pressure = newPressure;
    this.updateRotation();
  }

  updatePressure(newPressure) {
    this.pressure = newPressure;
    this.updateRotation();
  }

  updateRotation() {
    this.rotation = this.pressure * (Math.PI / 180);
    this.animateRotation();
  }

  animateRotation() {
    gsap.to(this.mesh.rotation, {
      duration: 1,
      z: this.rotation,
      ease: "sine.inOut"
    });
  }

  stopAnimation() {
    gsap.killTweensOf(this.mesh.rotation);
  }
}

export { set_pressure_gauge, cancel_pressure_gauge };