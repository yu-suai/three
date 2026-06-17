// ControlsAutoRotate
export default class ControlsAutoRotate {
  constructor(opts) {
    this.controls__ = opts.controls_;
    this.renderer_ = opts.renderer_;
    this.rotationSpeed = opts.rotationSpeed || 1;

    this.isRotating = true;

    // 设置阻尼值
    this.controls__.dampingFactor = 1;

    // Bind event handlers to the class instance
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    this.startEventListeners();
    this.startRotation();
    // console.log("ControlsAutoRotate====");
  }
  startRotation() {
    if (this.isRotating) {
      this.controls__.autoRotateSpeed = 2.0;
      this.controls__.autoRotate = true;
    }
  }

  stopRotation() {
    this.isRotating = false;
    this.controls__.autoRotate = false;
  }

  handleMouseEnter() {
    console.log("handleMouseEnter");
    this.stopRotation();
  }

  handleMouseLeave() {
    console.log("handleMouseLeave");
    this.isRotating = true;
    this.startRotation();
  }

  // Method to manually add event listeners
  startEventListeners() {
    this.renderer_.domElement.addEventListener(
      "mouseenter",
      this.handleMouseEnter
    );
    this.renderer_.domElement.addEventListener(
      "mouseleave",
      this.handleMouseLeave
    );
  }

  // Method to manually remove event listeners
  stopEventListeners() {
    this.renderer_.domElement.removeEventListener(
      "mouseenter",
      this.handleMouseEnter
    );
    this.renderer_.domElement.removeEventListener(
      "mouseleave",
      this.handleMouseLeave
    );
  }
}
