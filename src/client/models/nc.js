/* G. Hemingway Copyright @2014
 * Context for the overall CAD assembly
 */
"use strict";


import Assembly from './assembly';
import Annotation          from './annotation';
import DataLoader from './data_loader'
import Shell from './shell'

/*************************************************************************/

export default class NC extends THREE.EventDispatcher {
    constructor(project, workingstep, timeIn, loader) {
        super();
        this.app = loader._app;
        this.project = project;
        this._workingstep = workingstep;
        this._timeIn = timeIn;
        this._loader = loader;
        this._objects = {};
        this.type = 'nc';
        this.raycaster = new THREE.Raycaster();
        this._object3D = new THREE.Object3D();
        this._overlay3D = new THREE.Object3D();
        this._annotation3D = new THREE.Object3D();
        this.state = {
            selected:       false,
            highlighted:    false,
            visible:        true,
            opacity:        1.0,
            explodeDistance: 0,
            collapsed:      false
        }
    }

    addModel(model, usage, type, id, transform, bbox) {
        // console.log('Add Model(' + usage + '): ' + id);
        // Setup 3D object holder
        let obj = {
            model: model,
            usage: usage,
            type: type,
            id: id,
            rendered: true,
            object3D: new THREE.Object3D(),
            transform: (new THREE.Matrix4()).copy(transform),
            bbox: bbox,
            getID: function() { return this.id; },
            getNamedParent: function() { return this },
            getBoundingBox: function() { return this },
            toggleHighlight: function() { },
            toggleVisibility: function() {this.object3D.visible = !this.object3D.visible; },
            setInvisible: function() {this.object3D.visible = false; },
            setVisible: function() {this.object3D.visible = true; },
            toggleOpacity: function() { },
            toggleSelection: function() { },
            toggleCollapsed: function() { },
            explode: function() { }
        };
        obj.object3D.applyMatrix(obj.transform);
        obj.object3D.updateMatrixWorld();
        obj.overlay3D = obj.object3D.clone();
        obj.annotation3D = obj.object3D.clone();
        // Save the object
        this._objects[id] = obj;
        this._object3D.add(obj.object3D);
        this._overlay3D.add(obj.overlay3D);
        this._annotation3D.add(obj.annotation3D);
        if (type === 'shell') {
            model.addEventListener('shellEndLoad', function (event) {
                //This is where the shell gets sent when its loaded so that the full mesh can be added to the 3D objects
                let material = new THREE.ShaderMaterial(new THREE.VelvetyShader());
                let mesh = new THREE.Mesh(event.shell.getGeometry(), material, false);
                
                if (obj.bbox.isEmpty()) {
                    obj.bbox = event.shell.getBoundingBox();
                }
                
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData = obj;
                obj.object3D.add(mesh);
                if (usage === 'asis') {
                    // TODO: add selector for displaying asis geometry or not
                    obj.rendered = false;
                    obj.setInvisible();
                }
            });
        } else if (type === 'polyline') {
            model.addEventListener('annotationEndLoad', function(event) {
                let lineGeometries = event.annotation.getGeometry();
                let material = new THREE.LineBasicMaterial({
                    vertexColors: THREE.VertexColors,
                    //color: 0xffffff,
                    linewidth: 1
                });
                model._addedGeometry = [];
                for (let i = 0; i < lineGeometries.length; i++) {
                    let lines = new THREE.Line(lineGeometries[i], material);
                    lines.visible = true;
                    obj.annotation3D.add(lines);
                    model._addedGeometry.push(lines);
                }
            });
            model.addEventListener("annotationMakeVisible", (event)=>{
              _.each(model._addedGeometry, (line)=>{
                obj.annotation3D.add(line);
              });
            });
            model.addEventListener("annotationMakeNonVisible", (event)=>{
              _.each(model._addedGeometry, (line)=>{
                obj.annotation3D.remove(line);
              });
            });
        }
    }

    getObject3D() {
        return this._object3D;
    };

    getObjects() {
        return this._objects;
    };

    getOverlay3D() {
        return this._overlay3D;
    };

    getAnnotation3D() {
        return this._annotation3D;
    };

    getBoundingBox() {
        if (!this.boundingBox) {
            this.boundingBox = new THREE.Box3();
            let keys = _.keys(this._objects);
            _.each(keys, (key) => {
                let object = this._objects[key];
                if (object.type !== 'polyline') {
                    this.boundingBox.union(object.bbox);
                }
            });
        }
        return this.boundingBox.clone();
    }

    calcBoundingBox() {

        this._overlay3D.remove(this.bbox);
        this.boundingBox = new THREE.Box3();
        let keys = _.keys(this._objects);
        _.each(keys, (key) => {
            let object = this._objects[key];
            if (object.rendered !== false && object.type !== 'polyline') {
                let newBox = new THREE.Box3().setFromObject(object.object3D);
                if (!newBox.isEmpty()) {
                    object.bbox = newBox;
                }
                this.boundingBox.union(object.bbox);
            }
        });
        let bounds = this.boundingBox;

        this.bbox = Assembly.buildBoundingBox(bounds);
        if (this.bbox && this.state.selected) {
            this._overlay3D.add(this.bbox);
        }
    }

    clearHighlights() {
        this.dispatchEvent({ type: "_clearHighlights" });
    }

    hideAllBoundingBoxes() {
        this.dispatchEvent({ type: "_hideBounding" });
    }

    getNamedParent() {
        return this;
    }

    select(camera, mouseX, mouseY) {
        let mouse = new THREE.Vector2();
        mouse.x = (mouseX / window.innerWidth) * 2 - 1;
        mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(mouse, camera);
        
        let objs = _.map(_.values(this._objects), (obj) => obj.object3D);
        let intersections = this.raycaster.intersectObjects(objs, true);
        // Did we hit anything?
        let object = undefined;
        if (intersections.length > 0) {
            let hit = undefined;
            for (let i = 0; i < intersections.length; i++) {
                if (intersections[i].object.visible) {
                    if (!hit || intersections[i].distance < hit.distance) {
                        hit = intersections[i];
                    }
                }
            }
            if (hit) {
                object = hit.object.userData;
            }
        }
        return object;
    }

    applyDelta(delta) {
        let alter = false;
        //Two types of changes- Keyframe and delta.
        //Keyframe doesn't have a 'prev' property.
        if (!delta.hasOwnProperty('prev')){
            //For keyframes, we need to remove current toolpaths, cutters,
            // As-Is, and To-Be geometry (Collectively, "Stuff") and load new ones.
            // console.log("Keyframe recieved");
            // this._loader.annotations = {};

            // Delete existing Stuff.
            var oldgeom = _.filter(_.values(this._objects), (geom) => (
                geom.usage =="cutter" || geom.usage =="tobe" || 
                geom.usage =="asis"|| geom.usage=="machine" || geom.usage=="fixture")
            );
            _.each(oldgeom,(geom)=> {
                this._object3D.remove(geom.object3D);
                this._overlay3D.remove(geom.object3D);
                geom.rendered = false;
            });

            var oldannotations =_.values(this._loader._annotations);
            _.each(oldannotations, (oldannotation) => {
                oldannotation.removeFromScene();
            });

            //Load new Stuff.
            var toolpaths = _.filter(delta.geom, (geom) => geom.usage == 'toolpath' || (_.has(geom, 'polyline') && geom.usage =="tobe"));
            var geoms = _.filter(delta.geom, (geom) => (
                geom.usage =='cutter' || (geom.usage =='tobe' && _.has(geom, 'shell')) || 
                geom.usage =="asis"||geom.usage=='machine' || geom.usage=="fixture")
            );
            _.each(toolpaths, (geomData) => {
                let name = geomData.polyline.split('.')[0];
                if (!this._loader._annotations[name]){
                    let annotation = new Annotation(geomData.id, this, this);
                    let transform = DataLoader.parseXform(geomData.xform, true);
                    this.addModel(annotation, geomData.usage, 'polyline', geomData.id, transform, undefined);
                    // Push the annotation for later completion
                    this._loader._annotations[name] = annotation;
                    var url = '/v3/nc/';
                    this._loader.addRequest({
                        path: name,
                        baseURL: url,
                        type: 'annotation'
                    });
                } else {
                    this._loader._annotations[name].addToScene();
                }
            });


            _.each(geoms, (geomData)=>{
                let name = geomData.id;
                if(geomData.usage =='asis' || (this.app.services.machine === null && geomData.usage == 'fixture')) return;

                if(this._objects[name]) {
                    let obj = this._objects[name];
                    if (!obj.rendered) {
                        this._overlay3D.add(obj.object3D);
                        obj.rendered = true;
                        obj.setVisible();
                        this._objects[name] = obj;
                    }
                }
                else {
                    let color = DataLoader.parseColor("7d7d7d");
                    if(geomData.usage =="cutter"){
                        color = DataLoader.parseColor("FF530D");
                    }
                    let transform = DataLoader.parseXform(geomData.xform,true);
                    let boundingBox = DataLoader.parseBoundingBox(geomData.bbox);
                    let shell = new Shell(geomData.id,this,this,geomData.size,color,boundingBox);
                    this.addModel(shell,geomData.usage,'shell',geomData.id,transform,boundingBox);
                    this._loader._shells[geomData.shell]=shell;
                    var url = "/v3/nc/";
                    this._loader.addRequest({
                        path: name,
                        baseURL: url,
                        type: "shell"
                    })
                }
            });

            this._loader.runLoadQueue();
            alter = true;
            this.app.actionManager.emit('change-workingstep',delta.workingstep);
            //  let lineGeometries = event.annotation.getGeometry();
        }
        else {
            // Handle each geom update in the delta
            // This is usually just a tool movement.
            _.each(delta.geom, (geom) => {
                if (!window.geom || window.geom.length < 100){
                    window.geom = window.geom || [];
                    window.geom.push(geom);
                }
                let obj = this._objects[geom.id];
                if(obj !== undefined) {
                    if (obj.rendered !== false) {
                        let transform = new THREE.Matrix4();
                        if (!geom.xform) return;
                        transform.fromArray(geom.xform);
                        let position = new THREE.Vector3();
                        let quaternion = new THREE.Quaternion();
                        let scale = new THREE.Vector3();
                        transform.decompose(position, quaternion, scale);
                        // we need to update all 3D properties so that
                        // annotations, overlays and objects are all updated
                        obj.object3D.position.copy(position);
                        obj.object3D.quaternion.copy(quaternion);
                        obj.annotation3D.position.copy(position);
                        obj.annotation3D.quaternion.copy(quaternion);
                        obj.overlay3D.position.copy(position);
                        obj.overlay3D.quaternion.copy(quaternion);
                        alter = true;
                    }
                }
            });
        }
        return alter;
    }

    getSelected() { 
       if(this.state.selected) 
        return [this]; 
        else
            return [];
    }
    getID() { return this.id; }
    toggleHighlight() { }
    toggleVisibility() { }
    toggleOpacity() { }

    toggleSelection() {
        // On deselection
        if(this.state.selected) {
            // Hide the bounding box
            this._overlay3D.remove(this.bbox);
            // On selection
        } else {
            let bounds = this.getBoundingBox(false);
            if (!this.bbox && !bounds.isEmpty()) {
                this.bbox = Assembly.buildBoundingBox(bounds);
            }
            if (this.bbox) {
                // Add the BBox to our overlay object
                this._overlay3D.add(this.bbox);
            }
        }
        this.state.selected = !this.state.selected;
    }

    toggleCollapsed() { }
    explode() { }
}
