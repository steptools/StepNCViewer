/* G. Hemingway Copyright @2015
 * Data loader - Specialized for each type of data (e.g. JSON, TYSON, etc.)
 */
"use strict";


import Assembly            from './assembly';
import NC                  from './nc';
import Product             from './product';
import Shape               from './shape';
import Shell               from './shell';
import Annotation          from './annotation';

/********************************* Helper Functions ********************************/

export default class DataLoader extends THREE.EventDispatcher {
    constructor(config,app) {
        super();
        this._app = app;
        this._queue = [];       // The queue of requests to load
        this._loading = [];     // List of active loading jobs
        this._maxWorkers = config.maxWorkers ? config.maxWorkers : 4;
        this._freeWorkers = [];
        this._shells = [];
        this._annotations = {};

        this._workers = [];     // List of workers
        while (this._workers.length < this._maxWorkers) {
            let worker = new Worker(config.workerPath);
            worker.addEventListener('message', (event) => {
                this.workerMessage(event);
            });
            this._freeWorkers.push(this._workers.length);
            this._workers.push(worker);
        }
    }

    static parseBoundingBox(str) {
        if (!str) {
            return new THREE.Box3();
        }
        let bbxform = new THREE.Matrix4();
        bbxform.set(
        -1, 0, 0, 0,
        0, 0, 1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
        );
        let vals = str;
        if (typeof str === "string") vals = DataLoader.parseFloatVec(str, 6);
        let rtnbbox = new THREE.Box3(new THREE.Vector3(vals[0], vals[1], vals[2]), new THREE.Vector3(vals[3], vals[4], vals[5]));
        rtnbbox.applyMatrix4(bbxform);
        return rtnbbox;
    }

    static parseXform(str, colOriented) {
        if (str == null) return null;
        let arr = str;
        if (typeof str === "string") {
            // Identity transform compression
            if (str === "I") {
                arr = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            } else {
                arr = DataLoader.parseFloatVec(str);
            }
        }
        if (arr.length !== 16) {
            throw new Error("Invalid Xform found");
        }
        if (colOriented) {
            return new THREE.Matrix4().set(
                arr[0], arr[4], arr[8], arr[12],
                arr[1], arr[5], arr[9], arr[13],
                arr[2], arr[6], arr[10], arr[14],
                arr[3], arr[7], arr[11], arr[15]
            );
        } else {
            return new THREE.Matrix4().set(
                arr[0], arr[1], arr[2], arr[3],
                arr[4], arr[5], arr[6], arr[7],
                arr[8], arr[9], arr[10], arr[11],
                arr[12], arr[13], arr[14], arr[15]
            );
        }
    }

    static parseColor(hex) {
        let cval = parseInt(hex, 16);
        return (new THREE.Color()).setRGB(
            ((cval >> 16) & 0xff) / 255,
            ((cval >> 8) & 0xff) / 255,
            ((cval >> 0) & 0xff) / 255
        );
    }

    static parseUnit(str) {
        let unit = str.split(" ")[0];
        let factor = parseFloat(str.split(" ")[1]);
        if (unit !== "mm") {
            console.log("Found non-MM unit: " + unit);
        }
        return factor;
    }

    static parseFloatVec(str, count) {
        let vals = str.split(" ");
        if (count != null && vals.length != count) {
            throw new Error(
                "parse_float_vec: unexpected number of elements expecting " + count
                + " have " + vals.length);
        }
        count = vals.length;
        let ret = new Array(count);
        for (let i = 0; i < count; i++) {
            let v = parseFloat(vals[i]);
            if (!isFinite(v)) throw new Error("number is not finite");
            ret[i] = v;
        }
        return ret;
    }

    /************** DataLoader Class Functions ****************************/

    load(req, callback) {
        req.base = req.baseURL + '/' + req.type + '/' + req.path;
        this.addRequest(req, function(err, model) {
            callback(err, model);
        });
    }

    /* Needed fields
     * path: name of the file to be loaded
     * baseURL: everything through v1
     * type: type of model (assembly, shell, etc.)
     */
    addRequest(req, callback) {
        req.callback = callback;
        // Push onto the queue and send out a message
        this._queue.push(req);
        if (req.type === 'previewShell') {
            this.dispatchEvent({ type: 'addRequest', path: 'preview-' + req.path});
        }
        else {
            this.dispatchEvent({ type: 'addRequest', path: req.path });
        }
    }

    sortQueue() {
        // Let's sort the req array
        //        this._queue.sort(function(a, b) {
        //            if (a.shellSize >= b.shellSize) return 1;
        //            else return -1;
        //        });
        return this._queue.shift();
        //        console.log("DataLoader.sortQueue: " + JSON.stringify(_.pick(req, ["shellSize"] )));
        //        return req;
    }

    queueLength(onlyLoad) {
        let numWorking = this._maxWorkers - this._freeWorkers.length;
        if (onlyLoad) {
            return numWorking;
        } else {
            return this._queue.length + numWorking;
        }
    }

    runLoadQueue() {
        // Keep issuing loads until no workers left
        while (this._queue.length > 0 && this._freeWorkers.length > 0) {
            let workerID = this._freeWorkers.shift();
            let req = this.sortQueue();
            req.workerID = workerID;
            this._loading[workerID] = req;
            this.initRequest(req);
        }
    }

    workerMessage(event) {
        //This gets any postMessage requests
        let req, shell, anno;
        // console.log("Worker Data: " + event.data.file);
        // Find the request this message corresponds to
        if (_.indexOf(["rootLoad", "shellLoad", "annotationLoad", "loadError", "previewLoad", "previewEndLoad"], event.data.type) != -1) {
            req = this._loading[event.data.workerID];
        }
        // Put worker back into the queue - if it is the time
        if (_.indexOf(["rootLoad", "workerFinish", "loadError", "previewLoad"], event.data.type) != -1) {
            this._loading[event.data.workerID] = undefined;
            this._freeWorkers.push(event.data.workerID);
            this.runLoadQueue();
        }
        let data;
        switch (event.data.type) {
            case "rootLoad":
                if (req.type === 'assembly' || req.type == "cloudassembly") {
                    // Handle the assembly
                    this.buildAssemblyJSON(event.data.data, req);
                } else if (req.type === 'nc') {
                    // Handle the nc file
                    this.buildNCStateJSON(event.data.data, req);
                }
                break;
            case "annotationLoad":
                data = JSON.parse(event.data.data);
                anno = this._annotations[event.data.file];
                if (!anno) {
                    console.log('DataLoader.AnnotationLoad: invalid annotation ID ' + event.data.file);
                } else {
                    anno.addGeometry(data);
                    this.dispatchEvent({ type: "annotationLoad", file: event.data.file });
                }
                break;
            case "previewLoad":
                this.buildPreviewNCJSON(event.data.data, req);
                break;
            case "shellLoad":
            //This is the case where the shell comes in with position, normals and colors vector after ProcessShellJSON
                shell = this._shells[event.data.id+".json"];

                if (!shell) {
                    console.log('DataLoader.ShellLoad: invalid shell ID ' + event.data.id);
                } else {
                    data = event.data.data;
                    // Remove the reference to the shell
                    delete this._shells[event.data.id+".json"];

                    //Data.color is passed from the buffers.color from webworker.js 695
                    shell.addGeometry(data.position, data.normals, data.color, data.values, data.faces);
                    this.dispatchEvent({ type: "shellLoad", file: event.data.file });
                }
                break;
            case "workerFinish":
                this.dispatchEvent({ type: "workerFinish", file: event.data.file });
                break;
            case "parseComplete":
            case "loadProgress":
            case "loadComplete":
                this.dispatchEvent(event.data);
                break;
            case "loadError":
                if (req.callback) req.callback({
                    error: "loadError",
                    status: event.data.status,
                    file: req.url
                });
                break;
        }
        if ((this._freeWorkers.length === this._workers.length)
              && this._queue.length === 0){ //Done Loading?
          this.dispatchEvent({type:'QueueFinish'});
        }
    }

    initRequest(req) {
        // Fetch the worker to use
        let worker = this._workers[req.workerID];
        // Send the request to the worker
        let data = {
            url: req.baseURL + '/' + req.type + '/' + req.path,
            workerID: req.workerID,
            type: req.type,
            dataType: req.dataType ? req.dataType : 'json'
        };
        
        if (data.type === "shell") {
            data.shellSize = req.shellSize;
            let newpath = (req.baseURL).split('state')[0];
            if(newpath[newpath.length - 1] === '/')
                newpath = newpath.substring(0 , newpath.length - 1);

            // TODO: actually figure out whether we need /shell or not
            if (req.path.indexOf('mesh') >= 0) {
                data.url = newpath + '/geometry/' + req.path + '/' + req.type;
            } else {
                data.url = newpath + '/geometry/' + req.path;
            }

        } else if (data.type === 'previewShell') {
            data.shellSize = req.shellSize;
            let newpath = req.baseURL;
            if(newpath[newpath.length - 1] === '/')
                newpath = newpath.substring(0 , newpath.length - 1);

            data.url = newpath + '/geometry/' + req.path;
        }
        else if (data.type === "annotation") {
            let newpath = (req.baseURL).split('state')[0];
            if(newpath[newpath.length - 1] === '/')
                newpath = newpath.substring(0 , newpath.length - 1);
            data.url = newpath + '/geometry/' + req.path + '/' + req.type;
        }
        worker.postMessage(data);
    }
    
    buildPreviewNCJSON(data, req) {
        let doc = JSON.parse(data);
        let parts = req.base.split('/');
        let baseUrl = parts.slice(0, 3).join('/');

        let nc = new NC(null, null, null, this);

        _.each(doc.geom, (geomData) => {
            let color = DataLoader.parseColor('7d7d7d');
            let transform = DataLoader.parseXform(geomData.xform, true);
            // Is this a shell
            if (_.has(geomData, 'shell')) {
                if(geomData.usage === 'cutter')
                {
                    color = DataLoader.parseColor("FF530D");
                }
                if(geomData.usage === 'fixture' && this._app.services.machine === null){
                    return;
                }
                if (!geomData.usage) {
                    geomData.usage = 'tobe';
                }

                let boundingBox = DataLoader.parseBoundingBox(geomData.bbox);
                let shell = new Shell(geomData.id, nc, nc, geomData.size, color, boundingBox);
                nc.addModel(shell, geomData.usage, 'shell', geomData.id, transform, boundingBox);
                // Push the shell for later completion

                this._shells[geomData.shell] = shell;
                this.addRequest({
                    path: geomData.shell.split('.')[0],
                    baseURL: baseUrl,
                    type: 'shell',
                });
                // Is this a polyline
            } else if (_.has(geomData, 'polyline')) {
                let annotation = new Annotation(geomData.id, nc, nc);
                nc.addModel(annotation, geomData.usage, 'polyline', geomData.id, transform, undefined);
                // Push the annotation for later completion
                let name = geomData.polyline.split('.')[0];
                this._annotations[name] = annotation;
                this.addRequest({
                    path: name,
                    baseURL: baseUrl,
                    type: 'annotation'
                });
            } else {
                console.log('No idea what we found: ' + geomData);
            }
        });

        req.callback(undefined, nc);
    }

    buildAssemblyJSON(jsonText, req) {
        let doc = JSON.parse(jsonText);
        let rootID = doc.root;
        let defaultColor = DataLoader.parseColor("7d7d7d");
        let assembly = new Assembly(rootID, defaultColor, this);
        // Process the rest of the index JSON - get the product with the root ID
        let rootProduct = this.buildProductJSON(req, doc, assembly, rootID, true);
        assembly.setRootProduct(rootProduct);
        // Handle batches
        let batchExtension = doc.useTyson ? 'tyson' : 'json';
        // Do we have batches???
        if (doc.batches && doc.batches > 0) {
            for (let i = 0; i < doc.batches; i++) {
                this.addRequest({
                    path: i,
                    baseURL: req.base,
                    type: "batch",
                    dataType: batchExtension
                });
            }
        }
        req.callback(undefined, assembly);
    }
    //This is the initial load that then loads all shells below it
    buildNCStateJSON(jsonText, req) {
        let doc = JSON.parse(jsonText);
        //console.log('Process NC: ' + doc.project);
        let nc = new NC(doc.project, doc.workingstep, doc.time_in_workingstep, this);
        nc.applyDelta(doc,true)
          .then(()=>{
            nc.calcBoundingBox();
            this._app.actionManager.emit('invalidate', {'boundingBox': true, 'model': nc});
            if (doc.workingstep) {
                this._app.actionManager.emit('change-workingstep', doc.workingstep);
            }
            req.callback(undefined, nc);
        });
    }

    buildProductJSON(req, doc, assembly, id, isRoot) {
        // Create the product
        let productJSON = _.find(doc.products, { id: id });
        // Have we already seen this product
        if (!assembly.isChild(id)) {
            let product = new Product(id, assembly, productJSON.name, productJSON.step, isRoot);
            // Load child shapes first - MUST BE BEFORE CHILD PRODUCTS
            let identityTransform = (new THREE.Matrix4()).identity();
            _.each(productJSON.shapes, (shapeID) => {
                let shape = this.buildShapeJSON(req, doc, assembly, shapeID, undefined, identityTransform, isRoot);
                product.addShape(shape);
            });
            // Load child products
            _.each(productJSON.children, (childID) => {
                let child = this.buildProductJSON(req, doc, assembly, childID, false);
                product.addChild(child);
            });
            return product;
        }
        // Otherwise, just return the existing product
        return assembly.getChild(id);
    }

    buildShapeJSON(req, doc, assembly, id, parent, transform, isRoot) {
        // We are really only looking up stuff when non-root
        if (!isRoot) return assembly.getChild(id);
        // Ok, now let's really build some stuff
        let shapeJSON = _.find(doc.shapes, {id: id});
        let unit = shapeJSON.unit ? shapeJSON.unit : "unit 0.01";
        let shape = new Shape(id, assembly, parent, transform, unit, isRoot);
        // Load child shells
        _.each(shapeJSON.shells, (shellID) => {
            let shell = this.buildShellJSON(req, doc, shellID, assembly, shape);
            shape.addShell(shell);
        });
        // Load Child annotations
        _.each(shapeJSON.annotations, (annotationID) => {
            let annotation = this.buildAnnotationJSON(req, doc, annotationID, assembly, shape);
            shape.addAnnotation(annotation);
        });
        // Load child shapes
        _.each(shapeJSON.children, (childJSON) => {
            // Setup the child's transform
            let localTransform = DataLoader.parseXform(childJSON.xform, true);
            // Build the child
            let child = this.buildShapeJSON(req, doc, assembly, childJSON.ref, shape, localTransform, isRoot);
            shape.addChild(child);
        });
        return shape;
    }

    buildAnnotationJSON(req, doc, id, assembly, parent) {
        let alreadyLoaded = assembly.isChild(id);
        let annoJSON = _.find(doc.annotations, {id: id});
        // Do we have to load the shell
        if (annoJSON.href) {
            let anno = new Annotation(id, assembly, parent);
            // Have we already loaded this annotation - if not, request the shell be loaded?
            if (!alreadyLoaded) {
                this._annotations[id] = anno;
                this.addRequest({
                    path: annoJSON.id,
                    baseURL: req.base,
                    type: "annotation"
                });
            }
            return anno;
        } else {
            console.log("DataLoader.buildAnnotationJSON - Online - Not yet implemented");
            return undefined;
        }
    }

    buildShellJSON(req, doc, id, assembly, parent) {
        let alreadyLoaded = assembly.isChild(id);
        let shellJSON = _.find(doc.shells, {id: id});
        // Do we have to load the shell
        if (shellJSON.href) {
            let color = DataLoader.parseColor("7d7d7d");
            let boundingBox = DataLoader.parseBoundingBox(shellJSON.bbox);
            let shell = new Shell(id, assembly, parent, shellJSON.size, color, boundingBox);
            // Have we already loaded this Shell - if not, request the shell be loaded?
            if (!alreadyLoaded) {
                // Push the shell for later completion
                this._shells[id] = shell;
                //console.log(this._shells);
                if (!doc.batches || doc.batches === 0) {
                    this.addRequest({
                        path: shellJSON.id,
                        baseURL: req.base,
                        type: "shell"
                    });
                }
            }
            return shell;
        } else {
            console.log("DataLoader.buildShellJSON - Online - Not yet implemented");
            return undefined;
        }
    }
};
