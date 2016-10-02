import MobileSidebar from '../mobilesidebar';

let actionOffset = 0;
let firstTouch = {};
let dragged = false;
let fv, fb, db, footerHeight;

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
    this.footerControlMode = this.footerControlMode.bind(this);
    this.footerControlPosition = this.footerControlPosition.bind(this);
    this.footerMove = this.footerMove.bind(this);
    this.soMouseDown = this.soMouseDown.bind(this);
    this.soMouseUp = this.soMouseUp.bind(this);
    this.soMouseMove = this.soMouseMove.bind(this);
    this.soClick = this.soClick.bind(this);
    this.soTouchStart = this.soTouchStart.bind(this);
    this.soTouchEnd = this.soTouchEnd.bind(this);
    this.soTouchMove = this.soTouchMove.bind(this);
  }

  btnClicked() {
    //console.log('sim-pp');
    this.props.actionManager.emit('sim-pp');
  }

  ffBtnClicked() {
    //console.log('sim-f');
    this.props.actionManager.emit('sim-f');
  }

  bbBtnClicked() {
    //console.log('sim-b');
    this.props.actionManager.emit('sim-b');
  }

  footerControlMode() {
    let mode = this.props.msGuiMode;
    let offset = fv.offset().top;

    if (!mode && (window.innerHeight - offset) > (footerHeight * 2)) {
      this.props.cbMobileSidebar(true);
      mode = true;
    } else if (mode && (offset > footerHeight)) {
      this.props.cbMobileSidebar(false);
      mode = false;
    }

    this.footerControlPosition(mode);
  }

  footerControlPosition(mode) {
    if (mode === false) {
      let bottomPos = (window.innerHeight - footerHeight);
      fv.stop().animate({top: bottomPos+'px'}, 500);
    } else if (mode === true) {
      fv.stop().animate({top: '0px'}, 500, 'swing', function() {
        // scroll the sidebar after the footer is open
        let tree = $('.m-tree,.treebeard');
        let node = $('.running-node');
        if (node.length <= 0) {
          return;
        }

        let tHeight = tree.innerHeight();
        let tOffset = tree.offset().top;
        let nHeight = node.innerHeight();
        let nOffset = node.offset().top;
        let scroll = nOffset - tOffset - (tHeight / 2) + (nHeight / 2);
        if (scroll > (tree.innerHeight() - tOffset)) {
          tree.animate({scrollTop: scroll}, 1000);
        }
      });
    }
  }

  footerMove(y) {
    let currOffset = fv.offset().top + (footerHeight / 2) - y;
    if ((actionOffset > 0) !== (currOffset > actionOffset)) {
      actionOffset = currOffset;
    }

    let maxTop = window.innerHeight - footerHeight;
    let newTop = y - (footerHeight / 2) + actionOffset;
    if (newTop < 0) {
      newTop = 0;
    } else if (newTop > maxTop) {
      newTop = maxTop;
    }

    fv.css('top', newTop+'px');
  }

  soMouseDown(info) {
    //console.log('mouse down');
    $('.Footer-container .draggable').off('mousedown');

    actionOffset = fv.offset().top + (footerHeight / 2) - info.clientY;

    $(window).on('mousemove', this.soMouseMove);
    $(window).on('mouseup', this.soMouseUp);
  }

  soMouseUp() {
    //console.log('mouse up');
    $('.Footer-container .draggable').on('mousedown', this.soMouseDown);
    $(window).off('mousemove');
    $(window).off('mouseup');

    if (dragged === false) {
      return;
    }

    this.footerControlMode();
  }

  soMouseMove(info) {
    //console.log('mousemove');
    dragged = true;
    this.footerMove(info.clientY);
  }

  soClick() {
    //console.log('click');
    if (dragged === true) {
      dragged = false;
      return;
    }

    let currentMSGuiMode = this.props.msGuiMode;
    currentMSGuiMode = !currentMSGuiMode;
    this.props.cbMobileSidebar(currentMSGuiMode);
    this.footerControlPosition(currentMSGuiMode);
  }

  soTouchStart(info) {
    //console.log('touch start');
    info.preventDefault();
    info.stopPropagation();
    if (info.originalEvent) {
      info = info.originalEvent;
    }
    let touches = info.touches;

    // prevents changes from multiple touches, we only use the first touch
    if (touches.length > 1) {
      return;
    }

    actionOffset = fv.offset().top + (footerHeight / 2) - touches[0].pageY;
    firstTouch = touches[0];
    firstTouch.timeStamp = info.timeStamp;
  }

  soTouchEnd(info) {
    //console.log('touch end');
    info.preventDefault();
    info.stopPropagation();
    if (info.originalEvent) {
      info = info.originalEvent;
    }
    let touchDuration = info.timeStamp - firstTouch.timeStamp;

    // if the duration of the touch was less than 250ms consider it a tap
    if (touchDuration < 250) {
      this.soClick(info);
      return;
    }

    this.footerControlMode();
  }

  soTouchMove(info) {
    //console.log('touch move');
    info.preventDefault();
    info.stopPropagation();
    if (info.originalEvent) {
      info = info.originalEvent;
    }
    this.footerMove(info.touches[0].pageY);
  }

  componentDidMount() {
    fv = $('.Footer-container');
    fb = $('.Footer-bar');
    db = $('.drawerbutton');
    footerHeight = db.height() + fb.height();

    $('.Footer-container .draggable').on('mousedown', this.soMouseDown);
    $('.Footer-container .draggable').on('click', this.soClick);
    $('.Footer-container .draggable').on('touchstart', this.soTouchStart);
    $('.Footer-container .draggable').on('touchend', this.soTouchEnd);
    $('.Footer-container .draggable').on('touchmove', this.soTouchMove);
    $('.Footer-container .draggable').on('touchcancel', this.soTouchEnd);
  }

  render() {
    let SO = (
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
        selectEntity={this.props.selectEntity}
        previewEntity={this.props.previewEntity}
        previewEntityCb={this.props.previewEntityCb}
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
        <div className='drawerbutton draggable'>
            <span className={drawerbutton}/>
        </div>
        <div className='Footer-bar'>
          <div className='op-text draggable'>
            <p className='first'>{this.props.wstext}</p>
            <p className='last'>{this.props.wstext}</p>
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
