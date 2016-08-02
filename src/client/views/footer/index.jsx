import React from 'react';
import MobileSidebar from '../mobilesidebar';

let soy = 0; //for detecting offset clicked from top of footerbar
let soy2 = 0; //for detecting clicks
let lastTouch = 0;
let dragged = false;

class ButtonImage extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let classes = 'button-icon glyphicons glyphicons-' + this.props.icon;
    if (this.props.onBtnClick) {
      return (<div className={classes} onClick={this.props.onBtnClick}/>);
    }
    return (<div className={classes}/>);
  }
}

export default class FooterView extends React.Component {
  constructor(props) {
    super(props);
    this.btnClicked = this.btnClicked.bind(this);
    this.ffBtnClicked = this.ffBtnClicked.bind(this);
    this.bbBtnClicked = this.bbBtnClicked.bind(this);
    this.soMouseDown = this.soMouseDown.bind(this);
    this.soMouseUp = this.soMouseUp.bind(this);
    this.soMouseMove = this.soMouseMove.bind(this);
    this.soTouchStart = this.soTouchStart.bind(this);
    this.soTouchEnd = this.soTouchEnd.bind(this);
    this.soTouchCancel = this.soTouchCancel.bind(this);
    this.soTouchMove = this.soTouchMove.bind(this);
    this.soClick = this.soClick.bind(this);
  }

  btnClicked() {
    this.props.actionManager.emit('sim-pp');
  }
  ffBtnClicked() {
    this.props.actionManager.emit('sim-f');
  }
  bbBtnClicked() {
    this.props.actionManager.emit('sim-b');
  }

  soMouseDown(info) {
    $('.Footer-bar .op-text').off('mousedown');

    let fv = $('.Footer-container');
    let fb = $('.Footer-bar');
    let db = $('.drawerbutton');
    soy = (fv.offset().top + (db.height() + fb.height())) - info.clientY;

    $(window).on('mousemove', this.soMouseMove);
    $(window).on('mouseup', this.soMouseUp);
  }

  soMouseUp() {
    $('.Footer-bar .op-text').on('mousedown', this.soMouseDown);

    let fv = $('.Footer-container');
    let offset = fv.offset().top;
    let height = $('.drawerbutton').height() + $('.Footer-bar').height();
    let currentMSGuiMode = this.props.msGuiMode;

    if (soy > 0) {
      if (!currentMSGuiMode && (window.innerHeight - offset) > (height * 2)) {
        this.props.cbMobileSidebar(true);
        currentMSGuiMode = true;
      } else if (currentMSGuiMode && (offset > height)) {
        this.props.cbMobileSidebar(false);
        currentMSGuiMode = false;
      }
    }

    if (currentMSGuiMode === false) {
      let bottomPos = (window.innerHeight - height);
      fv.animate({top: bottomPos+'px'}, 500);
    }
    if (currentMSGuiMode === true) {
      fv.animate({top: '0px'}, 500);
    }
    soy = 0;

    $(window).off('mousemove');
    $(window).off('mouseup');
  }

  soMouseMove(info) {
    dragged = true;
    let fv = $('.Footer-container');
    let fb = $('.Footer-bar').height();
    let db = $('.drawerbutton').height();
    let maxTop = window.innerHeight - (fb + db);
    if (soy > 0) {
      let newTop = info.clientY - soy;
      if (newTop < 0) {
        newTop = 0;
      } else if (newTop > maxTop) {
        newTop = maxTop;
      }
      fv.css('top', newTop+'px');
    }
  }

  soTouchStart(info) {
    info.preventDefault();
    info.stopPropagation();

    let fv = $('.Footer-container').offset().top;
    let fb = $('.Footer-bar').height();
    let db = $('.drawerbutton').height();
    soy = (fv + (db + fb)) - info.touches[0].pageY;
    soy2 = info.touches[0].pageY;
  }

  soTouchEnd(info) {
    info.preventDefault();
    info.stopPropagation();

    let fv = $('.Footer-container');
    let fb = $('.Footer-bar');
    let db = $('.drawerbutton');
    let currentMSGuiMode = this.props.msGuiMode;

    if (soy > 0) {
      if (soy2 - lastTouch > 0) {
        this.props.cbMobileSidebar(true);
        currentMSGuiMode = true;
      } else if (soy2 - lastTouch < 0) {
        this.props.cbMobileSidebar(false);
        currentMSGuiMode = false;
      }
    }

    if (currentMSGuiMode === false) {
      let bottomPos = (window.innerHeight - (db.height() + fb.height()));
      fv.animate({top: bottomPos+'px'}, 500);
      //fv.css('height', 'unset');
    }
    if (currentMSGuiMode === true) {
      fv.animate({top: '0px'}, 500);
      //fv.css('height', '100%');
    }
    soy = 0;
  }

  soTouchCancel(info) {
    info.preventDefault();
    info.stopPropagation();

    let fv = $('.Footer-container');
    let fb = $('.Footer-bar');
    let db = $('.drawerbutton');
    let currentMSGuiMode = this.props.msGuiMode;

    if (soy > 0) {
      if (soy2 - lastTouch > 0) {
        this.props.cbMobileSidebar(true);
        currentMSGuiMode = true;
      } else if (soy2 - lastTouch < 0) {
        this.props.cbMobileSidebar(false);
        currentMSGuiMode = false;
      }
    }

    if (currentMSGuiMode === false) {
      let bottomPos = (window.innerHeight - (db.height() + fb.height()));
      fv.animate({top: bottomPos+'px'}, 500);
      //fv.css('height', 'unset');
    }
    if (currentMSGuiMode === true) {
      fv.animate({top: '0px'}, 500);
      //fv.css('height', '100%');
    }
    soy = 0;
  }

  soTouchMove(info) {
    info.preventDefault();
    info.stopPropagation();

    lastTouch = info.touches[0].pageY;

    let fv = $('.Footer-container');
    let fb = $('.Footer-bar').height();
    let db = $('.drawerbutton').height();
    let maxTop = window.innerHeight - (fb + db);
    if (soy > 0) {
      let newTop = info.touches[0].pageY - soy;
      if (newTop < 0) {
        newTop = 0;
      } else if (newTop > maxTop) {
        newTop = maxTop;
      }
      fv.css('top', newTop+'px');
    }
  }

  soClick(info) {
    info.preventDefault();
    info.stopPropagation();

    if (dragged === true) {
      dragged = false;
      return;
    }

    let fv = $('.Footer-container');
    let fb = $('.Footer-bar');
    let db = $('.drawerbutton');
    let currentMSGuiMode = this.props.msGuiMode;

    currentMSGuiMode = !currentMSGuiMode;
    this.props.cbMobileSidebar(currentMSGuiMode);

    if (currentMSGuiMode === false) {
      let bottomPos = (window.innerHeight - (db.height() + fb.height()));
      fv.animate({top: bottomPos+'px'}, 500);
      //fv.css('height', 'unset');
    }
    if (currentMSGuiMode === true) {
      fv.animate({top: '0px'}, 500);
      //fv.css('height', '100%');
    }
    soy = 0;
  }

  componentDidMount() {
    $('.Footer-bar .op-text').on('mousedown', this.soMouseDown);
    $('.Footer-bar .op-text').on('click', this.soClick);
    $('.drawerbutton').on('click', this.soClick);
  }

  render() {
    //if (this.props.guiMode === 0) {
    //  return null;
    //}
    let SO;
    SO = (
      <MobileSidebar
        cadManager={this.props.cadManager}
        app={this.props.app}
        actionManager={this.props.actionManager}
        socket={this.props.socket}
        mode={this.props.mode}
        ws={this.props.wsid}
        tree={this.props.tree}
        altmenu={this.props.altmenu}
        cbMode={this.props.cbMode}
        cbWS={this.props.cbWS}
        cbTree={this.props.cbTree}
        cbAltMenu={this.props.cbAltMenu}
        toolCache={this.props.toolCache}
        curtool={this.props.curtool}
        toleranceList={this.props.toleranceList}
        toleranceCache={this.props.toleranceCache}
        workplanCache={this.props.workplanCache}
        workingstepCache={this.props.workingstepCache}
        workingstepList={this.props.workingstepList}
        openProperties={this.props.openProperties}
        selectedEntity={this.props.selectedEntity}
        previouslySelectedEntities={this.props.previouslySelectedEntities}
        preview={this.props.preview}
        openPreview={this.props.openPreview}
        toggleHighlight={this.props.toggleHighlight}
        highlightedTolerances={this.props.highlightedTolerances}
      />
    );

    let ppbtntxt = this.props.ppbutton;
    let drawerbutton;
    if (this.props.msGuiMode) { //drawer open
      drawerbutton = 'glyphicons glyphicons-chevron-down';
    } else { //drawer closed
      drawerbutton = 'glyphicons glyphicons-chevron-up';
    }

    return (
      <div className='Footer-container'>
        <div className='drawerbutton'>
            <span className={drawerbutton}/>
        </div>
        <div className='Footer-bar'>
          <div
            className='op-text'
            onTouchStart={this.soTouchStart}
            onTouchEnd={this.soTouchEnd}
            onTouchCancel={this.soTouchCancel}
            onTouchMove={this.soTouchMove}>
            <p>{this.props.wstext}</p>
          </div>
          <div className='footer-buttons'>
            <ButtonImage onBtnClick={this.bbBtnClicked} icon='step-backward'/>
            <ButtonImage onBtnClick={this.btnClicked} icon={ppbtntxt}/>
            <ButtonImage onBtnClick={this.ffBtnClicked} icon='step-forward'/>
          </div>
        </div>
        {SO}
      </div>
    );
  }
}
