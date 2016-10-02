import {Treebeard} from 'react-treebeard';
import ts from '../tree_style.jsx';

let wsList = [];
var tolerancesByWS = [];

export default class ToleranceList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {curr: false};

    this.getTolerancesByWS = this.getTolerancesByWS.bind(this);
    this.onToggle = this.onToggle.bind(this);
    this.addCurrent = this.addCurrent.bind(this);
    this.addUpcoming = this.addUpcoming.bind(this);
    this.addPrevious = this.addPrevious.bind(this);
    this.addWorkpieces = this.addWorkpieces.bind(this);

    this.decorators = ts.decorators;
    this.decorators.propertyCb = this.props.propertyCb;
    this.decorators.toleranceCache = this.props.toleranceCache;
    this.decorators.openPreview = this.props.openPreview;
    this.decorators.selectEntity = this.props.selectEntity;
    this.decorators.toggleHighlight = this.props.toggleHighlight;
    this.decorators.highlightedTolerances = this.props.highlightedTolerances;
  }

  componentDidMount() {
    $('.sidebar ul.sidebar-menu-tabs + ul').addClass('treebeard flat');
  }

  componentWillReceiveProps(nextProps) {
    this.decorators.highlightedTolerances = nextProps.highlightedTolerances;
  }

  componentWillUnmount() {
    // some properties need to be removed before unmounting
    for (let i in this.props.workingstepCache) {
      this.props.workingstepCache[i].leaf = true;
      delete this.props.workingstepCache[i].children;
      delete this.props.workingstepCache[i].icon;
    }
  }

  // use props to get just the tolerances (no workpieces)
  getTolerancesByWS() {
    if (tolerancesByWS.length > 0) {
      return;
    }

    wsList = this.props.workingstepList.filter(function(x) {
      return x > -1;
    });

    let tolerances = [];
    for (let tol in this.props.toleranceCache) {
      if (this.props.toleranceCache[tol].type === 'tolerance') {
        tolerances.push(this.props.toleranceCache[tol]);
      }
    }

    let tolsInWS;
    for (let i in wsList) {
      let ws = wsList[i];
      tolsInWS = [];
      for (let tol in tolerances) {
        if (tolerances[tol].workingsteps.indexOf(ws) >= 0) {
          let tolToAdd = tolerances[tol];
          tolsInWS.push(tolToAdd);
        }
      }
      tolerancesByWS.push(tolsInWS);
    }
  }

  onToggle(node, toggled) {
    if (this.state.cursor) {
      this.state.cursor.active = false;
    }
    node.active = true;
    if (node.children) {
      node.toggled = toggled;
    }
    this.setState({cursor: node, curr: !this.state.curr});
  }

  addCurrent(tolList) {
    // Don't change this to use tolerancesByWS, it won't work
    tolList.push({
      name: 'Current Workingstep',
      leaf: true,
      type: 'divider',
      id: -1,
    });
    let ws = this.props.ws;
    let curWSIndex = wsList.indexOf(ws);
    ws = this.props.workingstepCache[ws];
    _.each(ws.children, (child) => {
      child.openPreview = false;
    });
    ws.leaf = true;
    ws.icon = <div className='icon custom letter'>{curWSIndex + 1}</div>;
    let displayWS = _.extend({}, ws);
    delete displayWS.children;
    tolList.push(displayWS);

    if (!this.props.curWS.toBe || this.props.curWS.toBe <= 0) {
      return;
    }
    let wp = this.props.toleranceCache[this.props.curWS.toBe.id];
    if (wp) {
      if ((wp.children && wp.children.length > 0)
      || (wp.datums && wp.datums.length > 0)) {
        tolList.push({
          name: 'Active Tolerances / Datums',
          leaf: true,
          type: 'divider',
          id: -2,
        });
      }
      if (wp.children) {
        Array.prototype.push.apply(tolList, wp.children);
      }
      if (wp.datums) {
        Array.prototype.push.apply(tolList, wp.datums);
      }
    } else {
      tolList.push({
        name: 'No Active Tolerances / Datums',
        leaf: true,
        type: 'divider',
        id: -2,
      });
    }
  }

  addUpcoming(tolList) {
    let wsCache = this.props.workingstepCache;
    let curWSIndex = wsList.indexOf(this.props.ws);
    let upcoming = false;

    for (let i = curWSIndex + 1; i < tolerancesByWS.length; i++) {
      if (tolerancesByWS[i] && tolerancesByWS[i].length > 0) {
        upcoming = true;
        break;
      }
    }

    if (!upcoming) {
      tolList.push({
        name: 'No Upcoming Tolerances',
        leaf: true,
        type: 'divider',
        id: -3,
      });
      return;
    }

    tolList.push({
      name: 'Upcoming Tolerances',
      leaf: true,
      type: 'divider',
      id: -3,
    });

    for (let i = curWSIndex + 1; i < tolerancesByWS.length; i++) {
      if (tolerancesByWS[i] && tolerancesByWS[i].length === 0) {
        continue;
      }
      let ws = wsCache[wsList[i]];
      ws.children = tolerancesByWS[i];
      _.each(ws.children, (child) => {
        child.openPreview = true;
      });
      ws.leaf = false;
      ws.icon = <div className='icon custom letter'>{i + 1}</div>;
      tolList.push(ws);
    }
  }

  addPrevious(tolList) {
    let wsCache = this.props.workingstepCache;
    let curWSIndex = wsList.indexOf(this.props.ws);
    let previous = false;

    for (let i = 0; i < curWSIndex; i++) {
      if (tolerancesByWS[i] && tolerancesByWS[i].length > 0) {
        previous = true;
        break;
      }
    }

    if (!previous) {
      tolList.push({
        name: 'No Previous Tolerances',
        leaf: true,
        type: 'divider',
        id: -4,
      });
      return;
    }

    tolList.push({
      name: 'Previous Tolerances',
      leaf: true,
      type: 'divider',
      id: -4,
    });

    for (let i = 0; i < curWSIndex; i++) {
      if (tolerancesByWS[i] && tolerancesByWS[i].length === 0) {
        continue;
      }
      let ws = wsCache[wsList[i]];
      ws.children = tolerancesByWS[i];
      _.each(ws.children, (child) => {
        child.openPreview = true;
      });
      ws.leaf = false;
      ws.icon = <div className='icon custom letter'>{i + 1}</div>;
      tolList.push(ws);
    }
  }

  addWorkpieces(tolList, dividerId) {
    tolList.push({
      name: 'Workpieces With Tolerances',
      leaf: true,
      type: 'divider',
      id: dividerId,
    });

    Array.prototype.push.apply(tolList, this.props.toleranceList.map((id) => {
      return this.props.toleranceCache[id];
    }));
  }

  render() {
    // TODO: pass tolerances by WS (in order) through props for optimization
    this.getTolerancesByWS();
    let tolList = [];
    this.addCurrent(tolList);
    this.addUpcoming(tolList);
    this.addPrevious(tolList);
    //this.addWorkpieces(tolList, -(n + 1));

    if (tolList.length <= 0) {
      return null;
    }

    if (this.props.isMobile) {
      ts.style.tree.base.height = '100%';
    }

    return (
      <Treebeard
        data={tolList}
        onToggle={this.onToggle}
        style={ts.style}
        decorators={this.decorators}
        toggleHighlight={this.props.toggleHighlight}
      />
    );
  }
}

ToleranceList.propTypes = {
  cbMode: React.PropTypes.func.isRequired,
  cbTree: React.PropTypes.func.isRequired,
};
