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

var getppbtnstate = function(){
    return 'play';
}

export default class HeaderView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {'openMenu': 'file-menu', 'ppbutton':getppbtnstate()};
        this.openBottomMenu = this.openBottomMenu.bind(this);
        this.debugMenuItemClicked = this.debugMenuItemClicked.bind(this);
        this.fileMenuItemClicked = this.fileMenuItemClicked.bind(this);
        this.simulateMenuItemClicked = this.simulateMenuItemClicked.bind(this);
        this.viewMenuItemClicked = this.viewMenuItemClicked.bind(this);

        let self = this;
        var playpause = function(){
            var xhr = new XMLHttpRequest();
            var url = "/v2/nc/boxy/loop/";
            if(self.state.ppbutton ==='play'){
                ppstate('play');
                url = url+"start";
            }
            else{
                ppstate('pause');
                url = url+"stop";
            }
            xhr.open("GET", url, true);
            xhr.send(null);
        }
        var ppstate = (state) =>
        {
            var notstate;
            if(state==="play") notstate = "pause";
            else notstate = "play";
            self.setState({'ppbutton':notstate});
        };
        ppstate = ppstate.bind(this);

        this.props.actionManager.on('simulate-play',playpause);
        this.props.actionManager.on('simulate-pause',playpause);
        this.props.socket.on("nc:state",(state)=>{ppstate(state);});
    }

    openBottomMenu(info){
      this.setState({ 'openMenu' : info.key });
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
        this.props.actionManager.emit("simulate-forward");
        break;
        case "play":
            this.props.actionManager.emit("simulate-play");
            break;
        case "pause":
            this.props.actionManager.emit("simulate-pause");
            break;
        case "backward":
        this.props.actionManager.emit("simulate-backward");
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

    componentDidMount() {
        var xhr = new XMLHttpRequest();
        var self = this;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    if(xhr.responseText =="play")
                        self.setState({"ppbutton": "pause"}); //Loop is running, we need a pause button.
                    else
                        self.setState({"ppbutton":"play"});
                }
            }
        };
        var url = "/v2/nc/boxy/loop/state";
        xhr.open("GET", url, true);
        xhr.send(null);
    }
    render() {
/*        var ppbtntxt = this.state.ppbutton;
        const topMenu = ( <Menu mode='horizontal' onClick={this.openBottomMenu} className='top-menu'>
            <MenuItem key='file-menu'>File</MenuItem>
            <MenuItem key='simulate-menu'>Simulate</MenuItem>
            {//<MenuItem key='view-menu'>View</MenuItem>
                }
            {//<MenuItem key='debug-menu'>Debug</MenuItem>
                }
        </Menu> );
        var bottomMenu = <div className='bottom-menus'>;
        switch(this.state.openMenu) {
            case 'file-menu':
		bottomMenu +=
                (<Menu mode='horizontal' onClick={this.fileMenuItemClicked} className='bottom-menu'>
                  <MenuItem tooltip='New function is currently disabled' key='new'><ButtonImage icon='file'/>New</MenuItem>
                  <MenuItem tooltip='Save function is currently disabled' key='save'><ButtonImage icon='save'/>Save</MenuItem>
                  <MenuItem key='load'><ButtonImage icon='open-file'/>Load</MenuItem>
                  </Menu>);
		 break; 
            case 'simulate-menu':
              bottomMenu+= 
                (<Menu mode='horizontal' onClick={this.simulateMenuItemClicked} className='bottom-menu'>
                  {//<MenuItem tooltip='Disabled' key='backward'><ButtonImage icon='backward'/>Prev</MenuItem>
		  }
                  <MenuItem key={ppbtntxt}><ButtonImage icon={ppbtntxt}/>{ppbtntxt}</MenuItem>
                  {//<MenuItem tooltip='Disabled' key='forward'><ButtonImage icon='forward'/>Next</MenuItem>
		  }
                  {//<MenuItem tooltip='Connect to remote session' delayShow={1000} key='remote-session'><ButtonImage icon='globe'/>Remote</MenuItem>
		  }
                 </Menu> );
	      break;
	    case 'view-menu':
              bottomMenu+=
                  (<Menu mode='horizontal' onClick={this.viewMenuItemClicked} className='bottom-menu'>
                      <MenuItem tooltip='View Tolerance Tree' key='toleranceTree'><ButtonImage icon='tree-deciduous'/>Tolerances</MenuItem>
                  </Menu>);
	     break;
	     case 'debug-menu':
//                 bottomMenu+= 
//                 (<Menu mode='horizontal' onClick={this.debugMenuItemClicked} className='bottom-menu'>
//                     <MenuItem key='db1'><ButtonImage icon='fire'/>Update Tree</MenuItem>
//                     <MenuItem key='db2'><ButtonImage icon='fire'/>Get Projects</MenuItem>
//                     <MenuItem key='db3'><ButtonImage icon='fire'/>Action 3</MenuItem>
//                     <MenuItem key='db4'><ButtonImage icon='fire'/>Action 4</MenuItem>
//                     <MenuItem key='db5'><ButtonImage icon='fire'/>Action 5</MenuItem>
//                     <MenuItem key='db6'><ButtonImage icon='fire'/>Action 6</MenuItem>
//                 </Menu>);
            break;
	}
        bottomMenu+=</div>;

        return <div className="header-bar">
            <div>{topMenu}</div>
            <div>{bottomMenu}</div>
        </div>;*/
	    return <div className="header-bar"></div>;
    }
}
