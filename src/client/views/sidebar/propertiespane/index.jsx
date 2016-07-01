import React from 'react';
import Menu from 'rc-menu';
import request from 'superagent';
import _ from 'lodash';

let MenuItem = Menu.Item;

export default class PropertiesPane extends React.Component {
    constructor(props){
        //Create the constructor for the component
        super(props);
        
        this.state = {entity: null};
        
        this.selectWS = this.selectWS.bind(this);
        this.renderNode = this.renderNode.bind(this);
    }

    componentDidMount(){
      
    }

    selectWS(event, entity) {
        if (event.key === 'goto') {
            let url = '/v3/nc/state/ws/' + entity.id;
            request
                .get(url)
                .end(function (err, res) {
                    //
                });
        }
        else if (event.key === 'tool') {
            // open properties page for associated tool
            this.props.propertiesCb(this.props.tools[entity.tool]);
        }
        else {
            // some other menu item clicked, no need to do anything
        }
    }

    renderNode(node){
        
        var cName = 'node';
        //node is a generic white node
        //node running-node is a node that is the current workingstep
        //node disabled is a node that is part of a selective but isn't
        //currently enabled
        if(node.id == this.props.ws) {
            cName= 'node running-node';
        }
        else{
            if(node.enabled === false)
            cName = 'node disabled';
        }

        let icon = <span className={'icon ' + node.type} />;
        return (<div key={node.id}>
            <span
                id={node.id}
                className={cName}
                onClick={(event) => {this.props.propertiesCb(node);}}
            >
                {icon}
                <span className='textbox' >{node.name}</span>
            </span>
          </div>);
    }
    
    renderProperties(entity) {
        let items=null;

        if (entity === null)
            return null;
        
        let hasWorkingsteps = true;
        if (entity.workingsteps === undefined || entity.workingsteps.length <= 0) {
            hasWorkingsteps = false;
        }
      
        let timeDistance = null;
        if (entity.type === 'workingstep' || entity.type === 'selective' || entity.type === 'workplan') {
          
          let formattedTime = '';
          
          if (entity.timeUnits !== 'second')
            formattedTime = entity.baseTime + ' ' + entity.timeUnits;
          else {

            // format the time for display
            let stepTime = new Date(entity.baseTime * 1000);
            let h = stepTime.getUTCHours();
            let mm = stepTime.getUTCMinutes();
            let ss = stepTime.getUTCSeconds();

            if (h > 0) {
              if (h === 1)
                formattedTime = h + ' hr ' + mm + ' min ' + ss + ' sec';
              else
                formattedTime = h + ' hrs ' + mm + ' min ' + ss + ' sec';
            }
            else if (mm > 0) {
              formattedTime = mm + ' min ' + ss + ' sec';
            }
            else {
              formattedTime = ss + ' sec';
            }
          }

            timeDistance = <MenuItem disabled key='timeDistance' className='property timeDistance'>
              <div className='baseTime'>Base time: {formattedTime}</div>
              <div className='distance'>Distance: {entity.distance.toFixed(2)} {entity.distanceUnits}
              </div>
            </MenuItem>;
        }
      
        switch (entity.type) {
            case 'tolerance':
                items = (
                    <Menu className='properties'>
                        <MenuItem disabled key='tolType' className='property'>{entity.toleranceType} Tolerance</MenuItem>
                        <MenuItem disabled key='tolValue' className='property'>Value: {entity.value} {entity.unit}</MenuItem>
                        {hasWorkingsteps ?
                            <MenuItem key='workingsteps' className='property children workingsteps'>
                                <div className='title'>Used in Workingsteps:</div>
                                <div className='list'>
                                    {entity.workingsteps.map(this.renderNode)}
                                </div>
                            </MenuItem>
                            :
                            <MenuItem disabled key='workingsteps' className='property children workingsteps'>
                                <div className='title'>Not used in any workingsteps.</div>
                            </MenuItem>
                        }
                    </Menu>
                );
                
                break;
          case 'workingstep':
            let selectStep, goToButton, toolInfo;
            

                goToButton = (<MenuItem key='goto'
                    disabled={!(entity.enabled && this.props.ws !== entity.id)}
                    className='property goTo'>Go to Workingstep</MenuItem>);

                toolInfo = (<MenuItem key='tool' className='property toolInfo'>Tool: {this.props.tools[entity.tool].name} </MenuItem>);

                if (this.props.ws === entity.id) {
                    selectStep = <MenuItem disabled className='property'>Status: Active</MenuItem>;
                }
                else if (entity.enabled) {
                    selectStep = <MenuItem disabled className='property'>Status: Inactive</MenuItem>
                }
                else {
                    selectStep = <MenuItem disabled className='property'>Status: Disabled</MenuItem>
                }
                items = (
                    <Menu className='properties' onSelect={(event) => {this.selectWS(event, entity);}}>
                        {selectStep}
                        {timeDistance}
                        {toolInfo}
                        {goToButton}
                    </Menu>
                );
                break;
            case 'workplan':
            case 'selective':
                items = (
                    <Menu className='properties'>
                        {timeDistance}
                        <MenuItem key='children' className='property children'>
                            <div className='title'>Children:</div>
                            <div className='list'>
                                {entity.children.map(this.renderNode)}
                            </div>
                        </MenuItem>
                    </Menu>
                );
                break;
            case 'tool':
                items = (
                    <Menu className='properties'>
                        {hasWorkingsteps ?
                            <MenuItem key='workingsteps' className='property children workingsteps'>
                                <div className='title'>Used in Workingsteps:</div>
                                <div className='list'>
                                    {entity.workingsteps.map(this.renderNode)}
                                </div>
                            </MenuItem>
                            :
                            <MenuItem key='workingsteps' className='property children workingsteps'>
                                <div className='title'>Not used in any workingsteps.</div>
                            </MenuItem>
                        }
                    </Menu>
                );
                break;
            default:
                items = (
                    <Menu className='properties'>
                        <MenuItem disabled className='property'>No information available</MenuItem>
                    </Menu>
                );
        }
        
        return items;
    }

    render(){
        let entityName = null;
        let visible = false;
        // TODO: get real icons for workingstep/workplan/tool
        
        let tolType = '';
        
        if (this.props.entity !== null) {
            visible = true;
            
            if (this.props.entity.type === 'tolerance') {
                entityName = this.props.entity.toleranceType[0].toUpperCase() + this.props.entity.toleranceType.slice(1);
                tolType = 'tolerance ' + this.props.entity.toleranceType;
            }
            else {
                entityName = this.props.entity.name;
            }
        }
        
        return (
            <div className={'properties-pane' + (visible ? ' visible' : '')}>
                <div className='titlebar'>
                    <span className={'icon' + (visible ? ' ' + this.props.entity.type + ' ' + tolType : '')} />
                    <span className='title'>
                        <div className='type'>
                        {visible?
                            this.props.entity.type[0].toUpperCase() + this.props.entity.type.slice(1)
                            : null}
                        </div>
                        <div className='name'>{entityName}</div>
                    </span>
                    <span className="exit glyphicons glyphicons-remove-sign"
                          onClick={(event) => {this.props.propertiesCb(null);}} />
                </div>
                {this.renderProperties(this.props.entity)}
            </div>
        );
    }
}