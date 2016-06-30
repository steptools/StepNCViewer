import React from 'react';
var md = require("node-markdown").Markdown;
import Menu from 'rc-menu';
import _ from 'lodash';
let SubMenu = Menu.SubMenu;
let PlainMenuItem = Menu.Item;
import ReactTooltip from 'react-tooltip';

class MenuItem extends React.Component {
    render() {
        let name = "header-menu-item menu-item-button";
        if (this.props.tooltip) {
            let id = _.uniqueId("tooltip_");
            return (
                <PlainMenuItem {...this.props}>
                    <div className={name}>
                        <span data-tip data-for={id}>
                            {this.props.children}
                        </span>
                        <ReactTooltip id={id} place="top" type="dark" effect="float" delayShow={this.props.delayShow}>
                            {this.props.tooltip}
                        </ReactTooltip>
                    </div>
                </PlainMenuItem>
            );
        }
        else {
            return (
                <PlainMenuItem {...this.props}>
                    <div className={name}>
                        {this.props.children}
                    </div>
                </PlainMenuItem>
            );
        }
        
    }
}

class SliderMenuItem extends React.Component {
    render() {
        return (
            <PlainMenuItem {...this.props}>
                <div className="header-menu-item menu-item-slider">
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
        let prefix = this.props.prefix;
        let icon = prefix + "-" + this.props.icon;
        return (<div className={"button-icon " + prefix + " " + icon}/>);
    }
}

ButtonImage.propTypes = {icon: React.PropTypes.string.isRequired};

class Slider extends React.Component {
    constructor(props) {
        super(props);
        this.changed = this.changed.bind(this);
    }

    changed(info) {
        this.props.changed(info);
    }

    render() {
        let name = this.props.id.charAt(0).toUpperCase() + this.props.id.slice(1);
        if (this.props.left && this.props.right && this.props.prefix) {
            let prefix = this.props.prefix;
            let left = prefix + "-" + this.props.left;
            let right = prefix + "-" + this.props.right;
            // TODO:Remove onMouseUp / onKeyUp if/when bug is fixed with onChange
            return (
                <div className='slider sliderWithIcons'>
                    <input className={"range-" + this.props.id} onChange={this.changed} 
                        onMouseUp={this.changed} onKeyUp={this.changed} value={this.props.val} type='range' min='0' max='200' step='1'/>
                    <div className='sliderData'>
                        <div className={"slider-icon slider-left-icon " + prefix + " " + left} onMouseUp={this.changed} onKeyUp={this.changed} value='0'/>
                        <div className={"slider-text text-" + this.props.id}>{name}</div>
                        <div className={"slider-icon slider-right-icon " + prefix + " " + right} onMouseUp={this.changed} onKeyUp={this.changed} value='200'/>
                    </div>
                </div>
            );
        } else {
            return (
                <div className='slider sliderNoIcons'>
                    <input className={"range-" + this.props.id} onChange={this.changed} type='range' min='0' max='200' step='1' value={this.props.val}/>
                    <div className='sliderData'>
                        <output className={"text-" + this.props.id}>{name}</output>
                    </div>
                </div>
            );
        }
    }
}

Slider.propTypes = {changed: React.PropTypes.func.isRequired, id: React.PropTypes.string.isRequired, val: React.PropTypes.number.isRequired,
                    left: React.PropTypes.string.isRequired, right: React.PropTypes.string.isRequired};

export default class HeaderView extends React.Component {
    constructor(props) {
        super(props);

        this.simulateMenuItemClicked = this.simulateMenuItemClicked.bind(this);
        this.updateSpeed = this.updateSpeed.bind(this);
    }
    
    componentDidMount() {
        let changelog = document.getElementById("changes");
        let chlog = new XMLHttpRequest();
        chlog.open("GET","/log");
        chlog.onreadystatechange = function(){
            if (chlog.readyState == 4 && chlog.status == 200) {
                document.getElementById("changes").innerHTML = md(chlog.responseText.toString());
                document.getElementById("logbutton").innerHTML = "v"+md(chlog.responseText.toString()).split("\n")[0].split(" ")[1];


            }
        }
        chlog.send();
    }

    updateSpeed(info) {
        this.props.actionManager.emit("simulate-setspeed", info);
    }

    simulateMenuItemClicked(info) {
        switch (info.key) {
            case "forward":
                this.props.actionManager.emit("sim-f");
                break;
            case "play":
                this.props.actionManager.emit("sim-pp");
                if (this.props.ppbutton == "play") {
                    this.props.cbPPButton("pause");
                } else {
                    this.props.cbPPButton("play");
                }
                break;
            case "backward":
                this.props.actionManager.emit("sim-b");
                break;
            case "showlog":
                let changelog = document.getElementById("changes");
                if(this.props.logstate === false) {
                    changelog.className = "changelog visible"
                    this.props.cbLogstate(true);
                }   
                else {
                    changelog.className = "changelog"
                    this.props.cbLogstate(false);
                }
            
        }
    }


 render() {
        let ppbtntxt;
        let ppbutton = this.props.ppbutton;
        let showlog = this.props.logstate;
        if (this.props.ppbutton === "play") {
            ppbtntxt = "Play";
        }
        else {
            ppbtntxt = "Pause";
        }
        const headerMenu = (
            <Menu mode='horizontal' onClick={this.simulateMenuItemClicked} className='header-menu'>
                <MenuItem tooltip='Backward function is currently disabled' key='backward'><ButtonImage prefix='glyphicon' icon='step-backward'/>Prev</MenuItem>
                <MenuItem key='play'><ButtonImage prefix='glyphicon' icon={ppbutton}/>{ppbtntxt}</MenuItem>
                <MenuItem key='forward'><ButtonImage prefix='glyphicon' icon='step-forward'/>Next</MenuItem>
                <SliderMenuItem key='speed'><Slider id='speed' changed={this.updateSpeed} val={this.props.speed} prefix='glyphicons' left='turtle' right='rabbit'/></SliderMenuItem>
                <MenuItem key='showlog'><ButtonImage prefix='glyphicon' icon='book'/><span id="logbutton">v1.1.0</span></MenuItem>
            </Menu>
            
        );

        return <div className="header">
        {headerMenu}
        <div className="changelog" id="changes"></div>
        </div>;
    }  
}

HeaderView.propTypes = {cadManager: React.PropTypes.object.isRequired,
                          cbPPButton: React.PropTypes.func.isRequired, ppbutton: React.PropTypes.string.isRequired};
