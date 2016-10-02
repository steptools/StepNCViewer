/* G. Hemingway Copyright @2014
 * Context for the overall CAD assembly
 */
"use strict";


import Assembly from './assembly';
import Annotation          from './annotation';
import DataLoader from './data_loader';
import Shell from './shell';
import {makeGeometry, processKeyframe, processDelta} from './nc_delta';

/*************************************************************************/
//HACK: FIXME.
let dynqueuegetting = false;
let dynqueuenext = false;
let dynqueuecur = -1;
let dynqueuecb = ()=>{};

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
            collapsed:      false,
            usagevis: {
                asis:       false,
                tobe:       false,
                machine:    true,
                cutter:     true,
                inprocess:  true,
                toolpath:   true,
                fixture:    true
            }
        }
        this.vis = this.vis.bind(this);
        this.getVis = this.getVis.bind(this);
        this.save = this.save.bind(this);
        this.app.actionManager.on('STLDL',this.save);
    }

    //gist.github.com/paulkaplan/6513707

    // Given a THREE.Geometry, create a STL binary
    geometryToDataView(geometry){
        var writeFloat = (dataview, offset, float, isLittleEndian)=>{
            dataview.setFloat32(offset, float, isLittleEndian);
            return offset + 4;
        };
        var writeVector = (dataview, offset, vector, isLittleEndian)=>{
            offset = writeFloat(dataview, offset, vector.x, isLittleEndian);
            offset = writeFloat(dataview, offset, vector.y, isLittleEndian);
            return writeFloat(dataview, offset, vector.z, isLittleEndian);
        };
        let compareVertex = (v1,v2)=>{
            return ((v1.x === v2.x) && (v1.y === v2.y) && (v1.z === v2.z));
        }

        let tris = geometry.faces;
        let verts = geometry.vertices;

        let isLittleEndian = true; // STL files assume little endian, see wikipedia page
        tris = _.filter(tris,(t)=>{ //Remove degenerates. 2016 election joke- Trump would like to do this.
            return !(compareVertex(verts[t.a],verts[t.b]) && compareVertex(verts[t.b],verts[t.c]));
        });

        let bufferSize = 84 + (50 * tris.length);
        let buffer = new ArrayBuffer(bufferSize);
        let dv = new DataView(buffer);
        let offset = 0;

        offset += 80; // Header is empty

        dv.setUint32(offset, tris.length, isLittleEndian);
        offset += 4;

        for(let n = 0; n < tris.length; n++) {
            offset = writeVector(dv, offset, tris[n].normal, isLittleEndian);
            offset = writeVector(dv, offset, verts[tris[n].a], isLittleEndian);
            offset = writeVector(dv, offset, verts[tris[n].b], isLittleEndian);
            offset = writeVector(dv, offset, verts[tris[n].c], isLittleEndian);
            offset += 2; // unused 'attribute byte count' is a Uint16
        }

        return dv;
    };

    save(arg){
        let changes = {};
        switch(arg){
            case 'asis':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='asis' && obj.model.live});
                break;
            case 'tobe':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='tobe' && obj.model.live});
                break;
            case 'machine':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='machine' && obj.model.live});
                break;
            case 'cutter':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='cutter' && obj.model.live});
                break;
            case 'removal':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='inprocess' && obj.model.live});
                break;
            default:
                break;
        }
        for(let i=0;i<changes.length;i++) {
            let outgeom = new THREE.Geometry().fromBufferGeometry(changes[i].model._geometry);
            let dv = this.geometryToDataView(outgeom);
            let blob = new Blob([dv], {type: 'application/octet-binary'});
            FileSaver.saveAs(blob, arg+" model" + i + ".stl");
        }
    }
    vis(arg){
        let changes = {};
        switch(arg){
            case 'asis':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='asis' && obj.model.live});
                this.state.usagevis.asis= !this.state.usagevis.asis;
                break;
            case 'tobe':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='tobe' && obj.model.live});
                this.state.usagevis.tobe= !this.state.usagevis.tobe;
                break;
            case 'machine':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='machine' && obj.model.live});
                this.state.usagevis.machine = !this.state.usagevis.machine;
                break;
            case 'cutter':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='cutter' && obj.model.live});
                this.state.usagevis.cutter=!this.state.usagevis.cutter;
                break;
            case 'removal':
                changes = _.filter(this._objects,(obj)=>{return obj.usage==='inprocess' && obj.model.live});
              this.state.usagevis.inprocess = !this.state.usagevis.inprocess;
                break;
            case 'path':
                changes = _.filter(this._loader._annotations,(anno)=>{return anno.live});
                _.each(changes,(anno)=>{anno.toggleScene();});
                this.state.usagevis.toolpath=!this.state.usagevis.toolpath;
                return;
            default:
                break;
        }
        _.each(changes,(obj)=>{obj.toggleVisibility();});
    }
    getVis(usage){
        return this.state[usage];
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
            model.addEventListener('shellEndLoad', (event) => {
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
                obj.version = 0;
                if (!this.state.usagevis[usage]) {
                    //obj.rendered = false;
                    obj.setInvisible();
                }
            });
        } else if (type === 'polyline') {
            model.addEventListener('annotationEndLoad', (event) => {
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

            let removeAnno = () => {
                model.removeEventListener('annotationEndLoad', removeAnno);
                _.each(model._addedGeometry, (line)=>{
                    obj.annotation3D.remove(line);
                });
            };

            model.addEventListener("annotationMakeNonVisible", (event)=>{
              if (!model._addedGeometry || model._addedGeometry.length === 0) {
                  model.addEventListener('annotationEndLoad', removeAnno);
              } else {
                  removeAnno();
              }
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
    dynqueue(cb) {
        if (dynqueuegetting){ //getting something already
            dynqueuenext = true;
            dynqueuecb = cb;
            return;
        }
        dynqueuegetting = true;
        let resolvequeue = (res)=>{
            dynqueuegetting = false;

            dynqueuecur = res.version;
            if(dynqueuenext === true) {
                dynqueuenext = false;
                this.dynqueue(dynqueuecb);
            }
            else
                return;
        };
        request.get('/v3/nc/geometry/delta/-1').timeout(1000)
          .then((res)=>{
              //let dyn = {'version':dynqueuecur};
              let dyn = JSON.parse(res.text)
              try {
                  cb(dyn);
              }
              catch (e) {
                  console.log("COULDNT PROCESS DYNAMICGEOM. Something's borked. Let's see what the error was:");
                  console.log(e);
              }
              return resolvequeue(dyn);
          })
          .catch((err)=>{
              console.log(err);
              return resolvequeue({'version':dynqueuecur});
          });
    };


    handleDynamicGeom(geom,cb,cbdata){
        if(!geom) return cb(cbdata);
        let parseDynamicFull = (geom,obj)=>{
            let geometry = makeGeometry(processKeyframe(geom));
            // Remove all old geometry -- mesh's only
            obj.object3D.traverse(function(child) {
                if (child.type === "Mesh") {
                    obj.object3D.remove(child);
                }
            });
            // Add in new geometry
            let material = new THREE.ShaderMaterial(new THREE.VelvetyShader());
            let mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = obj;
            obj.object3D.add(mesh);
            // Make sure to update the model geometry
            if(obj.model.getGeometry()) obj.model.getGeometry().dispose();
            obj.model.setGeometry(geometry);
            obj.model.live = true;
            obj.version = geom.version;
            obj.baseVersion= geom.base_version;
            obj.precision = geom.precision;
            return true;
        };
        let parseDynamicUpdate = (geom,obj)=> {
            if(!geom.hasOwnProperty('prev_version')){
                return parseDynamicFull(geom,obj);
            }
            if(geom.version <= obj.version) return;
            if(obj.baseVersion !== geom.base_version) return;
            if(obj.version !== geom.prev_version) return;
            let geometry = makeGeometry(processDelta(geom, obj));
            // Remove all old geometry -- mesh's only
            obj.object3D.traverse(function (child) {
                if (child.type === "Mesh") {
                    obj.object3D.remove(child);
                }
            });
            // Create new modified geometry and add to obj
            let material = new THREE.ShaderMaterial(new THREE.VelvetyShader());
            let mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = obj;
            obj.object3D.add(mesh);
            // Make sure to update the model geometry
            if(obj.model.getGeometry()) obj.model.getGeometry().dispose();
            obj.model.setGeometry(geometry);
            obj.version = geom.version;
        };
        let existingobj = this._objects[geom.id];
        if(existingobj === undefined) { //Need a full dynamic shell.
            //Setup the memory
            let color = DataLoader.parseColor("BE17FF");
            let boundingBox = DataLoader.parseBoundingBox(geom.bbox);
            let transform =DataLoader.parseXform(geom.xform,true);
            let shell = new Shell(geom.id,this,this,geom.size,color,boundingBox);
            this.addModel(shell,geom.usage,'shell',geom.id,transform,boundingBox);
            existingobj = this._objects[geom.id];

            this.dynqueue((fulldynamic)=>{
                    parseDynamicFull(fulldynamic,existingobj);
                    cb(cbdata);
                });
        }
        else{ //Need an updated dynamic shell.
            if(existingobj.version !== geom.version) {
                this.dynqueue((updateddynamic)=> {
                    parseDynamicUpdate(updateddynamic, existingobj);
                    cb(cbdata);
                });
            }
            else cb(cbdata);
        }
        return true;
        // Don't know what kind of update this is
    }

    applyDelta(delta,force) {
        let alter = false;
        //There are two types of 'State' that we get- KeyState or DeltaState.

        //If we get a KeyState, we need to re-render the scene.
        //If we get a DeltaState, we need to update the scene.
        //First we handle KeyState.
        if (force || !delta.hasOwnProperty('prev')){
            //For keystates, we need to hide the currently drawn but unused geometry,
            //Unhide anything we have that is needed but hidden,
            //And load and display any new things we don't have.
            // Hide existing Stuff. Keep it around in case we need to use it later.
            var oldgeom = _.filter(_.values(this._objects), (p)=>{
                return(p.type ==='shell'&& p.usage!=='inprocess');
            });
            _.each(oldgeom,(geom)=> {
                //this._object3D.remove(geom.object3D);
                //this._overlay3D.remove(geom.object3D);
                geom.rendered = false;
                geom.model.live = false;
                geom.object3D.visible = false;
            });

            var oldannotations =_.values(this._loader._annotations);
            _.each(oldannotations, (oldannotation) => {
                oldannotation.removeFromScene();
                oldannotation.live = false;
            });

            //Load new Stuff.
            var toolpaths = _.filter(delta.geom, (geom) => (geom.usage == 'toolpath' || (_.has(geom, 'polyline') && geom.usage =="tobe")));
            var geoms = _.filter(delta.geom, (geom) => (
                geom.usage =='cutter' || (geom.usage =='tobe' && _.has(geom, 'shell')) ||
                geom.usage =="asis"||geom.usage=='machine' || geom.usage=="fixture")
            );
            let inproc = _.filter(delta.geom, ['usage','inprocess'])[0];
            this.handleDynamicGeom(inproc,()=>{
                _.each(toolpaths, (geomData) => {
                    let name = geomData.polyline.split('.')[0];
                    if (!this._loader._annotations[name]){
                        let annotation = new Annotation(geomData.id, this, true);
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
                        if(this.state.usagevis[geomData.usage]) {
                            this._loader._annotations[name].addToScene();
                        }
                        this._loader._annotations[name].live = true;
                    }
                });


                _.each(geoms, (geomData)=>{
                    let name = geomData.id;
                    //if(geomData.usage !=='cutter') return;
                    //Don't show as-is geom of fixture
                    //if(geomData.usage =='asis' || (this.app.services.machine === null && geomData.usage == 'fixture')) return;

                    if(this._objects[name]) {
                        let obj = this._objects[name];
                        if (!obj.visible) {
                            //this._overlay3D.add(obj.object3D);
                            obj.rendered = true;
                            if(this.state.usagevis[geomData.usage]) {
                                obj.visible = true;
                                obj.setVisible();
                            }
                            obj.usage = geomData.usage;
                            this._objects[name] = obj;
                        }
                        obj.model.live = true;
                    }
                    else {
                        let color = DataLoader.parseColor("7d7d7d");
                        if(geomData.usage =="cutter"){
                            color = DataLoader.parseColor("FF530D");
                        }
                        let transform = DataLoader.parseXform(geomData.xform,true);
                        let boundingBox = DataLoader.parseBoundingBox(geomData.bbox);
                        let shell = new Shell(geomData.id,this,this,geomData.size,color,boundingBox,true);
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
                this.app.actionManager.emit('change-workingstep', delta.workingstep);
            });
            //  let lineGeometries = event.annotation.getGeometry();
        }
        else {
            // Handle each geom update in the delta
            // This is usually just a tool movement (and volume removal update).
            var dyn = _.filter(delta.geom,['usage','inprocess'])[0];
            alter = this.handleDynamicGeom(dyn,()=> {
                let rtn = false;
                _.each(delta.geom, (geom) => {
                    if (!window.geom || window.geom.length < 100) {
                        window.geom = window.geom || [];
                        window.geom.push(geom);
                    }
                    let obj = this._objects[geom.id];
                    if (obj !== undefined) {
                        obj.model.live = true;
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
                            rtn = true;
                        }
                    }
                });
                return rtn;
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
