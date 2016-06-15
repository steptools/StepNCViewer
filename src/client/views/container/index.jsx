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
            svws: -1,
            svtree: {
                "name": "No Project Loaded",
                "isLeaf": true
            },
            svaltmenu: ''
        };

        this.handleResize   = this.handleResize.bind(this);
        this.headerCB=this.headerCB.bind(this);
        this.sidebarCBMode=this.sidebarCBMode.bind(this);
        this.sidebarCBWS=this.sidebarCBWS.bind(this);
        this.sidebarCBTree=this.sidebarCBTree.bind(this);
        this.sidebarCBAltMenu=this.sidebarCBAltMenu.bind(this);
    }

    componentDidMount() {
        window.addEventListener("resize", this.handleResize);
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

    headerCB(newOpenMenu)
    {
        this.setState({ hvopenMenu: newOpenMenu });
    }

    sidebarCBMode(newMode)
    {
        this.setState({ svmode: newMode });
    }

    sidebarCBWS(newWS)
    {
        this.setState({ svws: newWS });
    }

    sidebarCBTree(newTree)
    {
        this.setState({ svtree: newTree });
    }

    sidebarCBAltMenu(newAltMenu)
    {
        this.setState({ svaltmenu: newAltMenu });
    }
    
    render() {   
        let HV = this.state.guiMode == 0 ? <HeaderView
	    cadManager={this.props.app.cadManager}
        actionManager={this.props.app.actionManager}
        socket={this.props.app.socket}
        openMenu={this.state.hvopenMenu}
        cb={this.headerCB}
	    /> : undefined;
        let SV = this.state.guiMode == 0 ? <SidebarView
	    cadManager={this.props.app.cadManager}
	    app={this.props.app}
	    actionManager={this.props.app.actionManager}
	    socket={this.props.app.socket}
	    mode={this.state.svmode}
	    ws={this.state.svws}
	    tree={this.state.svtree}
	    altmenu={this.state.svaltmenu}
	    cbMode={this.sidebarCBMode}
	    cbWS={this.sidebarCBWS}
	    cbTree={this.sidebarCBTree}
	    cbAltMenu={this.sidebarCBAltMenu}
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
		<FooterView 
		    cadManager={this.props.app.cadManager}
		    actionManager={this.props.app.actionManager}
		    socket={this.props.app.socket}
		    guiMode={this.state.guiMode}
		    />
	    </div>
	);
    }
}
