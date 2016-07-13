import React from 'react';
import _ from 'lodash';
import request from 'superagent';

export default class WorkingstepList extends React.Component {
    constructor(props) {
        //Create the constructor for the component
        super(props);

        this.renderNode = this.renderNode.bind(this);
        this.setWS = this.setWS.bind(this);
    }
    
    setWS(node) {
        let url = '/v3/nc/state/ws/' + node["id"];
        request.get(url).end(function(err, res) {});
    }

    getNodeIcon(node) {
        if (isNaN(node.number)) {
            return;
        }
        return <span className='icon custom letter'>{node.number}</span>;
    }

    shouldComponentUpdate(nextProps, nextState) {
        return this.props.ws !== nextProps.ws;
    }

    renderNode(nodeId) {
        let node = this.props.workingstepCache[nodeId];
        node.icon = this.getNodeIcon(node);
        let cName = 'node';
        if (node.id == this.props.ws) {
            cName += ' running-node';    
        }
        if (node.id === undefined) {
            cName += ' setup';
        }
        return (<ol 
            id={node.id} 
            className={cName} 
            onClick={() => {this.setWS(node);}}
            onMouseDown={function(e) {e.stopPropagation()}} 
            style={{"paddingLeft": "5px"}} 
            key={node.id}
        >
            {node.icon}
            {node.id === undefined
                ? <span className="setup-textbox">{node.name}</span>
                : <span className="textbox">{node.name}</span>}
        </ol>);
    }

    render() {
        return (
            <div className='m-tree'>
                {this.props.workingstepList.map((workingstep, i) => {
                    return <div className='m-node' key={i}>
                        {this.renderNode(workingstep)}
                    </div>;
                })}
            </div>
        );
    }
}

WorkingstepList.propTypes = {
    cbMode: React.PropTypes.func.isRequired,
    cbTree: React.PropTypes.func.isRequired,
    ws: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]).isRequired
};
