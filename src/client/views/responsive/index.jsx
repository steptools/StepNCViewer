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
      playbackSpeed: 100,
      logtext : 'default',
      toolCache : [],
      curtool : '',
      toleranceCache: [],
      highlightedTolerances: [],
      workingstepCache: {},
      workingstepList: [],
      workplanCache: {},
      selectedEntity: null,
      previouslySelectedEntities: [null],
      mtc: {},
      live: false,
      preview: false,
      feedRate: 0,
      spindleSpeed: 0,
      machineList: [],
      selectedMachine: 0,
      previewEntity: null,
    };

    // get the workplan
    this.getWorkPlan = this.getWorkPlan.bind(this);
    this.getToolCache = this.getToolCache.bind(this);

    request.get('/v3/nc/workplan/').end((req, res) => {
      this.getWorkPlan(req, res);

      // get the cache of tools, need workplan first
      request.get('/v3/nc/tools/').end(this.getToolCache);
    });

    // get the project loopstate
    this.getLoopState = this.getLoopState.bind(this);
    request.get('/v3/nc/state/loop/').end(this.getLoopState);

    // get the current tool
    request.get('/v3/nc/tools/' + this.state.ws).end((err, res) => {
      if (!err && res.ok) {
        this.state.curtool = res.text;
      }
    });

    // get data for workpiece/tolerance view
    this.getWPT = this.getWPT.bind(this);
    request.get('/v3/nc/workpieces/').end(this.getWPT);

    this.addBindings();
    this.addListeners();
  }

  getWorkPlan(err, res) {
    if (!err && res.ok) {
      let workingstepCache = {};
      let wsList = [];
      let planNodes = JSON.parse(res.text);
      let stepNodes = {};
      let index = 1;
      let negIndex = -1;
      let nodeCheck = (node) => {
        if (node.type === 'workingstep') {
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

      this.state.workplanCache = planNodes;
      this.state.workingstepCache = workingstepCache;
      this.state.workingstepList = wsList;

    } else {
      console.log(err);
    }
  }

  getLoopState(err, res) {
    if (!err && res.ok) {
      let stateObj = JSON.parse(res.text);

      if (stateObj.state === 'play') {
        //Loop is running, we need a pause button.
        this.state.ppbutton = 'pause';
      } else {
        this.state.ppbutton = 'play';
      }

      this.state.playbackSpeed = Number(stateObj.speed);
      this.state.spindleSpeed = Number(stateObj.spindle);
      this.state.feedRate = Number(stateObj.feed);
    } else {
      console.log(err);
    }
  }

  getToolCache(err, res) {
    if (!err && res.ok) {
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

      this.state.toolCache = tools;
    } else {
      console.log(err);
    }
  }

  getWPT(err, res) {
    if (!err && res.ok) {
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

        if (node.type === 'tolerance') {
          let workingsteps = [];
          for (let i of json[node.workpiece].workingsteps) {
            let ws = this.state.workingstepCache[i];
            if (ws && node.workpiece === ws.toBe.id) {
              workingsteps.push(i);
            }
          }
          node.workingsteps = workingsteps;
        } else if (node.type === 'datum') {
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
      this.state.toleranceCache = wps;
      this.state.toleranceList = ids;
    } else {
      console.log(err);
    }
  }

  addBindings() {
    this.getWorkplan = this.getWorkplan.bind(this);
    this.getLoopstate = this.getLoopstate.bind(this);
    this.getViewData = this.getViewData.bind(this);

    this.ppstate = this.ppstate.bind(this);
    this.ppBtnClicked = this.ppBtnClicked.bind(this);

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

    this.updateMTC = this.updateMTC.bind(this);

    this.changeMachine = this.changeMachine.bind(this);
  }

  addListeners() {
    this.props.app.socket.on('nc:state', (state) => {
      this.ppstate(state);
    });

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

    this.props.app.socket.on('nc:mtc', (MTC) => {
      this.updateMTC(MTC);
    });

    this.props.app.socket.on('nc:feed', (feed) => {
      this.setState({'feedRate' : feed});
    });

    this.props.app.socket.on('nc:spindle', (spindle) => {
      this.setState({'spindleSpeed' : spindle});
    });
  }

  componentWillMount() {
    //
  }

  getWorkplan() {
    // set a temp variable for the workingstep cache
    let workingstepCache = {};
    let wsList = [];

    // get the workplan
    let url = '/v3/nc/workplan/';
    let resCb = (err, res) => { //Callback function for response
      if (!err && res.ok) {
        let planNodes = JSON.parse(res.text);
        let stepNodes = {};
        let index = 1;
        let negIndex = -1;
        let nodeCheck = (node) => {
          if (node.type === 'workingstep') {
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

        this.setState({'workplanCache': planNodes});
        this.setState({'workingstepCache': workingstepCache});
        this.setState({'workingstepList': wsList});

      } else {
        console.log(err);
      }
    };
    request.get(url).end(resCb);
  }

  changeMachine(machineId) {
    let url = '/v3/nc/state/machine/' + machineId;
    request.get(url).end();

    this.setState({
      selectedMachine: machineId
    });
  }

  getLoopstate() {
    // get the project loopstate
    let url = '/v3/nc/state/loop/';
    let resCb = (error, response) => {
      if (!error && response.ok) {
        let stateObj = JSON.parse(response.text);

        if (stateObj.state === 'play') {
          //Loop is running, we need a pause button.
          this.setState({'ppbutton': 'pause'});
        } else {
          this.setState({'ppbutton':'play'});
        }

        this.setState({'playbackSpeed': Number(stateObj.speed)});
        this.setState({'spindleSpeed': Number(stateObj.spindle)});
        this.setState({'feedRate': Number(stateObj.feed)});
      } else {
        console.log(error);
      }
    };
    request.get(url).end(resCb);
  }

  getViewData() {
    // get data for workpiece/tolerance view
    let url = '/v3/nc/workpieces/';
    let resCb = (err, res) => { //Callback function for response
      if (!err && res.ok) {
        // Node preprocessing
        let json = JSON.parse(res.text);
        let wps = {};
        let ids = [];
        let nodeCheck = (n) => {
          let node = n;

          if (node.wpType && node.children && node.children.length > 0) {
            ids.push(node.id);
            node.enabled = true;
            node.leaf = false;
            _.each(node.children, nodeCheck);
          } else {
            node.leaf = true;
            if (node.type === 'tolerance') {
              node.workingsteps = json[node.workpiece].workingsteps;
            }
          }

          wps[node.id] = node;
        };
        let concatNames = (n) => {
          if(n.type === 'tolerance' && !n.nameMod){
            if(n.modName){
              n.name = n.name + ' ' + n.modName;
            }
            if(n.rangeName){
              n.name = n.name + ' ' + n.rangeName;
            }
          }
          else if(n.type === 'workpiece' && n.children.length > 0){
            concatNames(n.children);
          }
        }
        _.each(json, nodeCheck);
        _.each(wps, concatNames);
        this.setState({'toleranceCache': wps});
        this.setState({'toleranceList': ids});
      } else {
        console.log(err);
      }
    };
    request.get(url).end(resCb);
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('keyup', this.handleKeyup);

    this.getWorkplan();
    this.getLoopstate();
    this.getViewData();

    // get the cache of tools
    let url = '/v3/nc/tools/';
    let resCb = (err, res) => { //Callback function for response
      if (!err && res.ok) {
        let tools = {};
        let json = JSON.parse(res.text);

        _.each(json, (tool)=> {
          tool.icon = <span className='icon custom tool'/>;
          tools[tool.id] = tool;
        });

        this.setState({toolCache: tools});
      } else {
        console.log(err);
      }
    };
    request.get(url).end(resCb);

    // get the current tool
    url = '/v3/nc/tools/' + this.state.ws;
    request
      .get(url)
      .end((err, res) => {
        if (!err && res.ok) {
          this.setState({curtool: res.text});
        }
      });

    // get initial mtc data
    url = '/v3/nc/state/mtc';
    resCb = (err, res) => {
      if (!err && res.ok) {
        this.setState({mtc: JSON.parse(res.text)});
      }
    };
    request.get(url).end(resCb);

    url = '/v3/nc/state/loop/start';
    request.get(url).end();

    url = '/v3/nc/state/machines';
    resCb = (err, res) => {
      if (!err && res.ok) {
        this.setState({machineList: JSON.parse(res.text)});
      }
    };
    request.get(url).end(resCb);

    url = '/v3/nc/state/machine';
    resCb = (err, res) => {
      if (!err && res.ok) {
        this.setState({selectedMachine: Number(res.text)});
      }
    };
    request.get(url).end(resCb);
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

  selectEntity(event, entity) {
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
          let cache = this.state.toleranceCache[workingstep.toBe.id];
          _.each(cache.datums, (t) => {
            tols.push(t.id);
          });
          _.each(cache.children, (t) => {
            tols.push(t.id);
          });
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

  updateMTC(MTC) {
    let mtc = MTC;
    let stateup = {};
    if(this.state.live !=mtc.live) stateup.live = mtc.live;
    if(this.state.spindleSpeed !=mtc.spindleSpeed) stateup.spindleSpeed = mtc.spindleSpeed;
    if(this.state.feedRate != mtc.feedrate) stateup.feedRate = mtc.feedrate;
    if(this.state.feedUnit!=mtc.feedrateUnits) stateup.feedUnit = mtc.feedrateUnits;
    if(this.state.currentGcode != mtc.currentGcode) stateup.currentGcode = mtc.currentGcode;
    if(!_.isEmpty(stateup))
      this.setState(stateup);
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

  cbWS(newWS) {
    console.log('cbWS(' + newWS + ')');
    newWS = parseInt(newWS, 10);
    if (newWS !== this.state.ws) {
      this.setState({ws: newWS});
    }
  }

  render() {
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
          feedRateUnits={this.state.feedUnit}
          spindleSpeed={this.state.spindleSpeed}
          live={this.state.live}
          currentGcode={this.state.currentGcode}
          machineList={this.state.machineList}
          changeMachine={this.changeMachine}
          selectedMachine={this.state.selectedMachine}
        />
      );
      SV = (
        <SidebarView
          cadManager={this.props.app.cadManager}
          app={this.props.app}
          actionManager={this.props.app.actionManager}
          socket={this.props.app.socket}
          mode={this.state.svmode}
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
