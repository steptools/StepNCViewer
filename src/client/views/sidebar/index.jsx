import React from 'react';
import Tree from 'react-ui-tree';
import Menu from 'rc-menu';
import LoadProjectView from './loadproject';
import ToleranceTreeView from './tolerancetree';
import WorkingstepList from './workingstepslist';
import ReactTooltip from 'react-tooltip';
var MenuItem = Menu.Item;
var scrolled=false;

export default class SidebarView extends React.Component {
    constructor(props) {
        super(props);
        this.state = { };

        this.openObjectTree = this.openObjectTree.bind(this);
        this.openLoadProjectMenu = this.openLoadProjectMenu.bind(this);
        this.onProjectSelected = this.onProjectSelected.bind(this);
        this.openToleranceTree = this.openToleranceTree.bind(this);

        var disabledView = (name) => {
          return (() => {
            this.props.cbMode("disabled");
            this.props.cbAltMenu(name);
          }).bind(this);
        };

        var self = this;
        var updateWorkingstep = (state) => {
            self.props.cbWS(state);
            return;
        };

        this.props.actionManager.on('open-load-project-menu',  this.openLoadProjectMenu);
        this.props.actionManager.on('open-new-project-menu', disabledView('New Project'));
        this.props.actionManager.on('open-save-project-menu', disabledView('Save Project'));
        this.props.actionManager.on('open-tolerance-tree', this.openToleranceTree);
        this.props.actionManager.on('project-selected', this.onProjectSelected);
        this.props.actionManager.on('change-workingstep', updateWorkingstep);
    }

    componentDidMount(){
    }

    openLoadProjectMenu(){
        this.props.cbMode('load-project');
        this.props.cbAltMenu('Load Project');
    }

    openObjectTree(){
        this.props.cbMode('tree');
    }

    openToleranceTree(){
        this.props.cbMode('tolerance-tree');
      this.props.cbAltMenu('Tolerance Tree');
    }

    onProjectSelected(projectId){
      this.props.socket.emit('req:modeltree', projectId);
      this.openObjectTree();
      this.props.cbTree({
          name : 'Loading project...',
          isLeaf:true
      });
    }

    render() {
      // TODO currently mode menu can only have two layers
      var nested = this.props.mode != "tree";
      const modeMenu = (
        <div className='sidebar-menu-tabs'>
          <span style={{opacity:nested ?.5:0}} className='glyphicons glyphicons-menu-left back-button'></span>
          <div style={{opacity:nested?.5:1, left:nested?40:140}} onClick={this.openObjectTree} className='back'>
            <div>Workingsteps</div>
          </div>
          <div style={{left:nested?200:400}} className='current'>
            {this.props.altmenu}
          </div>
        </div>
      );
      if((!scrolled) && (this.props.ws > -1))
      {
        $('.m-tree').animate({
        scrollTop: $("#"+this.props.ws).offset().top-$(".m-tree").offset().top
        }, 1000);
        scrolled=true;
      }
        return <div className="sidebar">
                  {modeMenu}
                  {this.props.mode == 'tree' ?
                  <WorkingstepList pid = {this.props.pid} cbMode = {this.props.cbMode} cbTree = {this.props.cbTree} ws = {this.props.ws}/>
                  : null}
                  {this.props.mode == 'load-project' ?
                  <LoadProjectView socket={this.props.socket} app={this.props.app} actionManager={this.props.actionManager}/>
                  : null}
                  {this.props.mode == 'tolerance-tree' ?
                  <ToleranceTreeView socket={this.props.socket} app={this.props.app} actionManager={this.props.actionManager}/>
                  : null}
                  {this.props.mode == "disabled" ?
                  <div className='disabled-view'> {this.props.altmenu} is currently disabled.</div>
                  : null}
               </div>;
    }
}
