/* G. Hemingway Copyright @2015
 * Context for the visualization of a set of CAD models
 */
"use strict";

import DataLoader  from './data_loader';

/*************************************************************************/

export default class CADManager extends THREE.EventDispatcher {
  constructor(config, socket,app) {
    super();
    this.app = app;
    this.config = config;
    this.socket = socket;
    this._models = {};
    // Set this to default empty assembly
    this._root3DObject = new THREE.Object3D();
    // Setup data loader
    this._loader = new DataLoader(
      {
        autorun: false,
        workerPath: '/js/webworker.js'
      },
      app
    );
    this.bindFunctions = this.bindFunctions.bind(this);
    this.bindFunctions();
    // Start listening for events
    this.bindEvents();
  }

  // Load a new assembly request
  load(req) {
    // Default the model type to assembly
    req.type = req.modelType ? req.modelType : 'assembly';
    delete req.modelType;
    // Load the model
    this._loader.load(req, (err, model) => {
      if (err) {
        return;
      }
      // Add the model to the list of loaded models
      this._models[req.path] = model;
      this.dispatchEvent({
        type: 'model:add',
        path: req.path,
        viewType: req.viewType,
      });
      // Make sure all the rest of the parts have loaded
      this._loader.runLoadQueue();
    });
    // Get the rest of the files
    this._loader.runLoadQueue();
  }

  centerModels() { }

  bindFunctions() {
    this.bindEvents = this.bindEvents.bind(this);
    this.bindLoaderEvents = this.bindLoaderEvents.bind(this);
    this.bindModelEvents = this.bindModelEvents.bind(this);
    this.onVis = this.onVis.bind(this);
  }

  bindEvents() {
    this.addEventListener('setModel', this.load);
    // Rebroadcast data loader events
    this.bindLoaderEvents();
    // Listen for someone asking for stuff
    this.bindModelEvents();
    // Setup socket callbacks
    this.onDelta = this.onDelta.bind(this);
    if (this.config.socket && this.socket) {
      this.socket.on('nc:delta', this.onDelta);
    }

    //Handle geometry menu viz press
    this.app.actionManager.on('changeVis',this.onVis);
  }

  bindLoaderEvents() {
    // Set up handling of load events - pass them from the data-loader on
    let loaderEventHandler = (event)=>{
      this.dispatchEvent(event);
    };
    this._loader.addEventListener('addRequest',     loaderEventHandler);
    this._loader.addEventListener('loadComplete',   loaderEventHandler);
    this._loader.addEventListener('parseComplete',  loaderEventHandler);
    this._loader.addEventListener('shellLoad',      loaderEventHandler);
    this._loader.addEventListener('annotationLoad', loaderEventHandler);
    this._loader.addEventListener('workerFinish',   loaderEventHandler);
    this._loader.addEventListener('loadProgress',   loaderEventHandler);
  }

  bindModelEvents() {
    let modelsEventHandler = function(event) {
      let keys = _.keys(this._models);
      _.each(keys, (key) => {
        this._models[key].dispatchEvent(event);
      });
    };
    this.addEventListener('model',   modelsEventHandler);
    this.addEventListener('selected',modelsEventHandler);
  }

  clear() {
    this.dispatchEvent({
      type:   'model',
      action: 'reset'
    });
  }

  clearSelected(preselected) {
    // Toggle selected state of all selected objects
    let selected = preselected ? preselected : this.getSelected();
    _.each(selected, function(selection) {
      selection.toggleSelection();
    });
  }

  toggleOpacity(preselected) {
    let selected = preselected ? preselected : this.getSelected();
    _.each(selected, function(selection) {
      selection.toggleOpacity();
    });
  }

  toggleVisibility(preselected) {
    let selected = preselected ? preselected : this.getSelected();
    _.each(selected, function(selection) {
      selection.toggleVisibility();
    });
  }

  explode(step) {
    let selected = this.getSelected();
    _.each(selected, function(selection) {
      selection.explode(step);
    });
  }

  getSelected() {
    let keys = _.keys(this._models);
    let selected = _.map(keys, (key) => {
      return this._models[key].getSelected()
    });
    return _.flatten(selected);
  }

  getRootModel(key) {
    return this._models[key];
  }

  getRootVis() {
    return this._models["state/key"].getVis();
  }

  modelCount() {
    return _.size(this._models);
  }

  hitTest(camera, event) {
    let target = event.target;
    let rect = target.getBoundingClientRect();
    return _.reduce(
      this._models,
      (memo, model)=>{
        if (memo) {
          return memo;
        }
        let val = model.select(
          camera,
          (event.pageX - rect.left) / (rect.right - rect.left),
          (event.pageY - rect.top) / (rect.bottom - rect.top)
        );
        return val;
      },
      undefined
    );
  }

  onDelta(delta) {
    _.each(this._models, (model) => {
      if (model.project === delta.project) {
        model.applyDelta(delta).then((alter)=>{
          if (alter) {
            model.calcBoundingBox();
            // Only redraw if there were changes
            this.dispatchEvent({
              type: 'invalidate',
              'boundingBox': true,
              'model': model
            });
          }
        });
      }
    });
  }

  onVis(vis){
    _.each(this._models,(model)=>{
      model.vis(vis);
      model.calcBoundingBox();
      this.dispatchEvent({
        type: 'invalidate',
        'boundingBox': true,
        'model': model
      });
    });
  }
}
