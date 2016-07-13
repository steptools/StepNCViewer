import React from 'react';
import _ from 'lodash';
import request from 'superagent';

export default class ToolList extends React.Component {
  constructor(props){
    //Create the constructor for the component
    super(props);

    this.renderNode = this.renderNode.bind(this);
  }

  onObjectTreeNodeClick(node, self){
      this.props.propertyCb(node);
  }

  renderNode(node){
      let cName = 'node';
      if(node.id == this.props.curtool) cName += ' running-node';
      if(node.enabled === false) cName += ' disabled';
      return <ol
          id={node.id}
          type = {node.name}
          className={cName}
          onClick={this.onObjectTreeNodeClick.bind(this, node)}
          onMouseDown={function(e){e.stopPropagation()}}
          style={{"paddingLeft" : "5px"}}
          key={node.id} >
          {node.icon}
          <span className="textbox">{node.name} {node.value}</span>
      </ol>;
  }

  componentWillMount(){


  }

  render(){
    return (
      <div className='m-tree'>
        {_.values(this.props.tools).map((tool, i) => {
          return <div className='m-node' key={i}>
            {this.renderNode(tool)}
          </div>;
        })}
      </div>
    );
  }
}

ToolList.propTypes = {cbMode: React.PropTypes.func.isRequired, cbTree: React.PropTypes.func.isRequired}
