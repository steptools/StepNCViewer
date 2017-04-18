import Menu,{Item as MenuItem} from 'rc-menu';
import GeometryView from '../../geometry';

function getIcon(type, data) {
  if (!data) {
    data = '';
  }

  switch (type) {
    case 'workplan':
      return 'icon glyphicons glyphicons-cube-empty';
    case 'workplan-setup':
      return 'icon glyphicons glyphicons-cube-black';
    case 'selective':
      return 'icon glyphicons glyphicons-list-numbered';
    case 'workingstep':
      return 'icon glyphicons glyphicons-blacksmith';
    case 'tool':
      return 'icon custom tool';
    case 'workpiece':
      return 'icon custom workpiece';
    case 'diameter':
      return 'icon custom diameter';
    case 'datum':
      return 'icon custom datum ' + data;
    case 'tolerance':
      if (data) {
        return 'icon custom tolerance ' + data;
      }
      return 'icon glyphicons glyphicons-question-sign';
    case 'tolerance type':
      return 'icon glyphicons glyphicons-adjust';
    case 'tolerance value':
      return 'icon glyphicons glyphicons-adjust-alt';
    case 'tolerance upper':
      return 'icon glyphicons glyphicons-plus';
    case 'tolerance lower':
      return 'icon glyphicons glyphicons-minus';
    case 'back':
      return 'icon glyphicons glyphicons-circle-arrow-left';
    case 'exit':
      return 'icon glyphicons glyphicons-remove-sign';
    case 'active':
      return 'icon glyphicons glyphicons-ok-circle';
    case 'inactive':
      return 'icon glyphicons glyphicons-remove-circle';
    case 'disabled':
      return 'icon glyphicons glyphicons-ban-circle';
    case 'time':
      return 'icon glyphicons glyphicons-clock';
    case 'length':
    case 'distance':
      return 'icon glyphicons glyphicons-ruler';
    case 'feedrate':
      return 'icon glyphicons glyphicons-dashboard';
    case 'cornerRadius':
      return 'icon custom corner-radius';
    case 'modifiers':
      return 'icon glyphicons glyphicons-wrench';
    case 'spindlespeed':
      if (data === 'CW') {
        return 'icon glyphicons glyphicons-rotate-right';
      } else if (data === 'CCW') {
        return 'icon glyphicons glyphicons-rotate-left';
      } else {
        return 'icon glyphicons glyphicons-refresh';
      }
    case 'highlight':
      return 'highlight-button glyphicons glyphicons-eye-' + data;
    default:
      return 'icon glyphicons glyphicons-question-sign';
  }
}

function getFormattedTime(entity) {
  let time;

  if (entity.timeUnits !== 'second') {
    time = entity.baseTime + ' ' + entity.timeUnits;
    return time;
  }

  let stepTime = new Date(entity.baseTime * 1000);
  let h = stepTime.getUTCHours();
  let mm = stepTime.getUTCMinutes();
  let ss = stepTime.getUTCSeconds();

  if (h === 1) {
    time = h + ' hr ' + mm + ' min ' + ss + ' sec';
  } else if (h > 0) {
    time = h + ' hrs ' + mm + ' min ' + ss + ' sec';
  } else if (mm > 0) {
    time = mm + ' min ' + ss + ' sec';
  } else {
    time = ss + ' sec';
  }

  return time;
}

export class WorkingstepItem extends React.Component{
  constructor(props){
    super(props);
  }    
  render(){
    let classname='node';
    if(this.props.running===true) classname+=' running-node';
    return(<div key={this.props.workingstep.id}>
      <span 
        id={this.props.workingstep.id}
        className={classname}
        onClick={()=>{this.props.clickCb(this.props.workingstep)}}
      >
        <span className={getIcon('workingstep')} />
        <span className='textbox'> {this.props.workingstep.name} </span>
        <span />
      </span>

    </div>);
  }
}
WorkingstepItem.propTypes = {
  running: React.PropTypes.bool.isRequired,
  workingstep: React.PropTypes.object.isRequired,
  clickCb: React.PropTypes.func.isRequired
}
export class ToleranceItem extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    let highlightName='';
    if(this.props.highlighted){
      highlightName='open';
    }else{
      highlightName='close inactive';
    }
    return(
      <div key={this.props.tolerance.id}>
        <span id={this.props.tolerance.id} className='node' onClick = {this.props.clickCb}>
          <span className={getIcon('tolerance',this.props.tolerance.toleranceType)} />
          <span className='textbox'>{this.props.tolerance.name}</span>
          <span 
            className={getIcon('highlight',highlightName)}
            onClick={(ev)=>{
              ev.preventDefault();
             ev.stopPropagation();
             this.props.toggleHighlight(this.props.tolerance.id);
             this.props.selectEntity({key:'preview'},this.props.tolerance);
           }}
          />
        </span>
      </div>
    );
  }
}
ToleranceItem.propTypes = {
  tolerance: React.PropTypes.object.isRequired,
  highlighted: React.PropTypes.bool.isRequired,
  clickCb: React.PropTypes.func.isRequired,
  toggleHighlight:React.PropTypes.func.isRequired,
  selectEntity: React.PropTypes.func.isRequired
}

//Datum is just a tolerance with no click behavior. TODO: refactor as child class?
export class DatumItem extends React.Component{
  constructor(props){
    super(props);
  }
  render() {
    let highlightName = '';
    if (this.props.highlighted) {
      highlightName = 'open';
    } else {
      highlightName = 'close inactive';
    }
    return (
      <div key={this.props.datum.id}>
        <span id={this.props.datum.id} className='node'>
          <span className={getIcon('datum', this.props.datum.name)} />
          <span className='textbox'>{this.props.datum.name}</span>
          <span
            className={getIcon('highlight', highlightName)}
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              this.props.toggleHighlight(this.props.datum.id);
              this.props.selectEntity({ key: 'preview' }, this.props.datum);
            }}
          />
        </span>
      </div>
    );
  }
}
DatumItem.propTypes = {
  datum: React.PropTypes.object.isRequired,
  highlighted: React.PropTypes.bool.isRequired,
  toggleHighlight:React.PropTypes.func.isRequired,
  selectEntity: React.PropTypes.func.isRequired
}
export class WorkingstepList extends React.Component{

  constructor(props){
    super(props);
  }    
  render() {
    let title, steps, node;
    let nodes = [];
    let items = [];
    for (let i = 0; i < this.props.entity.workingsteps.length; i++) {
      node = this.props.workingstepcache[this.props.entity.workingsteps[i]];
      if (node.enabled === true) {
        nodes.push(node);
      }
    }
    if (nodes.length > 0) {
      title = 'Used in Workingsteps:';
      let ikey=0;
      steps = (
        <div className='list'>
          {nodes.map((val) => (
            <WorkingstepItem 
              workingstep={val} 
              running={val.id===this.props.curws}
              clickCb={this.props.clickCb}
            />
          ))}
        </div>
      );
    } else {
      title = 'Not used in any workingsteps.';
    }

    return (
      <div key='workingsteps' className='rc-menu-item-disabled property children'>
        <div className='title'>{title}</div>
        {steps}
      </div>
    );
  }
}
WorkingstepList.propTypes = {
  entity: React.PropTypes.object.isRequired,
  curws: React.PropTypes.number.isRequired,
  workingstepcache: React.PropTypes.object.isRequired,
  clickCb: React.PropTypes.func.isRequired
}

export class ToleranceList extends React.Component{
  constructor(props){
    super(props);
  }
  render() {
    let title='';
    let elements = null;
    if (this.props.entity.children && this.props.entity.children.length > 0) {
      title = 'Tolerances:';
      elements= this.props.entity.children.map((child)=> 
      (<ToleranceItem 
        tolerance={child} 
        highlighted={_.indexOf(this.props.highlightedTolerances,child.id) > -1}
        clickCb={this.props.clickCb}
        toggleHighlight={this.props.toggleHighlight} 
        selectEntity={this.props.selectEntity}
        />
      ));
    } else {
      title = 'No tolerances defined.';
    }
    return (
      <li className='rc-menu-item-disabled property children'>
        <div className='title'>{title}</div>
        {elements?(<div className='list'>{elements}</div>):null}
      </li>
    );
  }
}
ToleranceList.propTypes = {
  entity: React.PropTypes.object.isRequired,
  highlightedTolerances: React.PropTypes.object.isRequired,
  clickCb: React.PropTypes.func.isRequired,
  toggleHighlight: React.PropTypes.func.isRequired,
  selectEntity: React.PropTypes.func.isRequired
}

export class DatumList extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    let title ='No datums defined.';
    let datums = {};
    if(this.props.datums.length >0 ){
      if(this.props.datums.length>1) {
        title='Datums:';
      } else {
        title='Datum:';
      }
      datums = this.props.datums.map((datum) =>(
        <DatumItem 
          datum={datum}
          highlighted={_.indexOf(this.props.highlightedTolerances, datum.id) > -1}
          toggleHighlight={this.props.toggleHighlight}
          selectEntity={this.props.selectEntity}
        />
      ));
    }
    return (
      <li className='rc-menu-item-disabled property children'>
        <div className='title'>{title}</div>
        {(datums.length>0)?(<div className='list'>{datums}</div>):null}
      </li>
    );
  }
}
DatumList.propTypes = {
  datums: React.PropTypes.object.isRequired,
  highlightedTolerances: React.PropTypes.object.isRequired,
  toggleHighlight: React.PropTypes.func.isRequired,
  selectEntity: React.PropTypes.func.isRequired
}

export class WorkpieceList extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    return null;
  }
}

export class WorkpieceProperties extends React.Component{
  constructor(props){
    super(props);
    let entity = props.entity;
  }
  render(){
    return(
      <div>
        <WorkingstepList 
          entity={this.props.entity} 
          workingstepcache={this.props.workingstepcache}
          clickCb={this.props.clickCb}
          curws={this.props.curws}
        />
        <ToleranceList 
          entity={this.props.entity} 
          highlightedTolerances={this.props.highlightedTolerances}
          clickCb={this.props.clickCb} 
          toggleHighlight={this.props.toggleHighlight} 
          selectEntity={this.props.selectEntity}
        />
        <DatumList 
          datums={this.props.entity.datums}
          highlightedTolerances={this.props.highlightedTolerances}
          toggleHighlight={this.props.toggleHighlight} 
          selectEntity={this.props.selectEntity}
        />
      </div>
    );
  }
}
WorkpieceProperties.propTypes = {
  entity: React.PropTypes.object.isRequired,
  curws: React.PropTypes.number.isRequired,
  workingstepcache: React.PropTypes.object.isRequired,
  highlightedTolerances: React.PropTypes.object.isRequired,
  clickCb: React.PropTypes.func.isRequired,
  toggleHighlight: React.PropTypes.func.isRequired,
  selectEntity: React.PropTypes.func.isRequired
}
export class FeedrateItem extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    let feedrateData = '';
    if (this.props.feedRate>= 0) {
      feedrateData = this.props.feedRate + ' ' + this.props.feedUnits;
    } else {
      feedrateData = 'Not defined';
    }
    return(
      <li key='feedrate' className='rc-menu-item-disabled property feedrate'>
        <div className={getIcon('feedrate')}/>
        Feed rate: {feedrateData}
      </li>
    );
  }
}
FeedrateItem.propTypes = {
  feedRate: React.PropTypes.number.isRequired,
  feedUnits: React.PropTypes.string.isRequired
}

export class RunmodeItem extends React.Component{
  constructor(props){
    super(props);
  }
  render() {
    if (this.props.active === true) {
      return (
        <li key='active' className='rc-menu-item-disabled property active'>
          <div className={getIcon('active')} />
          Running
        </li>
      );
    } else if (this.props.enabled !== true) {
      return (
        <li key='active' className='rc-menu-item-disabled property active'>
          <div className={getIcon('disabled')} />
          Disabled
        </li>
      );
    } else {
      return null;
    }
  }
}
RunmodeItem.propTypes = {
  active: React.PropTypes.bool.isRequired,
  enabled: React.PropTypes.bool.isRequired
}

export class SpindleSpeedItem extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    let spindleData =this.props.speed + ' ' + this.props.speedUnits;
    spindleData = spindleData.slice(1);
    let spindleIcon = null;
    if (this.props.speed > 0) {
      spindleData += ' (CCW)';
      spindleIcon = getIcon('spindlespeed', 'CCW');
    } else if (this.props.speed < 0) {
      spindleData += ' (CW)';
      spindleIcon = getIcon('spindlespeed', 'CW');
    } else {
      spindleData = 'Not defined';
      spindleIcon = getIcon('spindlespeed');
    }
    return(
      <li key='spindlespeed' className='rc-menu-item-disabled property spindlespeed'>
        <div className={spindleIcon}/>
        Spindle speed: {spindleData}
      </li>
    );
  }
}
SpindleSpeedItem.propTypes = {
  speed: React.PropTypes.number.isRequired,
  speedUnits: React.PropTypes.string.isRequired
}

export class WorkingstepProperties extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    let entity = this.props.entity;
	let toleranceMap = (tolids)=>{
		let obj = {};
		obj.children = [];
		_.each(tolids,(tolid)=>{
			obj.children.push(this.props.toleranceCache[tolid]);//probably the object the ID points to
		});
		return obj;
	};
    return(
      <div>
        <RunmodeItem active={this.props.curws===entity.id} enabled={entity.enabled}/>
        <FeedrateItem entity={entity.feedRate} feedUnits={entity.feedUnits}/>
        <SpindleSpeedItem speed={entity.speed} speedUnits={entity.speedUnits}/>
        <ToleranceList 
          entity={toleranceMap(entity.tolerances)} 
          highlightedTolerances={this.props.highlightedTolerances}
          clickCb={this.props.clickCb}
          toggleHighlight={this.props.toggleHighlight} 
          selectEntity={this.props.selectEntity}
          />
        <DatumList 
          datums={this.props.toleranceCache[entity.toBe.id].datums}
          highlightedTolerances={this.props.highlightedTolerances}
          toggleHighlight={this.props.toggleHighlight} 
          selectEntity={this.props.selectEntity}
        />
        <WorkpieceList />
      </div>
    );
  }
}
WorkingstepProperties.propTypes = {
  entity: React.PropTypes.object.isRequired,
  curws: React.PropTypes.number.isRequired,
  toleranceCache: React.PropTypes.object.isRequired,
  highlightedTolerances: React.PropTypes.object.isRequired,
  clickCb: React.PropTypes.func.isRequired,
  toggleHighlight: React.PropTypes.func.isRequired,
  selectEntity: React.PropTypes.func.isRequired
}
export class ToolProperties extends React.Component{
  constructor(props){
    super(props);
    let entity = props.entity;
  }
  render(){
    return(
      null
    );
  }
}

export class ToleranceProperties extends React.Component {
  constructor(props){
    super(props);
    let entity = props.entity;
  }
  render(){
    return(
      <div>
        <WorkingstepList entity={this.entity} workingsteps={this.props.workingsteps} />
        <DatumList />
        <WorkpieceList />
      </div>
    );
  }
}

export default class PropertiesPane extends React.Component {
  constructor(props) {
    super(props);

    this.properties = [];
    this.titleNameWidth = 0;

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  getWPForEntity(entity) {
    if (entity) {
      if (entity.type === 'workpiece') {
        return entity.id;
      } else if (entity.type === 'tolerance') {
        return entity.workpiece;
      } else if (entity.type === 'workingstep') {
        return entity.toBe.id;
      }
    }
    return null;
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.entity) {
      this.props.previewCb(false);
      return;
    }

    let newWP = this.getWPForEntity(nextProps.entity);
    let prevWP = this.getWPForEntity(this.props.previewEntity);

    if (nextProps.entity !== this.props.entity && newWP !== prevWP) {
      this.props.previewCb(false);
    }
  }

  componentDidUpdate() {
    // calculate the width of the name in title for scrolling
    this.titleNameWidth = (function() {
      var $temp = $('.title .name').clone().contents()
        .wrap('<span id="content" style="font-weight:bold"/>').parent()
        .appendTo('body');
      var result = $temp.width();
      $temp.remove();
      return result;
    })();
  }

  handleMouseEnter() {
    if (!$('.title .name #content').length) {
      $('.title .name').contents().wrap('<div id="content">');
    }

    let content = $('.title .name #content');
    let containerWidth = $('.title .name').width();
    let textWidth = this.titleNameWidth;

    content.stop(true, false);
    if (containerWidth >= textWidth) {
      return;
    }

    let left = parseInt(content.css('left').slice(0, -2));
    var dist = textWidth - containerWidth + left;
    var time = dist * 40;
    content.animate({left: -dist}, time, 'linear');
  }

  handleMouseLeave() {
    if (!$('.title .name #content').length) {
      return;
    }

    let content = $('.title .name #content');
    content.stop(true, false);

    let left = parseInt(content.css('left').slice(0, -2));
    let time = (-left) * 40;
    content.animate({left: 0}, time, 'linear', function() {
      content.contents().unwrap();
    });
  }




  renderPreviewButton(entity) {
    if (entity.type === 'workplan' || entity.type === 'selective' ||
        entity.type === 'workplan-setup') {
      return;
    }

    this.buttons.push(
      <MenuItem
        key='preview'
        className='button'
      >
        Preview
        <span className={'icon glyphicons glyphicons-new-window-alt'}/>
      </MenuItem>
    );
  }

  renderGoto(entity) {
    if (entity.type !== 'workingstep') {
      return;
    }
    this.buttons.push(
      <MenuItem
        key='goto'
        disabled={!(entity.enabled === true && this.props.ws !== entity.id)}
        className='button'
      >
        Go to Workingstep
      </MenuItem>
    );
  }

  renderPreview(entity) {
    if (entity === null) {
      return null;
    }

    let cName = 'container';

    if (this.props.isMobile) {
      cName = cName + ' mobile';
    } else {
      cName = cName + ' desktop';
    }

    let content;

    if (this.props.preview) {
      cName = cName + ' visible';

      content = (
        <GeometryView
          key={this.getWPForEntity(this.props.previewEntity)}
          manager={this.props.manager}
          selectedEntity={this.props.entity}
          previewEntity={this.props.previewEntity}
          guiMode={this.props.guiMode}
          resize={this.props.resize}
          toleranceCache={this.props.toleranceCache}
          highlightedTolerances={this.props.highlightedTolerances}
          locked={false}
          parentSelector='#preview'
          viewType='preview'
        />
      );
    }

    return (
      <div className='preview'>
        <div className={cName} id='preview'>
          <span
            className={'preview-exit ' + getIcon('exit')}
            onClick={() => {
              this.props.previewCb(false);
            }}
          />
          {content}
        </div>
      </div>
    );
  }


  renderButtons(entity) {
    this.buttons = [];
    if (entity === null) {
      return null;
    }

    this.renderPreviewButton(entity);
    this.renderGoto(entity);

    if (this.buttons.length <= 0) {
      return null;
    }

    return (
      <Menu
        className='buttons'
        mode='horizontal'
        onClick={(event) => {
          this.props.selectEntity(event, entity);
        }}
      >
        {this.buttons}
      </Menu>
    );
  }

  getEntityData() {
    let entity = this.props.entity;
    let entityData = {
      entity: this.props.entity,
      previousEntity: this.props.previousEntities[0],
      paneName: 'properties-pane',
    };

    if (entity !== null) {
      entityData.name = entity.name;
      entityData.type = entity.type[0].toUpperCase() + entity.type.slice(1);
      if (this.props.isMobile) {
        entityData.paneName = entityData.paneName + ' mobile';
      } else {
        entityData.paneName = entityData.paneName + ' desktop';
      }
      entityData.paneName += ' visible';
      let icon;
      if (entity.type === 'tolerance') {
        icon = getIcon(entity.type, entity.toleranceType);
      } else {
        icon = getIcon(entity.type);
      }
      entityData.titleIcon = 'title-icon ' + icon;
    }

    return entityData;
  }

  render() {
    let entityData = this.getEntityData();
    let entityElement = null;
    if(entityData.entity===null) return null; //Badness.
    switch(entityData.entity.type){
      case 'workpiece':
      entityElement = (
          <WorkpieceProperties
            entity={entityData.entity}
            curws={this.props.ws}
            workingstepcache={this.props.workingsteps}
            highlightedTolerances={this.props.highlightedTolerances}
            clickCb={this.props.propertiesCb}
            toggleHighlight={this.props.toggleHighlight}
            selectEntity={this.props.selectEntity}
          />
      );
      break;
      case 'workingstep':
        entityElement = (
            <WorkingstepProperties
              entity={entityData.entity}
              curws={this.props.ws}
              toleranceCache={this.props.toleranceCache}
              highlightedTolerances={this.props.highlightedTolerances}
              clickCb={this.props.propertiesCb}
              toggleHighlight={this.props.toggleHighlight}
              selectEntity={this.props.selectEntity}
            />
      );
      break;
      case 'tool':
        entityElement = (
          <ToolProperties
          /*TODO: Fill me out!*/
          />
        ); 
      break;
      case 'tolerance':
        entityElement = (
          <ToleranceProperties

          />
        ); 
      break;
      case 'workplan-setup':
      case 'workplan':
        entityElement = (
          <WorkplanProperties
          
          />
        ); 
      break;
      default:
      return null;
    }
    return (
      <div className={entityData.paneName}>
        <div className='properties-pane-container'>
          {this.renderPreview(entityData.entity)}
          <div className='titlebar'>
            <span
              className={'title-back ' + getIcon('back')}
              onClick={() => {
                this.props.propertiesCb(entityData.previousEntity, true);
              }}
            />
            <span className={entityData.titleIcon} />
            <span
              className='title'
              onMouseEnter={this.handleMouseEnter}
              onMouseLeave={this.handleMouseLeave}
            >
              <div className='type'>{entityData.type}</div>
              <div className='name'>{entityData.name}</div>
            </span>
            <span
              className={'title-exit ' + getIcon('exit')}
              onClick={() => {
                this.props.propertiesCb(null);
                this.props.previewCb(false);
              }}
            />
          </div>
          <Menu className='properties' onClick={(event) => { this.props.selectEntity(event, entity); }}>
            {entityElement}
          </Menu>
          <div className='button-dock'>
            {this.renderButtons(entityData.entity)}
          </div>
        </div>
      </div>
    );
  }
}
