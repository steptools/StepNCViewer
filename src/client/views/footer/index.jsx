import React from 'react';
import ReactDOM from 'react-dom';
import Menu from 'rc-menu';
import _ from 'lodash';

import ReactTooltip from 'react-tooltip';

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
	this.btnClicked = this.btnClicked.bind(this);
    }

    btnClicked(info){
	    this.props.actionManager.emit('sim-pp');
    }
    
    render() {
        //if(this.props.guiMode == 0)
            //return null;
        var ppbtntxt = this.props.ppbutton;
		return <div className="Footer-bar">
			<div className="op-text">{this.props.wstext}</div>
			<ButtonImage onBtnClick={this.btnClicked} icon={ppbtntxt}/>
			</div>;
    }
}
