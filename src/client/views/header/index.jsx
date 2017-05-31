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
    case 'geometry':
      return 'icon glyphicons glyphicons-cube-empty';
    case 'download':
      return 'icon glyphicons glyphicons-cloud-download';
    case 'reset':
      return 'icon glyphicons glyphicons-recycle';
    case 'view':
      return 'icon glyphicons glyphicons-eye-open';
    case 'noview':
      return 'icon glyphicons glyphicons-eye-close';
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
    return (
      <MenuItem {...this.props} className='button'>
        <div className={icon}/>
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
class Slider extends React.Component {  constructor(props) {
    super(props);
    this.changed = this.changed.bind(this);
  }

  changed(info) {
    this.props.changed(info);
  }

  render() {
    let name = this.props.id.charAt(0).toUpperCase() + this.props.id.slice(1);
    let cName = 'slider no-icons';
    let left = null;
    let right = null;
    if (this.props.icons) {
      cName = 'slider with-icons';
      left = (
        <div
          className={getIcon(this.props.id, 'left')}
          onMouseUp={this.changed}
          onKeyUp={this.changed}
          value='0'
        />
      );
      right = (
        <div
          className={getIcon(this.props.id, 'right')}
          onMouseUp={this.changed}
          onKeyUp={this.changed}
          value='200'
        />
      );
    }
    // TODO:Remove onMouseUp / onKeyUp if/when bug is fixed with onChange
    return (
      <MenuItem {...this.props} key={this.props.id} className={cName}>
        <input
          className={'range-' + this.props.id}
          onChange={this.changed}
          onMouseUp={this.changed}
          onKeyUp={this.changed}
          value={this.props.val}
          type='range'
          min='0'
          max='200'
          step='1'
        />
        <div className='sliderData'>
          {left}
          <div className={'slider-text text-' + this.props.id}>{name}</div>
          {right}
        </div>
      </MenuItem>
    );
  }
}

Slider.propTypes = {
  changed: React.PropTypes.func.isRequired,
  id: React.PropTypes.string.isRequired,
  val: React.PropTypes.number.isRequired,
  icons: React.PropTypes.string.isRequired,
};

class FeedSpeed extends React.Component {
  constructor(props){
    super(props);
  }
  render(){return (        <MenuItem {...this.props} key='feed-speed' className='info feed-speed'>
          <div className='item'>
            <div className={getIcon('feedrate')}/>
            <div className='text'>
              <div className='title'>Feed rate:</div>
              <div className='value'>{this.props.feed}</div>
            </div>
          </div>
          <div className='item'>
            <div className={this.props.rotation}/>
            <div className='text'>
              <div className='title'>Spindle speed:</div>
              <div className='value'>{this.props.speed}</div>
            </div>
          </div>
        </MenuItem>)}
}
FeedSpeed.propTypes = {
  feed: React.PropTypes.number.isRequired,
  speed: React.PropTypes.number.isRequired,
  rotation: React.PropTypes.string.isRequired
}
class ProbeMessage extends React.Component {
  constructor(props){
    super(props);
  }
  render(){
    if (this.props.msg.length<3) {
      return null; //Empty object
    }
    return (
      <MenuItem {...this.props} key='probe-message' className='info probe'>
      <div className='item'>
        <div className='text'>
        Probe Results-
          X:{this.props.msg[0].toFixed(3)+' '}
          Y:{this.props.msg[1].toFixed(3)+' '}
          Z:{this.props.msg[2].toFixed(3)+' '}
      </div>
      </div>
      </MenuItem>);
  }
}
ProbeMessage.propTypes = {
  msg: React.PropTypes.arrayOf(React.PropTypes.number).isRequired
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
  request.get('/v3/nc/geometry/delta/reset').end();
}
export default class HeaderView extends React.Component {
  constructor(props) {
    super(props);

    this.simulateMenuItemClicked = this.simulateMenuItemClicked.bind(this);
    this.updateSpeed = this.updateSpeed.bind(this);
    this.getFeedSpeedInfo = this.getFeedSpeedInfo.bind(this);
    this.updateSpindleSpeed = this.updateSpindleSpeed.bind(this);
    this.updateFeedrate = this.updateFeedrate.bind(this);
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

  getFeedSpeedInfo() {
    let fr = 'Not defined';
    let ss = 'Not defined';
    let ssIcon = null;
    if (this.props.feedRate !== undefined) {
      fr = this.props.feedRate.toFixed(1) + ' ' + 'mm/min';
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

  updateSpindleSpeed(info) {
    this.props.spindleUpdateCb(info.speed);
  }

  updateFeedrate(info) {
    this.props.feedUpdateCb(info.feed);
  }

  simulateMenuItemClicked(info) {
    switch (info.key) {
      case 'forward':
        this.props.actionManager.emit('sim-f');
        break;
      case 'play':
        this.props.actionManager.emit('sim-pp');
        if (this.props.ppbutton === 'play') {
          this.props.cbPPButton('pause');
        } else {
          this.props.cbPPButton('play');
        }
        break;
      case 'backward':
        this.props.actionManager.emit('sim-b');
        break;
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
    let ppbtntxt = '';
    let ppbutton = this.props.ppbutton;
    if (this.props.ppbutton === 'play') {
      ppbtntxt = 'Play';
    } else {
      ppbtntxt = 'Pause';
    }

    let feedSpeedInfo = this.getFeedSpeedInfo();
    let probeMsg=[];
    if (this.props.probeMsg){
       probeMsg = this.props.probeMsg;
     }
    const headerMenu = (
      <Menu
        mode='horizontal'
        onClick={this.simulateMenuItemClicked}
        className='header-menu'
      >
        <Button key='backward'>Prev</Button>
        <Button key='play' icon={ppbutton}>{ppbtntxt}</Button>
        <Button key='forward'>Next</Button>
        <Slider
          id='speed'
          changed={this.updateSpeed}
          val={this.props.speed}
          icons='true'
        />
	<GeomMenu actionManager = {this.props.actionManager}/>
        <FeedSpeed disabled feed={feedSpeedInfo[0]} speed={feedSpeedInfo[1]} rotation={feedSpeedInfo[2]} />
        <ProbeMessage msg={probeMsg}/>
        <MenuItem className="info"> File: {this.props.fname}</MenuItem>
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
  fname: React.PropTypes.string.isRequired
};
