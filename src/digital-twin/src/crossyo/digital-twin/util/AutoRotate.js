// AutoRotate
export default class AutoRotate {
  constructor(opts) {
    this.renderer_ = opts.renderer_;
    this._root_ = opts.origin_root_;
    this.rotationSpeed = opts.rotationSpeed || 0.01;

    this.isRotating = true;

    this.initialRotation = {
      x: opts.origin_root_.rotation.x,
      y: opts.origin_root_.rotation.y,
      z: opts.origin_root_.rotation.z,
    };

    // Bind event handlers to the class instance
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    this.startEventListeners();
    this.startRotation();
    console.log('AutoRotate====', this);

  }
  startRotation() {
    if (this.isRotating) {
      const curRotation = this._root_.rotation;
      this._root_.rotation.set(curRotation.x, curRotation.y + this.rotationSpeed, curRotation.z);
      this.animationFrameId = requestAnimationFrame(
        this.startRotation.bind(this)
      );
    }
  }

  stopRotation() {
    this.isRotating = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  resetRotation() {
    this._root_.rotation.set(
      this.initialRotation.x,
      this.initialRotation.y,
      this.initialRotation.z
    );
  }

  handleMouseEnter() {
    console.log('handleMouseEnter')
    this.initialRotation = {
      x: this._root_.rotation.x,
      y: this._root_.rotation.y,
      z: this._root_.rotation.z,
    };
    this.stopRotation();
  }

  handleMouseLeave() {
    console.log('handleMouseLeave')
    this.resetRotation();
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
