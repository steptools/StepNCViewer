import React from 'react';
import Menu,{Item as MenuItem} from 'rc-menu';
import GeometryView from '../../geometry';
import request from 'superagent';

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
    case 'spindlespeed':
      if (data === 'CW') {
        return 'icon glyphicons glyphicons-rotate-right';
      } else if (data === 'CCW') {
        return 'icon glyphicons glyphicons-rotate-left';
      } else {
        return 'icon glyphicons glyphicons-refresh';
      }
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

export default class PropertiesPane extends React.Component {
  constructor(props) {
    super(props);

    this.state = {previewEntity: null};

    this.properties = [];
    this.titleNameWidth = 0;

    this.selectEntity = this.selectEntity.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.renderWorkingsteps = this.renderWorkingsteps.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  selectEntity(event, entity) {
    if (event.key === 'goto') {
      let url = '/v3/nc/state/ws/' + entity.id;
      request.get(url).end();
    } else if (event.key === 'tool') {
      // open properties page for associated tool
      this.props.propertiesCb(this.props.tools[entity.tool]);
    } else if (event.key === 'preview') {

      this.setState({'previewEntity': entity});
      this.props.previewCb(true);
      let prevId;
      if (entity.type === 'workingstep') {
        prevId = entity.toBe.id;
      } else if (entity.type === 'tolerance') {
        prevId = entity.workpiece;
      } else if (entity.type === 'tool') {
        prevId = entity.id + '/tool';
      } else {
        prevId = entity.id;
      }

      let url = this.props.manager.app.services.apiEndpoint
        + this.props.manager.app.services.version + '/nc';
      this.props.manager.dispatchEvent({
        type: 'setModel',
        viewType: 'preview',
        path: prevId,
        baseURL: url,
        modelType: 'previewShell',
      });
    }
    // some other menu item clicked, no need to do anything
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
    let prevWP = this.getWPForEntity(this.state.previewEntity);

    if (nextProps.entity !== this.props.entity && newWP !== prevWP) {
      this.props.previewCb(false);
    } else if (nextProps.entity !== this.props.entity && newWP === prevWP) {
      this.setState({'previewEntity': nextProps.entity});
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

  renderActive(entity) {
    if (entity.type !== 'workingstep') {
      return;
    }
    let active = (this.props.ws === entity.id);

    if (active === true) {
      this.properties.push(
        <MenuItem disabled key='active' className='property active'>
          <div className={getIcon('active')}/>
          Running
        </MenuItem>
      );
    } else if (entity.enabled !== true && entity.type === 'workingstep') {
      this.properties.push(
        <MenuItem disabled key='active' className='property active'>
          <div className={getIcon('disabled')}/>
          Disabled
        </MenuItem>
      );
    }
  }

  renderTime(entity) {
    if (!entity.baseTime) {
      return;
    }
    this.properties.push(
      <MenuItem disabled key='time' className='property time'>
        <div className={getIcon('time')}/>
        Base time: {getFormattedTime(entity)}
      </MenuItem>
    );
  }

  renderDistance(entity) {
    if (!entity.distance) {
      return;
    }
    this.properties.push(
      <MenuItem disabled key='distance' className='property distance'>
        <div className={getIcon('distance')}/>
        Distance: {entity.distance.toFixed(2) + ' ' + entity.distanceUnits}
      </MenuItem>
    );
  }

  renderWorkingstep(entity) {
    if (entity.type !== 'workingstep') {
      return;
    }

    let feedrateData = '';
    if (entity.feedRate !== 0) {
      feedrateData = entity.feedRate + ' ' + entity.feedUnits;
    } else {
      feedrateData = 'Not defined';
    }
    this.properties.push(
      <MenuItem disabled key='feedrate' className='property feedrate'>
        <div className={getIcon('feedrate')}/>
        Feed rate: {feedrateData}
      </MenuItem>
    );

    let spindleData = entity.speed + ' ' + entity.speedUnits;
    spindleData = spindleData.slice(1);
    let spindleIcon = null;
    if (entity.speed > 0) {
      spindleData += ' (CCW)';
      spindleIcon = getIcon('spindlespeed', 'CCW');
    } else if (entity.speed < 0) {
      spindleData += ' (CW)';
      spindleIcon = getIcon('spindlespeed', 'CW');
    } else {
      spindleData = 'Not defined';
      spindleIcon = getIcon('spindlespeed');
    }
    this.properties.push(
      <MenuItem disabled key='spindlespeed' className='property spindlespeed'>
        <div className={spindleIcon}/>
        Spindle speed: {spindleData}
      </MenuItem>
    );

    if (this.props.tools[entity.tool]) {
      this.properties.push(
        <MenuItem key='tool' className='property tool'>
            <div className={getIcon('tool')}/>
            Tool: {this.props.tools[entity.tool].name}
        </MenuItem>
      );
    }
  }

  renderPreviewButton(entity) {
    if (entity.type === 'workplan' || entity.type === 'selective' ||
        entity.type === 'workplan-setup' || entity.type === 'workingstep') {
      return;
    }

    let cName = 'preview-button preview-icon';
    cName += ' glyphicons glyphicons-new-window-alt';
    this.buttons.push(
      <MenuItem
        key='preview'
        className='button'
      >
        Preview
        <span
          className={cName}
        />
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

  renderTolerance(entity) {
    if (entity.type !== 'tolerance') {
      return;
    }
    this.properties.push(
      <MenuItem disabled key='tolType' className='property tolType'>
        <div className={getIcon('tolerance', entity.toleranceType)}/>
        Type: {entity.tolTypeName}
      </MenuItem>
    );
    this.properties.push(
      <MenuItem disabled key='tolValue' className='property tolValue'>
        <div className={getIcon('tolerance value')}/>
        Value: {entity.value}{entity.unit}
      </MenuItem>
    );

    if (!entity.range || entity.range.flag === false) {
      return;
    }
    let upper = entity.range.upper;
    let lower = entity.range.lower;
    if (Math.abs(upper) === Math.abs(lower)) {
      console.log(entity.id);
      this.properties.push(
        <MenuItem disabled key='tolRange' className='property tolRange'>
          <div className='icon custom letter'>&plusmn;</div>
          Range: &plusmn; {Math.abs(upper)}{entity.unit}
        </MenuItem>
      );
      return;
    }
    this.properties.push(
      <MenuItem disabled key='tolUpper' className='property tolUpper'>
        <div className={getIcon('tolerance upper')}/>
        Upper: {upper}{entity.unit}
      </MenuItem>
    );
    this.properties.push(
      <MenuItem disabled key='tolLower' className='property tolLower'>
        <div className={getIcon('tolerance lower')}/>
        Lower: {lower}{entity.unit}
      </MenuItem>
    );
  }

  renderNode(node) {
    let cName = 'node';
    if (node.id === this.props.ws) {
      cName = 'node running-node';
    } else {
      if (node.enabled === false) {
        cName = 'node disabled';
      }
    }

    let icon = <span className={getIcon(node.type)}/>;
    if (node.type === 'tolerance') {
      icon = <span className={getIcon(node.type, node.toleranceType)}/>;
    }

    let highlightButton, highlightName;

    if (this.props.highlightedTolerances.indexOf(node.id) >= 0) {
      highlightName = 'open';
    } else {
      highlightName = 'close inactive';
    }


    if (node.type === 'tolerance') {
      let cName = 'highlight-button glyphicons glyphicons-eye-' + highlightName;
      highlightButton = (
        <span
          className={cName}
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.props.toggleHighlight(node.id);
            this.selectEntity(
              {key: 'preview'},
              this.props.toleranceCache[node.workpiece]
            );
          }}
        />);
    } else if (node.type === 'workpiece') {
      highlightButton = (
        <span
          key='preview'
          className='preview-icon glyphicons glyphicons-new-window-alt'
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            this.selectEntity({key: 'preview'}, node);
          }}
        />);
    }

    return (
      <div key={node.id}>
        <span
          id={node.id}
          className={cName}
          onClick={() => {
            this.props.propertiesCb(node);
          }}
        >
          {icon}
          <span className='textbox'>
            {node.name}
          </span>
          {highlightButton}
        </span>
      </div>
    );
  }

  renderWorkingsteps(entity) {
    if (entity.type !== 'workpiece' && entity.type !== 'tool' &&
        entity.type !== 'tolerance') {
      return null;
    }
    let title, steps;
    if (entity.workingsteps.length > 0) {
      title = 'Used in Workingsteps:';
      steps = (<div className='list'>
        {entity.workingsteps.map((step) =>
          this.renderNode(this.props.workingsteps[step])
        )}
      </div>);
    } else {
      title = 'Not used in any workingsteps.';
    }

    title = (<div className='title'>{title}</div>);

    this.properties.push (
      <MenuItem disabled key='workingsteps' className='property children'>
        {title}
        {steps}
      </MenuItem>
    );
  }

  renderWorkpieces(entity) {
    if (entity.type !== 'workingstep') {
      return null;
    }

    let asIs, toBe, delta;

    if (entity.asIs &&
        entity.asIs.id !== 0 &&
        this.props.toleranceCache[entity.asIs.id]) {
      asIs = this.renderNode(this.props.toleranceCache[entity.asIs.id]);
      if (asIs) {
        asIs = (
          <div>
            As-Is{entity.asIs.inherited ? ' (Inherited)' : null}: {asIs}
          </div>
        );
      }
    }
    if (entity.toBe &&
        entity.toBe.id !== 0 &&
        this.props.toleranceCache[entity.asIs.id]) {
      toBe = this.renderNode(this.props.toleranceCache[entity.toBe.id]);
      if (toBe) {
        toBe = (
          <div>
            To-Be{entity.toBe.inherited ? ' (Inherited)' : null}: {toBe}
          </div>
        );
      }
    }
    if (entity.delta &&
        entity.delta.id !== 0 &&
        this.props.toleranceCache[entity.delta.id]) {
      delta = this.renderNode(this.props.toleranceCache[entity.delta.id]);
      if (delta) {
        delta = (
          <div>
            Delta{entity.delta.inherited ? ' (Inherited)' : null}: {delta}
          </div>
        );
      }
    }

    let title = (<div className='title'>Workpieces:</div>);

    this.properties.push(
      <MenuItem disabled key='workpieces' className='property children'>
        {title}
        <div className='list'>
          {asIs}
          {toBe}
          {delta}
        </div>
      </MenuItem>
    );
  }

  renderChildren(entity) {
    if (entity.type === 'workingstep' || entity.type === 'tool' ||
        entity.type === 'tolerance') {
      return null;
    }
    let children = entity.children; // this.normalizeChildren(entity);
    let childrenTitle;
    if (entity.type === 'workpiece') {
      if (children && children.length > 0) {
        childrenTitle = 'Tolerances:';
      } else {
        childrenTitle = 'No tolerances defined.';
      }
    } else if (children) {
      childrenTitle = 'Children:';
    } else {
      childrenTitle = 'No Children';
    }

    childrenTitle = (<div className='title'>{childrenTitle}</div>);
    if (children) {
      children = (
        <div className='list'>
          {children.map(this.renderNode)}
        </div>
      );
    }

    this.properties.push(
      <MenuItem disabled key='children' className='property children'>
        {childrenTitle}
        {children}
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
          key={this.getWPForEntity(this.state.previewEntity)}
          manager={this.props.manager}
          selectedEntity={this.state.previewEntity}
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

  renderTools(entity) {
    if (entity.type !== 'tool') {
      return null;
    }
    if (entity.cornerRadius.toFixed(0) !== '0') {
      let crData = 'Corner Radius: ';
      crData += entity.cornerRadius.toFixed(2) + ' ';
      crData += entity.cornerRadiusUnit;
      this.properties.push (
        <MenuItem disabled key='tRadius' className='property children'>
          <div className={getIcon('cornerRadius')}/>
          {crData}
        </MenuItem>
      );
    }

    if (entity.diameter) {
      this.properties.push (
        <MenuItem disabled key='tDiameter' className='property children'>
          <div className={getIcon('diameter')}/>
          Diameter: {entity.diameter}{entity.diameterUnit}
        </MenuItem>
      );
    }

    if (entity.length) {
      this.properties.push (
        <MenuItem disabled key='tLength' className='property children'>
          <div className={getIcon('length')}/>
          Tool Length: {entity.length} {entity.lengthUnit}
        </MenuItem>
      );
    }
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
          this.selectEntity(event, entity);
        }}
      >
        {this.buttons}
      </Menu>
    );
  }

  renderProperties(entity) {
    this.properties = [];
    if (entity === null) {
      return null;
    }

    this.renderActive(entity);
    this.renderTime(entity);
    this.renderDistance(entity);
    this.renderWorkingstep(entity);
    this.renderWorkpieces(entity);
    this.renderTools(entity);
    this.renderTolerance(entity);
    this.renderWorkingsteps(entity);
    this.renderChildren(entity);

    return (
      <Menu
        className='properties'
        onClick={(event) => {
          this.selectEntity(event, entity);
        }}
      >
        {this.properties}
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
          {this.renderProperties(entityData.entity)}
          <div className='button-dock'>
            {this.renderButtons(entityData.entity)}
          </div>
        </div>
      </div>
    );
  }
}
