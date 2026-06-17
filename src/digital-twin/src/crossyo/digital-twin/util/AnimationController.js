export class StickAnimator {
  constructor(
    stick,
    useLowestPoint = false,
    bigModel,
    tiltAngleType = false,
    rotationSpeed = 0.01,
    targetAngle = 0.5,
  ) {
    this.stick = stick; // 目标模型
    this.stickPosition = stick.geometry.attributes.position;
    this.bigModel = bigModel; //关联模型
    this.rotationSpeed = rotationSpeed; // 旋转速度（度）
    this.targetAngle = targetAngle; // 目标角度（度）
    this.currentAngle = 0; // 当前角度
    this.isTiltingUp = true; // 控制是否正在向上倾斜
    this.useLowestPoint = useLowestPoint;
    this.pivot = this.getPivot();
    this.hasCompleted = false; // 完成标志
    this.tiltAngleType = tiltAngleType; // 夹子前后
    this.animateNumber =0 
    this.animateMark = false
  }
  getPivot() {
    let x;
    try {
      x = this.useLowestPoint
        ? this.findLowestPoint()
        : this.findHighestPoint();
    } catch (error) {
      x = undefined;
    }
    return x;
  }
  // 找到固定点（最高点）
  findHighestPoint() {
    let positions = this.stick.geometry.attributes.position;
    let pivotX = 0,
      pivotY = -Infinity,
      pivotZ = 0;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      if (y > pivotY) {
        pivotX = x;
        pivotY = y;
        pivotZ = z;
      }
    }
    if (this.stick.name == "polySurface4340273_2") {
      return { x: pivotX - 0.01, y: pivotY - 0.1, z: pivotZ };
    } else {
      return { x: pivotX - 0.05, y: pivotY - 0.5, z: pivotZ };
    }
  }
  // 找到最低点（Y坐标最小的顶点）
  findLowestPoint() {
    const positions = this.stick.geometry.attributes.position;
    let pivotX = 0,
      pivotY = +Infinity, // 初始化为正无穷大
      pivotZ = 0;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // 寻找更小的Y值
      if (y < pivotY) {
        pivotX = x;
        pivotY = y;
        pivotZ = z;
      }
    }

    // 如果需要微调支点位置，可以在此处添加偏移量
    return { x: pivotX, y: pivotY, z: pivotZ };
  }
  // 更新顶点位置
  updatePositions() {
    const { x: pivotX, y: pivotY } = this.pivot;
    const positions = this.stick.geometry.attributes.position;

    // 将角度转为弧度
    const rotationAngle = (this.currentAngle * Math.PI) / 240;
    const cosAngle = Math.cos(rotationAngle);
    const sinAngle = Math.sin(rotationAngle);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const offsetX = x - pivotX;
      const offsetY = y - pivotY;

      // 应用二维旋转公式
      const rotatedX = offsetX * cosAngle - offsetY * sinAngle;
      const rotatedY = offsetX * sinAngle + offsetY * cosAngle;

      positions.setXYZ(i, pivotX + rotatedX, pivotY + rotatedY, z);
    }
    positions.needsUpdate = true;
  }
  updatebigModelPositions(bigModel) {
    const { x: pivotX, y: pivotY } = this.pivot;
    let positions = bigModel.stick.geometry.attributes.position;
    
    // 将角度转为弧度
    const rotationAngle = (this.currentAngle * Math.PI) / 240;
    const cosAngle = Math.cos(rotationAngle);
    const sinAngle = Math.sin(rotationAngle);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const offsetX = x - pivotX;
      const offsetY = y - pivotY;

      // 应用二维旋转公式
      const rotatedX = offsetX * cosAngle - offsetY * sinAngle;
      const rotatedY = offsetX * sinAngle + offsetY * cosAngle;
      positions.setXYZ(i, pivotX + rotatedX, pivotY + rotatedY, z);
    }
    // 标记几何体需要更新
    positions.needsUpdate = true;
  }
  isHasCompleted() {
    return this.hasCompleted;
  }
  changeHasCompleted() {
    this.hasCompleted = false;
  }

  // 动画逻辑
  animate(event) {
    
    if (event == "click") {
      this.animateNumber = 0
      this.changeHasCompleted();
      if(this.animateMark){
        return 
      }else {
        this.animateMark = true
      }
    }
    if (this.bigModel) {
      for (let i = 0; i < this.bigModel.length; i++) {
        this.updatebigModelPositions(this.bigModel[i]);
      }
    }
    if (!this.tiltAngleType) {
      if (this.isTiltingUp) {
        this.currentAngle += this.rotationSpeed;
        if (this.currentAngle >= this.targetAngle) {
          this.isTiltingUp = false; // 到达目标角度后开始恢复
        }
      } else {
        
        this.currentAngle -= this.rotationSpeed;
        if (this.currentAngle <= -this.targetAngle) {
            this.isTiltingUp = true; // 恢复到原始位置后开始倾斜
        }
      }
    } else {
      if (this.isTiltingUp) {
        this.currentAngle -= this.rotationSpeed;
        if (this.currentAngle <= -this.targetAngle) {
          if(this.stick.name == 'polySurface4340273_2'){
           
          }
          this.isTiltingUp = false; // 到达目标角度后开始恢复
        }
      } else {
        this.currentAngle += this.rotationSpeed;
        if (this.currentAngle >= this.targetAngle) {
          if(this.stick.name == 'polySurface4340273_2'){
          }
          this.isTiltingUp = true; // 恢复到原始位置后开始倾斜
        }
      }
    }
  
    if (!this.isHasCompleted()) {
      requestAnimationFrame(this.animate.bind(this)); // 继续下次动画
    }
    this.updatePositions();

    if(parseFloat(this.currentAngle.toFixed(3)) === 0){
      this.animateNumber += 1
    }
    if(this.animateNumber >= 2){
      this.hasCompleted = true
      this.animateMark = false
    }
  }
}