import React from 'react';
import ReactDOM from 'react-dom';
import Menu from 'rc-menu';
import _ from 'lodash';

import ReactTooltip from 'react-tooltip';

//TODO: Should this be a xmlhttpreq?
var getppbtnstate = function() {
    return 'play';
}

class ButtonImage extends React.Component{
  constructor(props){
    super(props);
  }
  render(){
    var classes = 'button-icon glyphicon glyphicon-' + this.props.icon;
    if(this.props.onBtnClick)
      return (<div className={classes} onClick={this.props.onBtnClick}/>);
    return (<div className={classes}/>);
  }
}

export default class FooterView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {'ppbutton':getppbtnstate(),"wsid":-1,"wstext":""};
	this.btnClicked = this.btnClicked.bind(this);
	this.updateWorkingstep = this.updateWorkingstep.bind(this);
        let self = this;
        var playpause = ()=>{
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
	var ppBtnClicked = (info)=>{
	    var cs = this.state.ppbutton;
	    ppstate(cs);
	    playpause();
	};
        ppstate = ppstate.bind(this);
	ppBtnClicked = ppBtnClicked.bind(this);

	this.props.socket.on("nc:state",(state)=>{ppstate(state)});

	this.props.actionManager.on('sim-pp',ppBtnClicked);
	this.props.actionManager.on('change-workingstep', this.updateWorkingstep);
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

    btnClicked(info){
	    this.props.actionManager.emit('sim-pp');
    }
    updateWorkingstep(ws){
	    var self = this;
	    var xhr = new XMLHttpRequest();
	    xhr.onreadystatechange = ()=>{
		    if (xhr.readyState == 4) {
			    if (xhr.status == 200) {
				    if(xhr.responseText)
				    {
					    var workingstep = JSON.parse(xhr.responseText);
					    self.setState({"wsid": workingstep.id,"wstext":workingstep.name.trim()});
				    }
				    else
					    self.setState({"wsid":ws,"wstxt":"Operation Unknown"});
			    }
		    }
	    };
	    var url = "/v2/nc/boxy/plan/"+ws;
	    xhr.open("GET",url,true);
	    xhr.send(null);
    }
    render() {
	    var ppbtntxt = this.state.ppbutton;
		return <div className="Footer-bar">
			<div className="op-text">{this.state.wstext}</div>
			<ButtonImage onBtnClick={this.btnClicked} icon={ppbtntxt}/>
			</div>;
    }
}
