import React from 'react';
import Menu from 'rc-menu';
import _ from 'lodash';
var SubMenu = Menu.SubMenu;
var PlainMenuItem = Menu.Item;
import ReactTooltip from 'react-tooltip';

// TODO: Fix so tooltips work
class MenuItem extends React.Component {
    render() {
        if (this.props.tooltip) {
            var id = _.uniqueId("tooltip_");
            return (
                <PlainMenuItem {...this.props}>
                    <div>
                        <span data-tip data-for={id}>
                            {this.props.children}
                        </span>
                        <ReactTooltip id={id} place="top" type="dark" effect="float" delayShow={this.props.delayShow}>
                            {this.props.tooltip}
                        </ReactTooltip>
                    </div>
                </PlainMenuItem>
            );
        } else {
            return (
                <PlainMenuItem {...this.props}>
                    <div>
                        {this.props.children}
                    </div>
                </PlainMenuItem>
            );
        }
    }
}

class SliderMenuItem extends React.Component {
    render() {
        console.log(...this.props);
        return (
            <PlainMenuItem {...this.props}>
                <div>
                    {this.props.children}
                </div>
            </PlainMenuItem>
        )
    }
}

class ButtonImage extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div className={"button-icon glyphicon glyphicon-"+this.props.icon}/>
        );
    }
}

class Slider extends React.Component {
    constructor(props) {
        super(props);
        this.changed = this.changed.bind(this);
    }
    
    changed(info) {
        this.props.changed(info);
    }
    
    render() {
        var name = this.props.id.charAt(0).toUpperCase() + this.props.id.slice(1);
        if (this.props.left && this.props.right) {
            var left = this.props.left;
            var right = this.props.right;
            return (
                <div className="slider sliderWithIcons">
                    <input className={"range-"+this.props.id} onChange={this.changed} type="range" min="0" max="200" step="1" value={this.props.val}/>
                    <span className={"slider-icon slider-left-icon icon-"+left}/>
                    <output className={"text-"+this.props.id}>{name} - {this.props.val}%</output>
                    <span className={"slider-icon slider-right-icon icon-"+right}/>    
                </div>
            );
        } else {
            return (
                <div className="slider sliderNoIcons">
                    <input className={"range-"+this.props.id} onChange={this.changed} type="range" min="0" max="200" step="1" value={this.props.val}/>
                    <output className={"text-"+this.props.id}>{name} - {this.props.val}%</output>
                </div>
            );
        }

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
        this.updateSpeed = this.updateSpeed.bind(this);
    }

    openBottomMenu(info){
        this.props.cb(info.key);
    }

    updateSpeed(info) {
        this.props.actionManager.emit("simulate-setspeed", info.target.value);
    }

    debugMenuItemClicked(info) {
        if (info.key == "db1") {
            this.props.socket.emit('req:modeltree', "moldy");
        } else if (info.key == "db2") {
            this.props.socket.emit('req:projects');
        }
    }

    fileMenuItemClicked(info) {
        switch (info.key) {
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
            this.props.cbPPButton("pause");
        }
        else{
            this.props.cbPPButton("play");
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

    viewMenuItemClicked(info) {
        switch (info.key) {
            case "toleranceTree":
                this.props.actionManager.emit("open-tolerance-tree");
                break;
        }
    }

    render() {
        //if(this.props.guiMode == 1)
            //return null;
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
              <MenuItem key='backward'><ButtonImage icon='step-backward'/>Prev</MenuItem>
              <MenuItem key='play'><ButtonImage icon={ppbutton}/>{ppbtntxt}</MenuItem>
              <MenuItem key='forward'><ButtonImage icon='step-forward'/>Next</MenuItem>
              <SliderMenuItem key='speed'><Slider id='speed' changed={this.updateSpeed} val={this.props.speed} left='turtle' right='rabbit'/></SliderMenuItem>
          </Menu> : null}
        </div>);

        return <div className="header-bar">
            <div>{topMenu}</div>
            <div>{bottomMenu}</div>
        </div>;
    }
}
