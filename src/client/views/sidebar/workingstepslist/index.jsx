export default class WorkingstepList extends React.Component {
  constructor(props) {
    super(props);

    this.renderNode = this.renderNode.bind(this);
    this.setWS = this.setWS.bind(this);
  }

  componentWillUnmount() {
    // icons need to be removed/reset before unmounting
    for (let i in this.props.workingstepCache) {
      delete this.props.workingstepCache[i].icon;
    }
  }

  setWS(node) {
    let url = '/v3/nc/state/ws/' + node['id'];
    request.get(url).end();
  }

  getNodeIcon(node) {
    if (!isNaN(node.number)) {
      return <div className='icon custom letter'>{node.number}</div>;
    }
  }

  renderNode(nodeId) {
    let node = this.props.workingstepCache[nodeId];
    node.icon = this.getNodeIcon(node);
    let cName = 'node';
    if (node.id === this.props.ws) {
      cName += ' running-node';
    }
    if (node.id === undefined) {
      cName += ' setup';
    }

    return (
      <div
        id={node.id}
        className={cName}
        onClick={() => {
          if (!cName.includes('setup')) {
            this.setWS(node);
          }
        }}
        onMouseDown={function(e) {
          e.stopPropagation();
          return false;
        }}
        style={{'paddingLeft': '5px'}}
        key={node.id}
      >
        {node.icon}
        {node.id === undefined
          ? <span className="setup-textbox">{node.name}</span>
          : <span className="textbox">{node.name}</span>}
      </div>
    );
  }

  render() {
    let treeHeight;
    if (this.props.isMobile) {
      treeHeight = {'height': '100%'};
    }

    return (
      <div className='m-tree' style={treeHeight}>
        {this.props.workingstepList.map((workingstep, i) => {
          return (
            <div className='m-node' key={i}>
              {this.renderNode(workingstep)}
            </div>
          );
        })}
      </div>
    );
  }
}

let rp = React.PropTypes;
WorkingstepList.propTypes = {
  cbMode: rp.func.isRequired,
  cbTree: rp.func.isRequired,
  ws: rp.oneOfType([rp.string, rp.number]).isRequired,
};
