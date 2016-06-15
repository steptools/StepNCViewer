import React from 'react';
import Menu from 'rc-menu';
import _ from 'lodash';
var SubMenu = Menu.SubMenu;
var PlainMenuItem = Menu.Item;
import ReactTooltip from 'react-tooltip';

class MenuItem extends React.Component{
  render(){
    if (this.props.tooltip){
      var id = _.uniqueId("tooltip_");
      return (
        <PlainMenuItem {...this.props}>
          <span data-tip data-for={id}>
            {this.props.children}
          </span>
          <ReactTooltip
            id={id}
            place="top" type="dark" effect="float"
            delayShow={this.props.delayShow}>
              {this.props.tooltip}
        </ReactTooltip>
        </PlainMenuItem>
      );
    }else{
      return (
        <PlainMenuItem {...this.props}> {this.props.children} </PlainMenuItem>
      );
    }
  }
}

class ButtonImage extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    var classes = 'button-icon glyphicon glyphicon-' + this.props.icon;
    return (<div>
      <div className={classes}/>
    </div>);
  }
}

export default class HeaderView extends React.Component {
    constructor(props) {
        super(props);

        this.openBottomMenu = this.openBottomMenu.bind(this);
        this.debugMenuItemClicked = this.debugMenuItemClicked.bind(this);
        this.fileMenuItemClicked = this.fileMenuItemClicked.bind(this);
        this.simulateMenuItemClicked = this.simulateMenuItemClicked.bind(this);
        this.viewMenuItemClicked = this.viewMenuItemClicked.bind(this);
    }

    openBottomMenu(info){
        this.props.cb(info.key);
    }

    debugMenuItemClicked(info){
      if (info.key == "db1"){
        this.props.socket.emit('req:modeltree', "moldy");
      }else if (info.key == "db2"){
        this.props.socket.emit('req:projects');
      }
    }

    fileMenuItemClicked(info){
      switch (info.key){
        case "new":
        this.props.actionManager.emit("open-new-project-menu");
        break;
        case "save":
        this.props.actionManager.emit("open-save-project-menu");
        break;
        case "load":
        this.props.actionManager.emit("open-load-project-menu");
        break;
      }
    }

    simulateMenuItemClicked(info){
      switch (info.key){
        case "forward":
        this.props.actionManager.emit("sim-f");
        break;
        case "play":
        this.props.actionManager.emit("sim-pp");
        if (this.props.ppbutton == "play"){
          this.setState({"ppbutton":"pause"});
        }
        else{
          this.setState({"ppbutton":"play"});
        }

        break;
        case "backward":
        this.props.actionManager.emit("sim-b");
        break;
        case "remote-session":
        this.props.ActionManager.emit("simulate-remote-session");
        break;
      }
    }

    viewMenuItemClicked(info){
      switch (info.key){
        case "toleranceTree":
        this.props.actionManager.emit("open-tolerance-tree");
        break;
      }
    }

    render() {
        if(this.props.guiMode == 1)
            return null;
        var ppbtntxt;
        var ppbutton = this.props.ppbutton;
        if(this.props.ppbutton === "play"){
            ppbtntxt = "Play";
        }
        else{
            ppbtntxt = "Pause";
        }
        const topMenu = ( <Menu mode='horizontal' onClick={this.openBottomMenu} className='top-menu'>
            <MenuItem key='file-menu'>File</MenuItem>
            <MenuItem key='simulate-menu'>Simulate</MenuItem>
        </Menu> );
        const bottomMenu = ( <div className='bottom-menus'>
          {this.props.openMenu == 'file-menu' ?
          <Menu mode='horizontal' onClick={this.fileMenuItemClicked} className='bottom-menu'>
              <MenuItem tooltip='New function is currently disabled' key='new'><ButtonImage icon='file'/>New</MenuItem>
              <MenuItem tooltip='Save function is currently disabled' key='save'><ButtonImage icon='save'/>Save</MenuItem>
              <MenuItem key='load'><ButtonImage icon='open-file'/>Load</MenuItem>
          </Menu> : null }
          {this.props.openMenu == 'simulate-menu' ?
          <Menu mode='horizontal' onClick={this.simulateMenuItemClicked} className='bottom-menu'>
              <MenuItem tooltip='Disabled' key='backward'><ButtonImage icon='step-backward'/>Prev</MenuItem>
              <MenuItem key='play'><ButtonImage icon={ppbutton}/>{ppbtntxt}</MenuItem>
              <MenuItem key='forward'><ButtonImage icon='step-forward'/>Next</MenuItem>
          </Menu> : null}
        </div>);

        return <div className="header-bar">
            <div>{topMenu}</div>
            <div>{bottomMenu}</div>
        </div>;
    }
}
