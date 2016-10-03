var md = require('node-markdown').Markdown;
import Menu, {SubMenu, Item as MenuItem} from 'rc-menu';
let changetext='';

function getIcon(type, data) {
  if (!data) {
    data = '';
  }

  switch (type) {
    case 'backward':
      return 'icon glyphicon glyphicon-step-backward';
    case 'forward':
      return 'icon glyphicon glyphicon-step-forward';
    case 'play':
      return 'icon glyphicon glyphicon-play';
    case 'pause':
      return 'icon glyphicon glyphicon-pause';
    case 'speed':
      if (data === 'left') {
        return 'icon left glyphicons glyphicons-turtle';
      } else if (data === 'right') {
        return 'icon right glyphicons glyphicons-rabbit';
      }
    case 'feedrate':
      return 'icon glyphicons glyphicons-dashboard';
    case 'spindlespeed':
      if (data === 'CW') {
        return 'icon glyphicons glyphicons-rotate-right';
      } else if (data === 'CCW') {
        return 'icon glyphicons glyphicons-rotate-left';
      } else {
        return 'icon glyphicons glyphicons-refresh';
      }
    case 'changelog':
      return 'icon glyphicon glyphicon-book';
    case 'live':
      return 'icon glyphicons glyphicons-record';
    case 'gcode':
      return 'icon glyphicons glyphicons-chevron-right';
    case 'machine':
      return 'icon glyphicons glyphicons-settings';
    case 'geometry':
      return 'icon glyphicons glyphicons-cube-empty';
    case 'download':
      return 'icon glyphicons glyphicons-cloud-download';
    case 'view':
      return 'icon glyphicons glyphicons-eye-open';
    case 'noview':
      return 'icon glyphicons glyphicons-eye-close';
    case 'reset':
      return 'icon glyphicons glyphicons-recycle';
    default:
      return 'icon glyphicons glyphicons-question-sign';
  }
}

class Button extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let icon = getIcon(this.props.eventKey);
    if (this.props.icon) {
      icon = getIcon(this.props.icon);
    }
    let iid='';
    if(this.props.iid) iid=this.props.iid;
    return (
      <MenuItem {...this.props} className='button'>
        <div className={icon} id={iid}/>
        {this.props.children}
      </MenuItem>
    );
  }
}
class GeomBtn extends React.Component {
  constructor(props) {
    super(props);
    this.dlClick = this.dlClick.bind(this);
    this.visClick = this.visClick.bind(this);
  }

  dlClick(info){
    this.props.actionManager.emit('STLDL',this.props.type);
  }
  visClick(info){
    this.props.actionManager.emit('changeVis',this.props.type);
  }
  render() {
    let icon = getIcon(this.props.view);
    let iid='';
    if(this.props.iid) iid=this.props.iid;
    return (
      <MenuItem {...this.props} className = "button">
        <div className="geom">
          <div className={icon} id={iid} onClick = {this.visClick} />
          <div className={getIcon("download")} onClick = {this.dlClick} />
        </div>
        {this.props.children}
      </MenuItem>
    );
  }  
}
class LiveBtn extends React.Component {
  constructor(props){
    super(props);
  };
  render(){
    let cname = 'info live';
    if(this.props.live) cname +=' active';
    return (
      <MenuItem {...this.props} key='live' className={cname}>
          <div className='item'>
            <div className={getIcon('live')}/>
            <div className='text'>
              <div className='value'>{this.props.live?"Live":"Stopped"}</div>
            </div>
          </div>
        </MenuItem>)};
}

class FeedSpeed extends React.Component {
  constructor(props){
    super(props);
  }
  render(){
    let baseopt;
    if (this.props.baseFeed>-1 && this.props.optimizedFeed >-1 ) {
      baseopt = (
        <div>
          <div className='title'>Base: {this.props.baseFeed}</div>
          <div className='title'>Actual: {this.props.feed}</div>
          <div className='title'>Optimized: {this.props.optimizedFeed}</div>
        </div>
      );
    } else {
      baseopt = (
        <div className='title'>Actual: {this.props.feed}</div>
      );
    }
    return (        <MenuItem {...this.props} key='feed-speed' className='info feed-speed'>
    <div className='item'>
      <div className={getIcon('feedrate')}/>
      <div className='text'>
        {baseopt}
      </div>
    </div>
        {/*<div className='item'>
      <div className={this.props.rotation}/>
      <div className='text'>
        <div className='title'>Spindle speed:</div>
        <div className='value'>{this.props.speed}</div>
      </div>
    </div>*/}
      <div>{"Feedrate ("+this.props.feedUnit+")"}</div>
  </MenuItem>)}
}
FeedSpeed.propTypes = {
  feed: React.PropTypes.number.isRequired,
  feedUnit: React.PropTypes.string.isRequired,
  baseFeed: React.PropTypes.number.isRequired,
  optimizedFeed: React.PropTypes.number.isRequired,
  speed: React.PropTypes.number.isRequired,
  rotation: React.PropTypes.string.isRequired
}

class GeomMenu extends React.Component {
  constructor(props){
    super(props);
    this.pathClick = this.pathClick.bind(this);
    this.state = {
      path:'view',
      asis:'noview',
      tobe:'noview',
      machine:'view',
      removal:'view',
      cutter:'view'
    };
    this.props.actionManager.on('changeVis',(arg)=>{
      let l={}; 
      if(this.state[arg]==='view')
        l[arg]='noview'; 
      else
        l[arg]='view';
      this.setState(l);
    });
  }

  pathClick(info){
    if(info.key==='path')
      this.props.actionManager.emit('changeVis','path');
  }
  render(){ return(
      <SubMenu {...this.props} onClick={this.pathClick} className="geommenu" title={
        <div className='item'>
          <div className={getIcon('geometry')} />
          <div className='text'>
            <div className='title'>Geometry</div>
          </div>
        </div>
      } >
        <GeomBtn actionManager = {this.props.actionManager} view={this.state.asis} type='asis'>As-Is</GeomBtn>
        <GeomBtn actionManager = {this.props.actionManager} view={this.state.tobe} type='tobe'>To-Be</GeomBtn>
        <GeomBtn actionManager = {this.props.actionManager} view={this.state.cutter} type='cutter'>Tool</GeomBtn>
        <GeomBtn actionManager = {this.props.actionManager} view={this.state.machine} type='machine'>Machine</GeomBtn>
        <GeomBtn actionManager = {this.props.actionManager} view={this.state.removal} type='removal'>Removal</GeomBtn>
        <Button icon={this.state.path} key='path'>Toolpath</Button>
      </SubMenu>
  )}
}

let resetProcessVolume = function(){
  request.get("/v3/nc/geometry/delta/reset").end();
}
export default class HeaderView extends React.Component {
  constructor(props) {
    super(props);

    this.simulateMenuItemClicked = this.simulateMenuItemClicked.bind(this);
    this.updateSpeed = this.updateSpeed.bind(this);
    this.getFeedSpeedInfo = this.getFeedSpeedInfo.bind(this);
    this.renderMachineButton = this.renderMachineButton.bind(this);
  }

  componentDidMount() {
    let changes = $('#changes');
    let logbutton = $('#logbutton');

    // get the current tool
    let url = '/changelog/';
    request
      .get(url)
      .end((err,res) => {
        if (!err && res.ok) {
          changetext=res.text;
          changes.html(md(changetext));
          logbutton.html('v' + md(changetext).split('\n')[0].split(' ')[1]);
        }
      });
  }

  renderMachineButton(machine) {
    let id = this.props.machineList.indexOf(machine);

    return (
      <MenuItem
        className='machine-button'
        key={'machine-'+id}
      >
        <span>{machine.name}</span>
      </MenuItem>
    );
  }

  getFeedSpeedInfo() {
    let fr = 'Not defined';
    let ss = 'Not defined';
    let ssIcon = null;
    if (this.props.feedRate !== undefined) {
      fr = Number(this.props.feedRate).toFixed(1);
    }
    if (this.props.spindleSpeed !== 0) {
      ss = Math.abs(this.props.spindleSpeed) + ' rev/min';
      if (this.props.spindleSpeed > 0) {
        ss += ' (CCW)';
        ssIcon = getIcon('spindlespeed', 'CCW');
      } else {
        ss += ' (CW)';
        ssIcon = getIcon('spindlespeed', 'CW');
      }
    } else {
      ssIcon = getIcon('spindlespeed');
    }
    return [fr, ss, ssIcon];
  }

  updateSpeed(info) {
    this.props.actionManager.emit('simulate-setspeed', info);
  }

  simulateMenuItemClicked(info) {
    switch (info.key) {
      case 'changelog':
        let changelog = document.getElementById('changes');
        if (this.props.logstate === false) {
          changelog.className = 'changelog visible';
          this.props.cbLogstate(true);
        } else {
          changelog.className = 'changelog';
          this.props.cbLogstate(false);
        }
        break;
      case 'reset':
        resetProcessVolume();
        break;
      default:
        if (info.key.indexOf('machine') >= 0) {
          let id = info.key.split('-')[1];
          this.props.changeMachine(Number(id));
        }
    }
  }

  render() {
    let feedSpeedInfo = this.getFeedSpeedInfo();
    const headerMenu = (
      <Menu
        mode='horizontal'
        onClick={this.simulateMenuItemClicked}
        className='header-menu'
        openSubMenuOnMouseEnter={false}
      >
        <MenuItem disabled key='mtc' className='info mtc'/>
        <GeomMenu actionManager = {this.props.actionManager} />
        <Button key='reset' iid='removal' icon='reset'>
          <div className='text'>Reset<br />Removal</div>
        </Button>
        <FeedSpeed disabled 
                   feed={feedSpeedInfo[0]} 
                   feedUnit={this.props.feedRateUnits}
                   baseFeed = {this.props.baseFeed}
                   optimizedFeed = {this.props.optimizedFeed}
                   speed={feedSpeedInfo[1]} 
                   rotation={feedSpeedInfo[2]}
        />
        <SubMenu
          disabled  // TODO: figure out server-side functionality for switching machines
          title={
            <div className='item'>
              <div className={getIcon('machine')} />
              <div className='text'>
                <div className='title'>Current Machine:</div>
                <div className='value'>
                  {
                    this.props.machineList[this.props.selectedMachine] ?
                    this.props.machineList[this.props.selectedMachine].name
                    : null
                  }
                </div>
              </div>
            </div>
          }
          key='machine'
          className='info machine'  // TODO: add 'button' class when enabling machine switching
        >
          {_.map(_.values(this.props.machineList),this.renderMachineButton)}
        </SubMenu>
        <LiveBtn disabled live={this.props.live}/>
        <MenuItem disabled key='gcode' className='info gcode'>
          <div className='item'>
            <div className={getIcon('gcode')}/>
            <div className='text'>
              <div className='title'>Current GCode:</div>
              <div className='value'>{this.props.currentGcode}</div>
            </div>
          </div>
        </MenuItem>
        <Button key='changelog' id='logbutton'>
          <div className='version' id='logbutton'>v1.1.0</div>
        </Button>
      </Menu>
    );

    return (
      <div className='header'>
        {headerMenu}
        <div className='changelog' id='changes'/>
      </div>
    );
  }
}

HeaderView.propTypes = {
  cadManager: React.PropTypes.object.isRequired,
  cbPPButton: React.PropTypes.func.isRequired,
  ppbutton: React.PropTypes.string.isRequired,
  currentGcode: React.PropTypes.string.isRequired,
  live: React.PropTypes.bool.isRequired
};
