import React from 'react';
import {Treebeard} from 'react-treebeard';
import ts from '../tree_style.jsx';

export default class ToleranceList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {curr: false};

    this.onToggle = this.onToggle.bind(this);
    this.addCurrent = this.addCurrent.bind(this);
    this.addUpcoming = this.addUpcoming.bind(this);
    this.nextNWorkingsteps = this.nextNWorkingsteps.bind(this);
    this.upcomingTols = this.upcomingTols.bind(this);
    this.addWorkpieces = this.addWorkpieces.bind(this);

    this.decorators = ts.decorators;
    this.decorators.propertyCb = this.props.propertyCb;
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
    if (this.props.curWS.toBe && this.props.curWS.toBe.id > 0) {
      let wp = this.props.toleranceCache[this.props.curWS.toBe.id];
      if (wp && wp.children && wp.children.length > 0) {
        tolList.push({
          name: 'Active Tolerances',
          leaf: true,
          type: 'divider',
          id: -1,
        });
        Array.prototype.push.apply(tolList, wp.children);
      } else {
        tolList.push({
          name: 'No Active Tolerances',
          leaf: true,
          type: 'divider',
          id: -1,
        });
      }
    }
  }

  addUpcoming(n, tolList) {
    let upcomingWS = this.nextNWorkingsteps(n);
    let upcomingTols = this.upcomingTols(upcomingWS);
    let upcoming = false;

    for (let i = 0; i < upcomingTols.length; i++) {
      if (upcomingTols[i].length !== 0) {
        upcoming = true;
        break;
      }
    }

    if (upcoming) {
      tolList.push({
        name: 'Upcoming Tolerances',
        leaf: true,
        type: 'divider',
        id: -2,
      });

      for (let i = 0; i < n; i++) {
        if (!upcomingTols[i] || upcomingTols[i].length === 0) {
          continue;
        }
        let ws = this.props.workingstepCache[upcomingWS[i]];
        ws.children = upcomingTols[i];
        ws.leaf = false;
        ws.icon = <div className='icon custom letter'>{i + 1}</div>;
        tolList.push(ws);
      }
    } else {
      tolList.push({
        name: 'No Upcoming Tolerances',
        leaf: true,
        type: 'divider',
        id: -2,
      });
    }
  }

  nextNWorkingsteps(n) {
    let wsList = this.props.workingstepList;
    let upcomingWS = [];
    let upcoming = false;
    for (let i = 0; i < wsList.length; i++) {
      if (wsList[i] === this.props.ws) {
        upcoming = true;
      } else if (upcoming === true && n > 0) {
        if (wsList[i] < 0 || !this.props.workingstepCache[wsList[i]].enabled) {
          continue;
        }
        upcomingWS.push(wsList[i]);
        n--;
      } else if (n <= 0) {
        break;
      }
    }

    return upcomingWS;
  }

  upcomingTols(upcomingWS) {
    let tolerances = [];
    for (let tol in this.props.toleranceCache) {
      if (this.props.toleranceCache[tol].type === 'tolerance') {
        tolerances.push(this.props.toleranceCache[tol]);
      }
    }

    let upcoming = [];
    for (let i in upcomingWS) {
      let ws = upcomingWS[i];
      let tolsInWS = [];
      for (let tol in tolerances) {
        if (tolerances[tol].workingsteps.indexOf(ws) >= 0) {
          let tolToAdd = tolerances[tol];
          tolToAdd.upcoming = true;
          tolsInWS.push(tolToAdd);
        }
      }
      upcoming.push(tolsInWS);
    }

    return upcoming;
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
    let tolList = [];
    this.addCurrent(tolList);
    let n = 5; // number of upcoming workingsteps to check for tolerances
    this.addUpcoming(n, tolList);
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
