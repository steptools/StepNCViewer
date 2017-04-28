import CADView from '../cad';
import HeaderView from '../header';
import SidebarView from '../sidebar';
import FooterView	from '../footer';

export default class ResponsiveView extends React.Component {
  constructor(props) {
    super(props);

    let tempGuiMode = 1;

    let innerWidth = window.innerWidth;
    let innerHeight = window.innerHeight;
    if ((innerWidth - 390 > innerHeight) && (innerWidth > 800)) {
      tempGuiMode = 0;
    }

    this.state = {
      guiMode: tempGuiMode,
      msGuiMode: false,
      svmode: 'ws',
      ws: -1,
      svtree: {
        'name': 'No Project Loaded',
        'isLeaf': true,
      },
      svaltmenu: '',
      wstext: '',
      ppbutton: 'play',
      logstate : false,
      resize: false,
      changeSpeed: false,
      playbackSpeed: 50,
      toolCache : [],
      curtool : '',
      toleranceCache: [],
      highlightedTolerances: [],
      workingstepCache: {},
      workingstepList: [],
      workplanCache: {},
      selectedEntity: null,
      previouslySelectedEntities: [null],
      preview: false,
      feedRate: 0,
      spindleSpeed: 0,
      previewEntity: null,
      workplanLoad: false,
      toolCacheLoad: false,
      loopStateLoad: false,
      curtoolLoad: false,
      WPTLoad: false
    };
    this.addBindings = this.addBindings.bind(this);
    this.addBindings();
    this.addListeners();
  }

  getWorkPlan(res) {
    let workingstepCache = {};
    let wsList = [];
    let planNodes = JSON.parse(res.text);
    let stepNodes = {};
    let index = 1;
    let negIndex = -1;
    let nodeCheck = (node) => {
      if (node.type === 'workingstep' || node.type ==='Nc Function') {
        node.number = index;
        node.leaf = true;
        stepNodes[node.id] = node;
        if (node.enabled) {
          wsList.push(node.id);
          index = index + 1;
        }
      } else {
        if (node.type === 'workplan-setup') {
          wsList.push(negIndex);
          stepNodes[negIndex] = {name: node.name};
          negIndex = negIndex - 1;
        }
        if (node.children.length !== 0) {
          node.children.map(nodeCheck);
        }
        node.leaf = false;
      }
      node.toggled = false;
    };
    nodeCheck(planNodes);
    workingstepCache = stepNodes;

    this.setState({
      'workplanCache':planNodes,
      'workingstepCache':workingstepCache,
      'workingstepList':wsList,
      'workplanLoad':true
    });
  }

  getLoopState(res) {
    let stateObj = JSON.parse(res.text);
    let newState = {};
    if (stateObj.state === 'play') {
      //Loop is running, we need a pause button.
      newState.ppbutton = 'pause';
    } else {
      newState.ppbutton = 'play';
    }

    newState.playbackSpeed = Number(stateObj.speed);
    newState.spindleSpeed = Number(stateObj.spindle);
    newState.feedRate = Number(stateObj.feed);
    newState.loopStateLoad = true;
    this.setState(newState);
  }

  getToolCache(res) {
    let tools = {};
    let json = JSON.parse(res.text);

    _.each(json, (tool) => {
      tool.icon = <span className='icon custom tool' />;
      tool.enabled = false;
      _.each(tool.workingsteps, (step) => {
        if (this.state.workingstepCache[step].enabled) {
          tool.enabled = true;
        }
      });

      tools[tool.id] = tool;
    });

    this.setState({
      'toolCache':tools,
      'toolCacheLoad':true
    });
  }

  getWPT(res) {
    // Node preprocessing
    let json = JSON.parse(res.text);
    let wps = {};
    let ids = [];
    let nodeCheck = (n) => {
      let node = n;

      if (node.children && node.children.length > 0) {
        node.enabled = true;
        node.leaf = false;
        _.each(node.children, nodeCheck);
      } else {
        node.leaf = true;
      }

      if (node.datums && node.datums.length > 0) {
        _.each(node.datums, nodeCheck);
      }

      if (node.wpType) {
        ids.push(node.id);
      }

      if (node.type === 'datum') {
        node.leaf = true;
        node.enabled = true;
      }

      wps[node.id] = node;
    };
    let concatNames = (n) => {
      if (n.type === 'tolerance' && !n.nameMod) {
        if (n.modName) {
          n.name = n.name + ' ' + n.modName;
        }
      } else if (n.type === 'workpiece' && n.children.length > 0) {
        concatNames(n.children);
      }
    };
    _.each(json, nodeCheck);
    _.each(wps, concatNames);
    this.setState({
      'toleranceCache':wps,
      'toleranceList':ids,
      'WPTLoad': true
    });
  }

  addBindings() {
    this.ppstate = this.ppstate.bind(this);
    this.ppBtnClicked = this.ppBtnClicked.bind(this);

    this.getWorkPlan = this.getWorkPlan.bind(this);
    this.getToolCache = this.getToolCache.bind(this);
    this.getWPT = this.getWPT.bind(this);
    this.getLoopState = this.getLoopState.bind(this);
    this.updateWS = this.updateWorkingstep.bind(this);

    this.handleResize = this.handleResize.bind(this);
    this.toggleMobileSidebar = this.toggleMobileSidebar.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);

    this.cbWS = this.cbWS.bind(this);

    this.speedChanged = this.speedChanged.bind(this);
    this.changeSpeed = this.changeSpeed.bind(this);

    this.openProperties = this.openProperties.bind(this);
    this.openPreview = this.openPreview.bind(this);
    this.selectEntity = this.selectEntity.bind(this);

    this.toggleHighlight = this.toggleHighlight.bind(this);
    this.addListeners = this.addListeners.bind(this);
  }

  addListeners() {
    this.props.app.socket.on('nc:state', (state) => {
      this.ppstate(state);
    });
    this.props.app.socket.on('nc:probe', (probe)=>{
      this.setState({'probe':probe});
    })

    this.props.app.actionManager.on('sim-pp', this.ppBtnClicked);
    this.props.app.actionManager.on('sim-f', () => {
      this.nextws();
    });
    this.props.app.actionManager.on('sim-b', () => {
      this.prevws();
    });

    this.props.app.actionManager.on('change-workingstep', this.updateWS);

    this.props.app.actionManager.on('simulate-setspeed', this.changeSpeed);
    this.props.app.socket.on('nc:speed', (speed) => {
      this.speedChanged(speed);
    });

    this.props.app.socket.on('nc:feed', (feed) => {
      this.setState({'feedRate' : feed});
    });

    this.props.app.socket.on('nc:spindle', (spindle) => {
      this.setState({'spindleSpeed' : spindle});
    });
    this.props.app.socket.on('nc:qifLoad', ()=>{
      request.get('/v3/nc/workpieces/').then(this.getWPT);
    });
  }


  componentWillMount(){
    // get the workplan
    request.get('/v3/nc/workplan/')
      .then(this.getWorkPlan)
      .then(()=>{
        // get the cache of tools, need workplan first
        return request.get('/v3/nc/tools/');
      }).then(this.getToolCache);

    // get the project loopstate
    request.get('/v3/nc/state/loop/').then(this.getLoopState);

    // get the current tool
    request.get('/v3/nc/tools/' + this.state.ws).then((res) => {
      this.setState({
        'curtool':res.text,
        'curtoolLoad':true
      });
    });
    // get data for workpiece/tolerance view
    request.get('/v3/nc/workpieces/').then(this.getWPT);
    request.get('/v3/nc/project').then((res)=>{this.setState({'projectName':res.text});});

  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('keyup', this.handleKeyup);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('keyup', this.handleKeyup);
  }

  handleResize() {
    let innerWidth = window.innerWidth;
    let innerHeight = window.innerHeight;
    if ((innerWidth - 390 > innerHeight) && (innerWidth > 800)) {
      this.setState({guiMode: 0});
    } else {
      this.setState({guiMode: 1});
    }

    this.setState({resize: true});
    this.setState({resize: false});
  }

  handleKeydown(e) {
    window.removeEventListener('keydown', this.handleKeydown);

    switch (e.keyCode) {
      case 27: // ESC
        if (this.state.preview === true) {
          this.openPreview(false);
        } else {
          this.openProperties(null);
        }
        break;
    }
  }

  handleKeyup() {
    window.addEventListener('keydown', this.handleKeydown);
  }

  toggleMobileSidebar(newMode) {
    this.setState({msGuiMode: newMode});
  }

  openProperties(node, backtrack, cb) {
    let currEntity = this.state.selectedEntity;
    let prevEntities = this.state.previouslySelectedEntities;
    if (node === null) {
      this.setState({
        previouslySelectedEntities: [null],
        selectedEntity: null,
      });
    } else if (currEntity === null) {
      this.setState({selectedEntity: node});
    } else {
      if (backtrack) {
        prevEntities.shift();
      } else {
        prevEntities.unshift(currEntity);
      }
      this.setState({
        previouslySelectedEntities: prevEntities,
        selectedEntity: node,
      });
    }

    if (cb) {
      cb();
    }
  }

  openPreview(state) {
    if (state === true || state === false && state !== this.state.preview) {
      this.setState({preview: state});
    }
  }

  selectEntity(event, entity , key) {
    if(key!==undefined) event.key=key;
    if (event.key === 'goto') {
      let url = '/v3/nc/state/ws/' + entity.id;
      request.get(url).end();
    } else if (event.key === 'tool') {
      // open properties page for associated tool
      this.openProperties(this.state.toolCache[entity.tool]);
    } else if (event.key === 'preview') {

      let prevId;
      let prevEntity = entity;

      if (entity.type === 'workingstep') {
        prevId = entity.toBe.id;
        prevEntity = this.state.toleranceCache[entity.toBe.id];
      } else if (entity.type === 'tolerance' || entity.type === 'datum') {
        prevId = entity.workpiece;
        prevEntity = this.state.toleranceCache[entity.workpiece];
      } else if (entity.type === 'tool') {
        prevId = entity.id + '/tool';
      } else {
        prevId = entity.id;
      }

      if (this.state.previewEntity !== prevEntity || !this.state.preview) {
        this.setState({'previewEntity': prevEntity});

        let url = this.props.app.services.apiEndpoint
          + this.props.app.services.version + '/nc';
        this.props.app.cadManager.dispatchEvent({
          type: 'setModel',
          viewType: 'preview',
          path: prevId.toString(),
          baseURL: url,
          modelType: 'previewShell',
        });
      }

      this.openPreview(true);
    }
  }

  updateWorkingstep(ws) {
    let url = '/v3/nc/workplan/' + ws;

    let requestCB = (error, response) => {
      if (!error && response.ok) {
        if (response.text) {
          let workingstep = JSON.parse(response.text);
          let tols = [];
          if(workingstep.tolerances!==undefined && workingstep.tolerances.length>0){
            _.each(workingstep.tolerances, (t) => {
              let tol = this.state.toleranceCache[t];
              tols.push(tol.id);
              if(tol.children!==undefined && tol.children.length>0)
                _.each(tol.children,(d)=>{
                  tols.push(d.id);
                });
            });
          }
          if (this.state.ws !== workingstep.id) {
            this.setState({
              'ws': workingstep.id,
              'wstext':workingstep.name.trim(),
              'highlightedTolerances': tols,
              'curtool': workingstep.tool,
            });
          }
        } else {
          this.setState({'ws':ws,'wstxt':'Operation Unknown'});
        }
      }
    };

    request.get(url).end(requestCB);
  }

  toggleHighlight(id) {
    let newTols;

    if (this.state.highlightedTolerances.indexOf(id) < 0) {
      newTols = _.concat(this.state.highlightedTolerances, id);
    } else {
      newTols = _.without(this.state.highlightedTolerances, id);
    }

    this.setState({'highlightedTolerances': newTols});
  }

  playpause() {
    let url = '/v3/nc/state/loop/';
    if (this.state.ppbutton ==='play') {
      this.ppstate('play');
      url = url+'start';
    } else {
      this.ppstate('pause');
      url = url+'stop';
    }
    request.get(url).end();
  }

  nextws() {
    let url = '/v3/nc/state/ws/next';
    request.get(url).end();
  }

  prevws() {
    let url = '/v3/nc/';
    url = url + 'state/ws/prev';
    request.get(url).end();
  }

  ppstate(state) {
    let notstate;
    if (state==='play') {
      notstate = 'pause';
    } else {
      notstate = 'play';
    }
    this.setState({'ppbutton':notstate});
  }

  ppBtnClicked() {
    let cs = this.state.ppbutton;
    this.ppstate(cs);
    this.playpause();
  }

  cbWS(newWS) {
    console.log('cbWS(' + newWS + ')');
    newWS = parseInt(newWS, 10);
    if (newWS !== this.state.ws) {
      this.setState({ws: newWS});
    }
  }

  speedChanged(speed) {
    if (!this.state.changeSpeed) {
      // just update to match server
      this.setState({'playbackSpeed': Number(speed)});
    } else if (this.state.playbackSpeed === Number(speed)) {
      // server speed matches client speed now
      this.setState({'changeSpeed': false});
    }
    // something didn't match up, wait for the proper server response
  }

  changeSpeed(event) {
    let speed = event.target.value;
    if (!speed) {
      speed = event.target.attributes.value.value;
    }

    // set the value itself
    this.setState({'playbackSpeed': Number(speed)});

    if (event.type === 'change') {
      return;
    }

    // tell the client to wait for server speed to catch up
    this.setState({'changeSpeed': true});

    // now send a request to the server to change its speed
    let url = '/v3/nc/state/loop/' + Number(speed);
    request.get(url).end(() => {});
  }

  render() {
    if(!(this.state.workplanLoad && this.state.toolCacheLoad && this.state.loopStateLoad && this.state.curtoolLoad && this.state.WPTLoad)){
      return (<div></div>);
    }
    let probeMsg;
    if (this.state.probe){
      probeMsg = this.state.probe.contact; //JSON.stringify(this.state.probe.contact);
    }
    let HV, SV, FV, cadviewStyle;
    if (this.state.guiMode === 0) {
      HV = (
        <HeaderView
          cadManager={this.props.app.cadManager}
          actionManager={this.props.app.actionManager}
          socket={this.props.app.socket}
          cbPPButton={
            (newPPButton) => this.setState({ppbutton: newPPButton})
          }
          cbLogstate = {
            (newlogstate) => this.setState({logstate: newlogstate})
          }
          ppbutton={this.state.ppbutton}
          logstate={this.state.logstate}
          speed={this.state.playbackSpeed}
          ws={this.state.ws}
          workingstepCache={this.state.workingstepCache}
          feedRate={this.state.feedRate}
          spindleSpeed={this.state.spindleSpeed}
          spindleUpdateCb={
            (newSpindleSpeed) => this.setState({spindleSpeed: newSpindleSpeed})
          }
          feedUpdateCb={
            (newFeedRate) => this.setState({feedRate: newFeedRate})
          }
          probeMsg = {probeMsg}
          fname = {this.state.projectName}
        />
      );
      SV = (
        <SidebarView
          cadManager={this.props.app.cadManager}
          app={this.props.app}
          actionManager={this.props.app.actionManager}
          socket={this.props.app.socket}
          mode={this.state.svmode}
          isRunning={this.state.ppbutton!=='play'}
          ws={this.state.ws}
          tree={this.state.svtree}
          altmenu={this.state.svaltmenu}
          cbMode={
              (newMode) => this.setState({svmode: newMode})
          }
          cbWS={this.cbWS}
          cbTree={
              (newTree) => this.setState({svtree: newTree})
          }
          cbAltMenu={
              (newAltMenu) => this.setState({svaltmenu: newAltMenu})
          }
          toolCache={this.state.toolCache}
          curtool={this.state.curtool}
          toleranceList={this.state.toleranceList}
          toleranceCache={this.state.toleranceCache}
          workplanCache={this.state.workplanCache}
          workingstepCache={this.state.workingstepCache}
          workingstepList={this.state.workingstepList}
          openProperties={this.openProperties}
          selectedEntity={this.state.selectedEntity}
          previouslySelectedEntities={this.state.previouslySelectedEntities}
          isMobile={false}
          preview={this.state.preview}
          openPreview={this.openPreview}
          toggleHighlight={this.toggleHighlight}
          highlightedTolerances={this.state.highlightedTolerances}
          selectEntity={this.selectEntity}
          previewEntity={this.state.previewEntity}
          previewEntityCb={(e) => {this.setState({'previewEntity': e})}}
        />
      );
      cadviewStyle = {
        'left': '390px',
        'top': '90px',
        'bottom': '0px',
        'right': '0px',
      };
    } else {
      FV = (
        <FooterView
          cadManager={this.props.app.cadManager}
          actionManager={this.props.app.actionManager}
          socket={this.props.app.socket}
          wsid={this.state.ws}
          wstext={this.state.wstext}
          cbWS={this.cbWS}
          cbWSText={
            (newWSText) => this.setState({wstext: newWSText})
          }
          ppbutton={this.state.ppbutton}
          cbMobileSidebar={this.toggleMobileSidebar}
          msGuiMode={this.state.msGuiMode}
          app={this.props.app}
          mode={this.state.svmode}
          tree={this.state.svtree}
          altmenu={this.state.svaltmenu}
          cbMode={
              (newMode) => this.setState({svmode: newMode})
          }
          cbTree={
              (newTree) => this.setState({svtree: newTree})
          }
          cbAltMenu={
              (newAltMenu) => this.setState({svaltmenu: newAltMenu})
          }
          toolCache={this.state.toolCache}
          curtool={this.state.curtool}
          toleranceList={this.state.toleranceList}
          toleranceCache={this.state.toleranceCache}
          workplanCache={this.state.workplanCache}
          workingstepCache={this.state.workingstepCache}
          workingstepList={this.state.workingstepList}
          openProperties={this.openProperties}
          selectedEntity={this.state.selectedEntity}
          previouslySelectedEntities={this.state.previouslySelectedEntities}
          preview={this.state.preview}
          openPreview={this.openPreview}
          toggleHighlight={this.toggleHighlight}
          highlightedTolerances={this.state.highlightedTolerances}
          selectEntity={this.selectEntity}
          previewEntity={this.state.previewEntity}
          previewEntityCb={(e) => {this.setState({'previewEntity': e})}}
        />
      );
      let cadviewHeight = '80%';
      let fv = $('.Footer-container');
      let rv = $('.RespView');
      let fb = $('.Footer-bar');
      let db = $('.drawerbutton');

      if (typeof fv.offset() != 'undefined') {
        cadviewHeight = (rv.height() - (db.height() + fb.height()));
        cadviewHeight = cadviewHeight + 'px';
      } else {
        cadviewHeight = '100%';
      }

      cadviewStyle = {
        'top': '0',
        'right': '0px',
        'width': '100%',
        'height': cadviewHeight,
      };
    }

    return (
      <div className='RespView' style={{height:'100%'}}>
        {HV}
        {SV}
        <div id='cadview-container' style={cadviewStyle}>
          <CADView
            manager={this.props.app.cadManager}
            openProperties={this.openProperties}
            viewContainerId='primary-view'
            root3DObject={this.props.app._root3DObject}
            guiMode={this.state.guiMode}
            resize={this.state.resize}
            selectedEntity={this.state.selectedEntity}
            toleranceCache={this.state.toleranceCache}
            ws={this.state.ws}
            workingstepCache={this.state.workingstepCache}
            highlightedTolerances={this.state.highlightedTolerances}
          />
        </div>
        {FV}
      </div>
    );
  }
}
