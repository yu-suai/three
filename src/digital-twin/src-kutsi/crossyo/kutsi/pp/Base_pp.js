export class Base_pp {
    // after use_pp__
    // this.pp_.renderer_ =
    // this.pp_.viewer_ =
    // this.pp_.scene_ =
    // this.pp_.camera_ =
    use() {}

    setSize(w, h) {
        this.renderer_.setSize(w, h);
        this.cssRenderer_?.setSize(w, h);
    }

    render() {
        this.renderer_.render(this.scene_, this.camera_);
        this.cssRenderer_?.render(this.scene_, this.camera_);
    }
}
