/* G. Hemingway Copyright @2014
 * Shell class handles all of the actual geometry - shared between Shapes
 */
"use strict";


/********************************* Helper Functions ********************************/

export default class Shell extends THREE.EventDispatcher {
    constructor(id, assembly, parent, size, defaultColor, boundingBox) {
        super();
        this._id = id;
        this._assembly = assembly;
        this._parent = parent;
        this._size = size;
        this._color = defaultColor;
        this._boundingBox = boundingBox;
        if (this._boundingBox.isEmpty()) {
            console.log("Found empty bounding box: " + this._id);
        }
        this.getNamedParent = this.getNamedParent.bind(this);
        return this;
    }

    getID() {
        return this._id;
    }

    getNamedParent() {
        return this._parent;
    }

    getBoundingBox() {
        return this._boundingBox;
    }

    getGeometry() {
        return this._geometry;
    }

    setGeometry(geom) {
        this._geometry = geom;
    }

    addGeometry(position, normals, colors, values, faces) {
        this.dispatchEvent({type: "shellStartLoad", shell: this});
        // Create the geometry to hold the data
        // Can also create a new buffergeometry per face and then geometry will be an array of buffergeom
        this._geometry = new THREE.BufferGeometry();

        this._geometry.addAttribute('position', new THREE.BufferAttribute(this._size * 3, 3));
        this._geometry.addAttribute('normal',   new THREE.BufferAttribute(this._size * 3, 3));
        this._geometry.addAttribute('color',    new THREE.BufferAttribute(this._size * 3, 3));
        this._geometry.addAttribute('values',   new THREE.BufferAttribute(values, 1));
        this._geometry.addAttribute('faces',    new THREE.BufferAttribute(this._size * 3, 3));

        // Now load the rest of the data
        this._geometry.attributes.position.array = position;
        this._geometry.attributes.normal.array = normals;

        if(colors[0] === -1){ //This checks if a color was set by the data or default should be used
            for(let i = 0; i <colors.length; i = i + 3){
                colors[i] = this._color.r;
                colors[i+1] = this._color.g;
                colors[i+2] = this._color.b;
            }
        }
        this._geometry.attributes.color.array = colors;
        this._geometry.attributes.faces.array = faces;

        // Compute bbox
        this._geometry.computeBoundingBox();
        this._boundingBox = this._geometry.boundingBox.clone();
        // All done - signal completion
        this._isLoaded = true;
        this.dispatchEvent({type: "shellEndLoad", shell: this});
    }
};
