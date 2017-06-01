/* Copyright G. Hemingway, 2015 - All rights reserved */
"use strict";


/********************************* Annotation Class ********************************/

export default class Annotation extends THREE.EventDispatcher {
  constructor(id, model, isLive) {
    super();
    this._id = id;
    this._model = model;
    this._geometry = undefined;
    this._lines = [];
    this.live = isLive;
    this.visible = true;
    return this;
    this.toggleScene = this.toggleScene.bind(this);
  }

  getID() {
    return this._id;
  }

  addGeometry(data) {
    for (const polyline of data) {
      let geometry = new THREE.BufferGeometry();
      //load points & colors
      let vertices = new Float32Array(polyline.points.length * 3);
      let colorArray = new Float32Array(polyline.points.length * 3);
      _.forEach(polyline.points, (point, index) => {
        let bufferIndex = index*3;
        vertices[bufferIndex]     = point[0];            // X
        vertices[bufferIndex + 1] = point[1];            // Y
        vertices[bufferIndex + 2] = point[2];            // Z
        colorArray[bufferIndex]     = polyline.color[0]; // R
        colorArray[bufferIndex + 1] = polyline.color[1]; // G
        colorArray[bufferIndex + 2] = polyline.color[2]; // B
      });
      let position = new THREE.BufferAttribute(vertices, 3);
      geometry.addAttribute('position', position);
      let color = new THREE.BufferAttribute(colorArray, 3);
      geometry.addAttribute('color', color);
      this._lines.push(geometry);
    }
    // All done - signal completion
    this.dispatchEvent({ type: "annotationEndLoad", annotation: this });
  }

  toggleScene() {
    if (this.visible) this.removeFromScene();
    else this.addToScene();
  }

  addToScene() {
    this.dispatchEvent({ type: "annotationMakeVisible", annotation: this });
    this.visible = true;
  }
  removeFromScene() {
    this.dispatchEvent({ type: "annotationMakeNonVisible", annotation: this });
    this.visible = false;
  }

  getGeometry() {
    return this._lines;
  }
};
