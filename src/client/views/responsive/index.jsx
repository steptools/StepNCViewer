import React from 'react';
import _ from 'lodash';
import request from 'superagent';
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
    };

    // get the workplan
    this.getWorkPlan = this.getWorkPlan.bind(this);
    request.get('/v3/nc/workplan/').end(this.getWorkPlan);

    // get the project loopstate
    this.getLoopState = this.getLoopState.bind(this);
    request.get('/v3/nc/state/loop/').end(this.getLoopState);

    // get the cache of tools
    this.getToolCache = this.getToolCache.bind(this);
    request.get('/v3/nc/tools/').end(this.getToolCache);

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

        if (node.wpType) {
          ids.push(node.id);
        }

        if (node.type === 'tolerance') {
          let workingsteps = [];
          for (let i in json[node.workpiece].workingsteps) {
            let ws = json[node.workpiece].workingsteps[i];
            ws = this.state.workingstepCache[ws];
            if (node.workpiece === ws.toBe.id) {
              workingsteps.push(json[node.workpiece].workingsteps[i]);
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

    this.toggleHighlight = this.toggleHighlight.bind(this);
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

  openProperties(node, backtrack) {
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
  }

  openPreview(state) {
    if (state === true || state === false && state !== this.state.preview) {
      this.setState({preview: state});
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
          _.each(cache.children, (t) => {
            tols.push(t.id);
          });
          this.setState({
            'ws': workingstep.id,
            'wstext':workingstep.name.trim(),
            'highlightedTolerances': tols,
          });

          this.setState({'curtool': workingstep.tool});
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
    this.setState({ws: newWS});
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
    let HV, SV, FV;
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
        />
      );
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
          //
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
        />
      );
    }

    let cadviewStyle;

    // squish the cad view down to appropriate size
    if (this.state.guiMode === 0) {
      cadviewStyle =
      {
        'left': '390px',
        'top': '90px',
        'bottom': '0px',
        'right': '0px',
      };
    } else {
      let cadviewHeight = '80%';
      let fv = $('.Footer-container');

      if (typeof fv.offset() != 'undefined') {
        cadviewHeight = fv.offset().top;
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
      <div style={{height:'100%'}}>
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
