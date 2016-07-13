'use-strict';

import React from 'react';

function getNodeIcon(node) {
    if (node.type === 'workplan') {
        return <span className='icon glyphicons glyphicons-cube-empty'/>
    } else if (node.type === 'selective') {
        return <span className='icon glyphicons glyphicons-list-numbered'/>
    } else if (node.type === 'workplan-setup') {
        return <span className='icon glyphicons glyphicons-cube-black'/>
    } else if (node.type === 'workingstep') {
        return <span className='icon glyphicons glyphicons-blacksmith'/>
    } else if (node.type === 'tolerance') {
        return <span className={'icon custom tolerance '+node.toleranceType} />
    } else if (node.type === 'workpiece') {
        return <span className='icon custom workpiece' />
    } else {
        return <span className='icon glyphicons glyphicons-question-sign'/>
    }
}

function hasActiveChildren(node, id){
    if(node.id === id){
      return 'active';
    }
    else if(!node.leaf){
      for(let i = 0; i < node.children.length; i++){
        if(hasActiveChildren(node.children[i],id) === 'active'){
            if(node.toggled === false){
                return 'active';  
            }
            else{
                return 'child-active';
            }
       
        }
        else if(hasActiveChildren(node.children[i],id) ==='child-active'){
            if (node.toggled === false){
                 return 'active';
            }
            else{
                return 'child-active';
            }
        }
      }

    }
    return 'inactive';    
}

const Container = (props) => {
    //console.log('CONTAINER');
    //console.log(props);
    let node = props.node;
    node.icon = getNodeIcon(node);
    let innerName = 'inner';
    let outerName = 'node';
    if (hasActiveChildren(node, props.decorators.ws) === 'active') {
        innerName += ' running-node';
    } else if (node.enabled === false) {
        innerName += ' disabled';
    }
    let toggleName = 'toggle';
    if (node.leaf === true) {
        toggleName = 'toggle-hidden';
    } else if (node.toggled === true) {
        toggleName += ' glyphicon glyphicon-chevron-down';
    } else {
        toggleName += ' glyphicon glyphicon-chevron-right';
    }
    
    return (
        <div
            id={node.id}
            className={outerName}
        >
            <div 
                className={toggleName}
                onClick={props.onClick}
            />
            <div
                className={innerName} onClick={(event)=>{props.decorators.propertyCb(node)}}
            >
                {node.icon}
                <span className='textbox'>
                    {node.name}
                </span>
            </div>
        </div>
    );
}

const decorators = {
    Container
}

const style = {
    tree: {
        base: {
            listStyle: 'none'
        },
        node: {
            base: {
                listStyle: 'none'
            }
        }
    }
}

export default {
    decorators,
    style
}
