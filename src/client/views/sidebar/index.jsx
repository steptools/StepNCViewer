import Menu, {Item as MenuItem} from 'rc-menu';
import WorkingstepList from './workingstepslist';
import WorkplanList from './workplanlist';
import ToolList from './toollist';
import ToleranceList from './tolerancelist';
import PropertiesPane from './propertiespane';
import cadManager from '../../models/cad_manager';

var scrolled = false;

export default class SidebarView extends React.Component {
  constructor(props) {
    super(props);

    this.selectMenuItem = this.selectMenuItem.bind(this);
  }

  selectMenuItem(info) {
    this.props.cbMode(info.key);
    scrolled = false;
  }

  componentDidUpdate() {
    let shouldUpdate = !scrolled;
    shouldUpdate = shouldUpdate && this.props.ws > -1;
    shouldUpdate = shouldUpdate && this.props.mode !== 'tolerance';
    shouldUpdate = shouldUpdate && !this.props.isMobile;
    if (!shouldUpdate) {
      return;
    }

    let tree = $('.m-tree,.treebeard');
    let node = $('.running-node');
    if (node.length <= 0) {
      return;
    }

    let tOffset = tree.offset().top + tree.outerHeight();
    let nOffset = node.offset().top + node.outerHeight();
    let scroll = nOffset - tOffset;
    if (scroll > 0) {
      if (scroll >= node.outerHeight()) {
        scroll += tree.outerHeight() / 2;
        scroll -= node.outerHeight() / 2;
      }
      tree.animate({scrollTop: scroll}, 1000);
      scrolled = true;
    }
  }

  render() {
    let properties = <PropertiesPane
      app={this.props.app}
      entity={this.props.selectedEntity}
      previousEntities={this.props.previouslySelectedEntities}
      pid={this.props.pid}
      ws={this.props.ws}
      propertiesCb={this.props.openProperties}
      tools={this.props.toolCache}
      workingsteps={this.props.workingstepCache}
      resize={this.props.resize}
      toleranceCache={this.props.toleranceCache}
      guiMode={this.props.guiMode}
      manager={this.props.cadManager}
      preview={this.props.preview}
      previewCb={this.props.openPreview}
      toggleHighlight={this.props.toggleHighlight}
      highlightedTolerances={this.props.highlightedTolerances}
      isMobile={this.props.isMobile}
      selectEntity={this.props.selectEntity}
      previewEntity={this.props.previewEntity}
      previewEntityCb={this.props.previewEntityCb}
    />;

    const tabs = (
      <Menu
        onSelect={this.selectMenuItem}
        defaultSelectedKeys={[this.props.mode]}
        mode='horizontal'
        className='sidebar-menu-tabs'
      >
        <MenuItem
          key='ws'
          id='sidebar-menu-ws'
          className='ws'
        >
          Workingsteps
        </MenuItem>
        <MenuItem
          key='wp'
          id='sidebar-menu-wp'
          className='wp'
        >
          Workplan
        </MenuItem>
        <MenuItem
          key='tools'
          id='sidebar-menu-tools'
          className='tool'
        >
          Tools
        </MenuItem>
        <MenuItem
          key='tolerance'
          id='sidebar-menu-tolerance'
          className='tolerance'
        >
          Tolerances
        </MenuItem>
      </Menu>
    );

    let currentView = null;
    if (this.props.mode === 'ws') {
      currentView = (
        <WorkingstepList
          cbMode={this.props.cbMode}
          cbTree={this.props.cbTree}
          ws={this.props.ws}
          workingstepCache={this.props.workingstepCache}
          workingstepList={this.props.workingstepList}
          isMobile={this.props.isMobile}
        />
      );
    } else if (this.props.mode === 'wp') {
      currentView = (
        <WorkplanList
          cbMode={this.props.cbMode}
          cbTree={this.props.cbTree}
          ws={this.props.ws}
          workplanCache={this.props.workplanCache}
          propertyCb={this.props.openProperties}
          isMobile={this.props.isMobile}
        />
      );
    } else if (this.props.mode === 'tolerance') {
      currentView = (
        <ToleranceList
          curWS={this.props.workingstepCache[this.props.ws]}
          cbMode={this.props.cbMode}
          cbTree={this.props.cbTree}
          propertyCb={this.props.openProperties}
          workingstepCache={this.props.workingstepCache}
          workingstepList={this.props.workingstepList}
          toleranceCache={this.props.toleranceCache}
          toleranceList={this.props.toleranceList}
          highlightedTolerances={this.props.highlightedTolerances}
          toggleHighlight={this.props.toggleHighlight}
          isMobile={this.props.isMobile}
          ws={this.props.ws}
          selectEntity={this.props.selectEntity}
          openPreview={this.props.openPreview}
        />
      );
    } else if (this.props.mode === 'tools') {
      currentView = (
        <ToolList
          cbMode={this.props.cbMode}
          cbTree={this.props.cbTree}
          ws={this.props.ws}
          propertyCb={this.props.openProperties}
          toolCb= {(toolList) => {
            this.setState({tools: toolList});
          }}
          tools={this.props.toolCache}
          curtool={this.props.curtool}
          isMobile={this.props.isMobile}
        />
      );
    }

    let SVWidth;
    let cName = 'sidebar';
    if (this.props.isMobile) {
      SVWidth = {'width': '100%'};
    } else {
      cName += ' notouch';
    }

    return (
      <div className={cName} style={SVWidth}>
        {properties}
        {tabs}
        {currentView}
      </div>
    );}
}

let rp = React.PropTypes;
SidebarView.propTypes = {
  cadManager: rp.instanceOf(cadManager).isRequired,
  mode: rp.string.isRequired,
  ws: rp.oneOfType([rp.string, rp.number]).isRequired,
  cbMode: rp.func.isRequired,
  cbTree: rp.func.isRequired,
  cbWS: rp.func.isRequired,
  cbAltMenu: rp.func.isRequired,
};
