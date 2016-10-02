/* Copyright G. Hemingway, 2015 - All rights reserved */
'use strict';

require('../../stylesheets/components/compass.scss');

/*************************************************************************/

function setStyleTransform (element, value) {
  let style = element.style;
  let styleNames = setStyleTransform._transformPropertyNames;

  for (let i = 0; i < styleNames.length; i++) {
    if (typeof style[styleNames[i]] !== 'undefined') {
      style[styleNames[i]] = value;
    }
  }
}

setStyleTransform._transformPropertyNames = [
  'transform',
  'webkitTransform',
  'MozTransform',
];

export default class CompassView extends React.Component {
  constructor(props) {
    super(props);
    this.controls = this.props.controls;
    this.camera = this.props.camera;
    this.update = this.update.bind(this);
  }

  bindEvents() {
    let self = this;
    let defaultUpVector = new THREE.Vector3(0,1,0);

    this.$cubeButtons.on('mouseenter', function () {
      self.$cubeButtons
        .removeClass('hover')
        .filter('[data-group="' + $(this).attr('data-group') + '"]')
        .addClass('hover');
    }).on('mouseleave', function () {
      self.$cubeButtons.removeClass('hover');
    }).on('click', function () {
      let upVector, upValues, eulerOrder;
      if (typeof this.dataset.up !== 'undefined') {
        upValues = this.dataset.up.split(',').map(parseFloat);
        upVector = new THREE.Vector3(upValues[0],upValues[1],upValues[2]);
      } else {
        upVector = defaultUpVector;
      }
      if (typeof this.dataset.order === 'undefined') {
        eulerOrder = 'XYZ';
      } else {
        eulerOrder = this.dataset.order;
      }

      let conversionFactor = Math.PI / 180.0;
      let viewAngles = new THREE.Euler(
        parseFloat(this.dataset.x)*conversionFactor,
        parseFloat(this.dataset.y)*conversionFactor,
        parseFloat(this.dataset.z)*conversionFactor,
        eulerOrder
      );

      self.controls.setRotationFromEuler(viewAngles, upVector);
    });
  }

  componentDidMount() {
    this.compassCube = $(this.props.parentSelector + ' .cube')[0];
    this.compassCubeMatrix = new THREE.Matrix4();
    this.props.dispatcher.addEventListener('render:update', this.update);
    this.$cubeButtons = $(this.props.parentSelector + ' .cube-button');
    this.bindEvents();
  }

  componentWillUnmount() {
    this.props.dispatcher.removeEventListener('render:update', this.update);
  }

  update() {
    let up = this.camera.up;
    let lookFrom = this.camera.position;
    let lookTarget = this.controls.target;
    let matrix = new THREE.Matrix4();
    let roundedMatrix;
    matrix.lookAt(lookTarget, lookFrom, up);
    this.compassCubeMatrix.getInverse(matrix);
    roundedMatrix = Array.prototype.map.call(this.compassCubeMatrix.elements,
      function (v) {
        return v.toFixed(3);
      }
    );
    let transform = 'perspective(300px) matrix3d(' + roundedMatrix.join() + ')';
    setStyleTransform(this.compassCube, transform);
  }

  render() {
    let cName = 'cube';
    if (this.props.parentSelector.includes('#preview')) {
      cName += ' preview';
    } else if (this.props.parentSelector.includes('#cadjs-container')) {
      cName += ' cadjs';
    }
    return (
      <div className={cName}>
        <div className="cube-face cube-face-front">
          <span className="cube-face-label">Front</span>
          <div className="cube-button cube-face-button" data-x="0" data-y="0" data-z="0"></div>

          <div className="cube-face-edge cube-face-edge-top cube-button cube-button-face-edge" data-group="front-top" data-x="45" data-y="0"data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-right cube-button cube-button-face-edge" data-group="front-right" data-x="0" data-y="45"data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-bottom cube-button cube-button-face-edge" data-group="front-bottom" data-x="-45" data-y="0"data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-left cube-button cube-button-face-edge" data-group="front-left" data-x="0" data-y="-45"data-z="0" data-order="YXZ"></div>

          <div className="cube-face-corner cube-face-corner-top-right cube-button cube-button-face-corner" data-group="front-top-right" data-x="45"data-y="45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-right cube-button cube-button-face-corner" data-group="front-bottom-right"data-x="-45" data-y="45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-left cube-button cube-button-face-corner" data-group="front-bottom-left"data-x="-45" data-y="-45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-top-left cube-button cube-button-face-corner" data-group="front-top-left" data-x="45"data-y="-45" data-z="0" data-order="YXZ"></div>
        </div>
        <div className="cube-face cube-face-back">
          <span className="cube-face-label">Back</span>
          <div className="cube-button cube-face-button" data-x="0" data-y="180" data-z="0"></div>

          <div className="cube-face-edge cube-face-edge-top cube-button cube-button-face-edge" data-group="back-top" data-x="45" data-y="180" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-right cube-button cube-button-face-edge" data-group="back-left" data-x="0" data-y="225" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-bottom cube-button cube-button-face-edge" data-group="back-bottom" data-x="-45" data-y="180" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-left cube-button cube-button-face-edge" data-group="back-right" data-x="0" data-y="135" data-z="0" data-order="YXZ"></div>

          <div className="cube-face-corner cube-face-corner-top-right cube-button cube-button-face-corner" data-group="back-top-left" data-x="45" data-y="225" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-right cube-button cube-button-face-corner" data-group="back-bottom-left" data-x="-45" data-y="225" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-left cube-button cube-button-face-corner" data-group="back-bottom-right" data-x="-45" data-y="135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-top-left cube-button cube-button-face-corner" data-group="back-top-right" data-x="45" data-y="135" data-z="0" data-order="YXZ"></div>
        </div>
        <div className="cube-face cube-face-right">
          <span className="cube-face-label">Right</span>
          <div className="cube-button cube-face-button" data-x="0" data-y="90" data-z="0"></div>

          <div className="cube-face-edge cube-face-edge-top cube-button cube-button-face-edge" data-group="top-right" data-x="45" data-y="90" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-right cube-button cube-button-face-edge" data-group="back-right" data-x="0" data-y="135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-bottom cube-button cube-button-face-edge" data-group="bottom-right" data-x="-45" data-y="90" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-left cube-button cube-button-face-edge" data-group="front-right" data-x="0" data-y="45" data-z="0" data-order="YXZ"></div>

          <div className="cube-face-corner cube-face-corner-top-right cube-button cube-button-face-corner" data-group="back-top-right" data-x="45" data-y="135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-right cube-button cube-button-face-corner" data-group="back-bottom-right" data-x="-45" data-y="135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-left cube-button cube-button-face-corner" data-group="front-bottom-right" data-x="-45" data-y="45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-top-left cube-button cube-button-face-corner" data-group="front-top-right" data-x="45" data-y="45" data-z="0" data-order="YXZ"></div>
        </div>
        <div className="cube-face cube-face-left">
          <span className="cube-face-label">Left</span>
          <div className="cube-button cube-face-button" data-x="0" data-y="-90" data-z="0"></div>

          <div className="cube-face-edge cube-face-edge-top cube-button cube-button-face-edge" data-group="top-left" data-x="45" data-y="-90" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-right cube-button cube-button-face-edge" data-group="front-left" data-x="0" data-y="-45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-bottom cube-button cube-button-face-edge" data-group="bottom-left" data-x="-45" data-y="-90" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-left cube-button cube-button-face-edge" data-group="back-left" data-x="0" data-y="-135" data-z="0" data-order="YXZ"></div>

          <div className="cube-face-corner cube-face-corner-top-right cube-button cube-button-face-corner" data-group="front-top-left" data-x="45" data-y="-45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-right cube-button cube-button-face-corner" data-group="front-bottom-left" data-x="-45" data-y="-45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-left cube-button cube-button-face-corner" data-group="back-bottom-left" data-x="-45" data-y="-135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-top-left cube-button cube-button-face-corner" data-group="back-top-left" data-x="45" data-y="-135" data-z="0" data-order="YXZ"></div>
        </div>
        <div className="cube-face cube-face-top">
          <span className="cube-face-label">Top</span>
          <div className="cube-button cube-face-button" data-x="90" data-y="0" data-z="0" data-up="0,0,1"></div>

          <div className="cube-face-edge cube-face-edge-top cube-button cube-button-face-edge" data-group="back-top" data-x="45" data-y="180" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-right cube-button cube-button-face-edge" data-group="top-right" data-x="45" data-y="90" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-bottom cube-button cube-button-face-edge" data-group="front-top" data-x="45" data-y="0" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-left cube-button cube-button-face-edge" data-group="top-left" data-x="45" data-y="-90" data-z="0" data-order="YXZ"></div>

          <div className="cube-face-corner cube-face-corner-top-right cube-button cube-button-face-corner" data-group="back-top-right" data-x="45" data-y="135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-right cube-button cube-button-face-corner" data-group="front-top-right" data-x="45" data-y="45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-left cube-button cube-button-face-corner" data-group="front-top-left" data-x="45" data-y="-45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-top-left cube-button cube-button-face-corner" data-group="back-top-left" data-x="45" data-y="-135" data-z="0" data-order="YXZ"></div>
        </div>
        <div className="cube-face cube-face-bottom">
          <span className="cube-face-label">Bottom</span>
          <div className="cube-button cube-face-button" data-x="-90" data-y="0" data-z="0" data-up="0,0,-1"></div>

          <div className="cube-face-edge cube-face-edge-top cube-button cube-button-face-edge" data-group="front-bottom" data-x="-45" data-y="0" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-right cube-button cube-button-face-edge" data-group="bottom-right" data-x="-45" data-y="90" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-bottom cube-button cube-button-face-edge" data-group="back-bottom" data-x="-45" data-y="180" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-edge cube-face-edge-left cube-button cube-button-face-edge" data-group="bottom-left" data-x="-45" data-y="-90" data-z="0" data-order="YXZ"></div>

          <div className="cube-face-corner cube-face-corner-top-right cube-button cube-button-face-corner" data-group="front-bottom-right" data-x="-45" data-y="45" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-right cube-button cube-button-face-corner" data-group="back-bottom-right" data-x="-45" data-y="135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-bottom-left cube-button cube-button-face-corner" data-group="back-bottom-left" data-x="-45" data-y="-135" data-z="0" data-order="YXZ"></div>
          <div className="cube-face-corner cube-face-corner-top-left cube-button cube-button-face-corner" data-group="front-bottom-left" data-x="-45" data-y="-45" data-z="0" data-order="YXZ"></div>
        </div>
      </div>
    );
  }
}

CompassView.propTypes = {
  dispatcher: React.PropTypes.object.isRequired,
};
