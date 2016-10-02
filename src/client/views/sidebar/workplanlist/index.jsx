import {Treebeard} from 'react-treebeard';
import ts from '../tree_style.jsx';

export default class WorkplanList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {current: false};

    this.onToggle = this.onToggle.bind(this);
    this.toggleToCurrentWS(this.props.workplanCache);
    this.decorators = ts.decorators;
    this.decorators.propertyCb = this.props.propertyCb;
  }

  onToggle(node, toggled) {
    if (this.state.cursor) {
      this.state.cursor.active = false;
    }
    node.active = true;
    if (node.children) {
      node.toggled = toggled;
    }
    this.setState({cursor: node, current: !this.state.current});
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.current !== nextState.current) {
      return true;
    }
    return this.props.ws !== nextProps.ws;
  }

  componentDidMount() {
    $('.sidebar ul.sidebar-menu-tabs + ul').addClass('treebeard');
  }

  toggleToCurrentWS(node) {
    let childtag = false;
    if (node.id === this.props.ws) {
      node.toggled = true;
      return true;
    }
    if (node.enabled && !node.leaf) {
      for (let i = 0; i < node.children.length; i++) {
        if (this.toggleToCurrentWS(node.children[i])) {
          node.toggled = true;
          childtag = true;
        }
      }
    }
    if (childtag === true) {
      return true;
    }
    node.toggled = false;
  }

  render() {
    this.decorators.ws = this.props.ws;
    if (this.props.isMobile) {
      ts.style.tree.base.height = '100%';
    }

    return (
      <Treebeard
        data={this.props.workplanCache}
        onToggle={this.onToggle}
        style={ts.style}
        decorators={this.decorators}
      />
    );
  }
}
