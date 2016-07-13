import React from 'react';
import Menu, {Item as MenuItem} from 'rc-menu';
import WorkingstepList from './workingstepslist';
import WorkplanList from './workplanlist';
import ToolList from './toollist';
import ToleranceList from './tolerancelist';
import PropertiesPane from './propertiespane';
import ReactTooltip from 'react-tooltip';
import cadManager from '../../models/cad_manager';

export default class SidebarView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            scrolled: false
        };

        let disabledView = (name) => {
            return (() => {
                this.props.cbMode("disabled");
                this.props.cbAltMenu(name);
            }).bind(this);
        };

        let self = this;
        let updateWorkingstep = (state) => {
            self.props.cbWS(state);
            return;
        };

        this.selectMenuItem = this.selectMenuItem.bind(this);

        this.props.actionManager.on('change-workingstep', updateWorkingstep);
    }

    componentDidUpdate() {
        if ((!this.state.scrolled) && (this.props.mode !== 'tolerance') && (this.props.ws > -1)) {
            let currElem = $('.running-node');
            if (currElem.length > 0) {
                let tree = $('.m-tree,.treebeard');
                let tOffset = tree.offset().top + tree.innerHeight();
                let cOffset = currElem.offset().top + currElem.outerHeight();
                if (tOffset < cOffset) {
                    tree.animate({scrollTop: (cOffset - tOffset)}, 1000);
                }
                this.setState({'scrolled': true}); 
            }
        }
    }

    selectMenuItem(info) {
        this.props.cbMode(info.key);
        this.setState({'scrolled': false});
    }

    render() {
        // TODO currently mode menu can only have two layers
        let nested = this.props.mode != "tree";
        
        let properties = <PropertiesPane entity={this.props.selectedEntity} pid={this.props.pid} ws={this.props.ws} propertiesCb={this.props.openProperties} tools={this.props.toolCache}/>;

        const modeMenu = (
            <Menu onSelect={this.selectMenuItem} defaultSelectedKeys={[this.props.mode]} mode='horizontal' className='sidebar-menu-tabs'>
                <MenuItem key='ws' id='sidebar-menu-ws' className='ws'>Workingsteps</MenuItem>
                <MenuItem key='tree' id='sidebar-menu-tree' className='wp'>Workplan</MenuItem>
                <MenuItem key='tools' id='sidebar-menu-tools' className='tool'>Tools</MenuItem>
                <MenuItem key='tolerance' id='sidebar-menu-tolerance' className='tolerance'>Tolerances</MenuItem>
            </Menu>
        );

        return <div className="sidebar">
            {properties}
            {modeMenu}
            {this.props.mode == 'ws'
                ? <WorkingstepList cbMode={this.props.cbMode} cbTree={this.props.cbTree} ws={this.props.ws} workingstepCache={this.props.workingstepCache} workingstepList={this.props.workingstepList} propertyCb={this.props.openProperties}/>
                : null}
            {this.props.mode == 'tree'
                ? <WorkplanList cbMode={this.props.cbMode} cbTree={this.props.cbTree} ws={this.props.ws} workplanCache={this.props.workplanCache} propertyCb={this.props.openProperties}/>
                : null}
            {this.props.mode == 'tolerance'
                ? <ToleranceList cbMode={this.props.cbMode} cbTree={this.props.cbTree} propertyCb={this.props.openProperties} toleranceCache={this.props.toleranceCache}/>
                : null}
            {this.props.mode == 'tools'
                ? <ToolList cbMode={this.props.cbMode} cbTree={this.props.cbTree} ws={this.props.ws} propertyCb={this.props.openProperties} toolCb= {(toolList) => {this.setState({tools: toolList});}} tools={this.props.toolCache} curtool={this.props.curtool}/>
                : null}
        </div>;
    }
}

SidebarView.propTypes = {
    cadManager: React.PropTypes.instanceOf(cadManager).isRequired,
    mode: React.PropTypes.string.isRequired,
    ws: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]).isRequired,
    cbMode: React.PropTypes.func.isRequired,
    cbTree: React.PropTypes.func.isRequired,
    cbWS: React.PropTypes.func.isRequired,
    cbAltMenu: React.PropTypes.func.isRequired
};
