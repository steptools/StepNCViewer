import React from 'react';
import _ from 'lodash';
import {Treebeard} from 'react-treebeard';
import ts from '../tree_style.jsx';

export default class WorkplanList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.onToggle = this.onToggle.bind(this);
        this.data = this.getTreeData();
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
        this.setState({cursor: node});
    }

    toggleNodes(node) {
        for (let i = 0; i < _.size(node.children); i++) {
            if (node.children[i].children) {
                node.children[i].toggled = true;
                this.toggleNodes(node.children[i]);
            }
        }
    }

    getTreeData() {
        let treeData = this.props.workplanCache;
        treeData.toggled = true;
        this.toggleNodes(treeData);
        return treeData;
    }

    render() {
        //console.log("Render wpl");
        //console.log(this);
        this.decorators.ws = this.props.ws;
        return (<Treebeard data={this.data} onToggle={this.onToggle} style={ts.style} decorators={this.decorators} />);
    }
}
