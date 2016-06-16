import React from 'react';
import ReactDOM from 'react-dom';
import Menu from 'rc-menu';
import _ from 'lodash';
import BrowserView          from '../browser';
import LoginView            from '../user/login';
import RegisterView         from '../user/register';
import CADView              from '../cad';
import HeaderView           from '../header';
import SidebarView          from '../sidebar';
import FooterView	    from '../footer';

import ReactTooltip from 'react-tooltip';

//TODO: Should this be a xmlhttpreq?
var getppbtnstate = function() {
    return 'play';
}

export default class ContainerView extends React.Component {
    constructor(props){
        super(props);

        let tempGuiMode=1;
        if((window.innerWidth-390 > window.innerHeight) && (window.innerWidth > 800))
            tempGuiMode=0;

        this.state = {
            guiMode: tempGuiMode,
            hvopenMenu: 'file-menu',
            svmode: 'tree',
            ws: -1,
            svtree: {
                "name": "No Project Loaded",
                "isLeaf": true
            },
            svaltmenu: '',
            wstext: '',
            ppbutton: getppbtnstate()
        };


        let self = this;
        var playpause = ()=>{
            var xhr = new XMLHttpRequest();
            var url = "/v2/nc/projects/";
            url = url + this.props.pid + "/state/loop/";
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
        var nextws = function(){
            var xhr = new XMLHttpRequest();
            var url = "/v2/nc/projects/"
            url = url + self.props.pid + "/state/ws/next";
            xhr.open("GET",url,true);
            xhr.send(null);
        }
        var prevws = function(){
            var xhr = new XMLHttpRequest();
            var url = "/v2/nc/projects/";
            url = url + self.props.pid + "/state/ws/prev";
            xhr.open("GET",url,true);
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
        var fBtnClicked = (info)=>{
            nextws();
        }
        var bBtnClicked = (info)=>{
            prevws();
        }

        ppstate = ppstate.bind(this);
        ppBtnClicked = ppBtnClicked.bind(this);
        fBtnClicked = fBtnClicked.bind(this);
        bBtnClicked = bBtnClicked.bind(this);

        this.props.app.socket.on("nc:state",(state)=>{ppstate(state)});

        this.props.app.actionManager.on('sim-pp',ppBtnClicked);
        this.props.app.actionManager.on('sim-f',fBtnClicked);
        this.props.app.actionManager.on('sim-b',bBtnClicked);


        this.updateWorkingstep = this.updateWorkingstep.bind(this);
        
        this.handleResize   = this.handleResize.bind(this);
        this.props.app.actionManager.on('change-workingstep', this.updateWorkingstep);

        this.headerCB=this.headerCB.bind(this);
        this.sidebarCBMode=this.sidebarCBMode.bind(this);
        this.sidebarCBTree=this.sidebarCBTree.bind(this);
        this.sidebarCBAltMenu=this.sidebarCBAltMenu.bind(this);
        this.cbWS=this.cbWS.bind(this);
        this.footerCBWSText=this.footerCBWSText.bind(this);
        this.cbPPButton=this.cbPPButton.bind(this);
    }

    componentDidMount() {
        window.addEventListener("resize", this.handleResize);

        let xhr = new XMLHttpRequest();
        let self = this;
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
        let url = "/v2/nc/projects/"
        url = url + this.props.pid + "/state/loop/";
        xhr.open("GET", url, true);
        xhr.send(null);
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResize);
    }

    handleResize() {
        if((window.innerWidth-390 > window.innerHeight) && (window.innerWidth > 800))
            this.setState({ guiMode: 0 });
        else
            this.setState({ guiMode: 1 });
    }

    updateWorkingstep(ws){
        let self = this;
        let xhr = new XMLHttpRequest();
        xhr.onreadystatechange = ()=>{
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    if(xhr.responseText)
                    {
                        var workingstep = JSON.parse(xhr.responseText);
                        self.setState({"ws": workingstep.id,"wstext":workingstep.name.trim()});
                    }
                    else
                        self.setState({"ws":ws,"wstxt":"Operation Unknown"});
                }
            }
        };
        let url = "/v2/nc/projects/";
        url = url + this.props.pid + "/workplan/" + ws;
        xhr.open("GET",url,true);
        xhr.send(null);
    }

    headerCB(newOpenMenu)
    {
        this.setState({ hvopenMenu: newOpenMenu });
    }

    sidebarCBMode(newMode)
    {
        this.setState({ svmode: newMode });
    }

    sidebarCBTree(newTree)
    {
        this.setState({ svtree: newTree });
    }

    sidebarCBAltMenu(newAltMenu)
    {
        this.setState({ svaltmenu: newAltMenu });
    }

    cbWS(newWS)
    {
        this.setState({ ws: newWS });
    }

    footerCBWSText(newWSText)
    {
        this.setState({ wstext: newWSText });
    }

    cbPPButton(newPPButton)
    {
        this.setState({ ppbutton: newPPButton });
    }
    
    render() {   
        let HV = this.state.guiMode == 0 ? <HeaderView
	    cadManager={this.props.app.cadManager}
        actionManager={this.props.app.actionManager}
        socket={this.props.app.socket}
        openMenu={this.state.hvopenMenu}
        cb={this.headerCB}
        cbPPButton={this.cbPPButton}
        ppbutton={this.state.ppbutton}
        pid={this.props.pid}
	    /> : undefined;
        let SV = this.state.guiMode == 0 ? <SidebarView
	    cadManager={this.props.app.cadManager}
	    app={this.props.app}
	    actionManager={this.props.app.actionManager}
	    socket={this.props.app.socket}
	    mode={this.state.svmode}
	    ws={this.state.ws}
	    tree={this.state.svtree}
	    altmenu={this.state.svaltmenu}
	    cbMode={this.sidebarCBMode}
	    cbWS={this.cbWS}
	    cbTree={this.sidebarCBTree}
	    cbAltMenu={this.sidebarCBAltMenu}
	    pid={this.props.pid}
	    /> : undefined;
	let FV = this.state.guiMode == 1 ? <FooterView 
	    cadManager={this.props.app.cadManager}
	    actionManager={this.props.app.actionManager}
	    socket={this.props.app.socket}
	    wsid={this.state.ws}
	    wstext={this.state.wstext}
	    cbWS={this.cbWS}
	    cbWSText={this.footerCBWSText}
	    ppbutton={this.state.ppbutton}
	    pid={this.props.pid}
	    /> : undefined;
        
        return(
	    <div style={{height:'100%'}}>
		{HV}
		{SV}
		<div id='cadview-container'>
		    <CADView
			manager={this.props.app.cadManager}
			viewContainerId='primary-view'
			root3DObject={this.props.app._root3DObject}
			guiMode={this.state.guiMode}
			/>
		</div>
		{FV}
	    </div>
	);
    }
}
