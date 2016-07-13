import React from 'react';
import Menu,{Item as MenuItem} from 'rc-menu';
import request from 'superagent';
import _ from 'lodash';

function getIcon(type, data) {
    switch (type) {
        case 'workplan':
            return 'icon glyphicons glyphicons-cube-empty';
        case 'workplan-setup':
            return 'icon glyphicons glyphicons-cube-black';
        case 'selective':
            return 'icon glyphicons glyphicons-list-numbered';
        case 'workingstep':
            return 'icon glyphicons glyphicons-blacksmith';
        case 'tool':
            return 'icon custom tool';
        case 'workpiece':
            return 'icon custom workpiece';
        case 'tolerance':
            if (data) {
                return 'icon custom tolerance ' + data;
            } 
            return 'icon glyphicons glyphicons-question-sign';
        case 'tolerance type':
            return 'icon glyphicons glyphicons-adjust';
        case 'tolerance value':
            return 'icon glyphicons glyphicons-adjust-alt';
        case 'exit':
            return 'icon glyphicons glyphicons-remove';
        case 'active':
            return 'icon glyphicons glyphicons-ok-circle';
        case 'inactive':
            return 'icon glyphicons glyphicons-remove-circle';
        case 'disabled':
            return 'icon glyphicons glyphicons-ban-circle'
        case 'time':
            return 'icon glyphicons glyphicons-clock';
        case 'distance':
            return 'icon glyphicons glyphicons-ruler';
        default:
            return 'icon glyphicons glyphicons-question-sign';
    }
}

function getFormattedTime(entity) {
    let time = ''

    if (entity.timeUnits !== 'second') {
        time = entity.baseTime + ' ' + entity.timeUnits;
        return time;
    }
    
    let stepTime = new Date(entity.baseTime * 1000);
    let h = stepTime.getUTCHours();
    let mm = stepTime.getUTCMinutes();
    let ss = stepTime.getUTCSeconds();
    
    if (h === 1) {
        time = h + ' hr ' + mm + ' min ' + ss + ' sec';
    } else if (h > 0) {
        time = h + ' hrs ' + mm + ' min ' + ss + ' sec';
    } else if (mm > 0) {
        time = mm + ' min ' + ss + ' sec';
    } else {
        time = ss + ' sec';
    }
    
    return time;
}

export default class PropertiesPane extends React.Component {
    constructor(props) {
        //Create the constructor for the component
        super(props);
        
        this.state = {entity: null};
        
        this.selectWS = this.selectWS.bind(this);
        this.renderNode = this.renderNode.bind(this);
    }

    selectWS(event, entity) {
        if (event.key === 'goto') {
            let url = '/v3/nc/state/ws/' + entity.id;
            request.get(url).end(function(err, res) {
                //
            });
        } else if (event.key === 'tool') {
            // open properties page for associated tool
            this.props.propertiesCb(this.props.tools[entity.tool]);
        } else {
            // some other menu item clicked, no need to do anything
        }
    }

    renderNode(node) {
        let cName = 'node';
        if (node.id == this.props.ws) {
            cName = 'node running-node';
        } else {
            if (node.enabled === false) {
                cName = 'node disabled';    
            }
        }
        
        let icon = <span className={getIcon(node.type)}/>;
        if (node.type === 'tolerance') {
            icon = <span className={getIcon(node.type, node.toleranceType)}/>;
        }
        
        return (
            <div key={node.id}>
                <span id={node.id} className={cName} onClick={(event) => {
                    this.props.propertiesCb(node);
                }}>
                    {icon}
                    <span className='textbox'>
                        {node.name}
                    </span>
                </span>
            </div>
        );
    }

    renderProperties(entity) {
        if (entity === null) {
            return null;
        }
        
        let properties = null;
        
        let hasChildren = false;
        if (entity.children && entity.children.length > 0) {
            hasChildren = true;
        } 
        
        let hasWorkingsteps = false;
        if (entity.workingsteps && entity.workingsteps.length > 0) {
            hasWorkingsteps = true;
        }

        let time = null;
        let distance = null;
        if (entity.type === 'workingstep' || entity.type === 'selective' || entity.type === 'workplan') {
            let formattedTime = getFormattedTime(entity);

            time = <MenuItem disabled key='time' className='property time'>
                <div className={getIcon('time')}/>
                Base time: {formattedTime}
            </MenuItem>
            
            distance = <MenuItem disabled key='distance' className='property distance'>
                <div className={getIcon('distance')}/>
                Distance: {entity.distance.toFixed(2)}
                {entity.distanceUnits}
            </MenuItem>
        }
        
        let active = null
        if (entity.type === 'tolerance' || entity.type === 'workingstep') {
            if (entity.active === true || this.props.ws === entity.id) {
                active = (
                    <MenuItem disabled className='property'>
                        <div className={getIcon('active')}/>
                        Status: Active
                    </MenuItem>
                )
            } else if (entity.enabled === true) {
                active = (
                    <MenuItem disabled className='property'>
                        <div className={getIcon('inactive')}/>
                        Status: Inactive
                    </MenuItem>
                )
            } else {
                active = (
                    <MenuItem disabled className='property'>
                        <div className={getIcon('disabled')}/>
                        Status: Disabled
                    </MenuItem>
                )
            }
        }

        switch (entity.type) {
            case 'workpiece':
                properties = (
                    <Menu className='properties'>
                        {hasChildren ? 
                            <MenuItem disabled key='workingsteps' className='property children workingsteps'>
                                <div className='title'>Children:</div>
                                <div className='list'>
                                    {entity.children.map(this.renderNode)}
                                </div>
                            </MenuItem>
                        : 
                            <MenuItem disabled key='workingsteps' className='property children workingsteps'>
                                <div className='title'>
                                    No Children
                                </div>
                            </MenuItem>
                        }
                    </Menu>
                );

                break;
            case 'workingstep':
                let goToButton,
                    toolInfo;

                goToButton = (
                    <MenuItem key='goto' disabled={!(entity.enabled === true && this.props.ws !== entity.id)} className='property goTo'>
                        Go to Workingstep
                    </MenuItem>
                );

                toolInfo = (
                    <MenuItem key='tool' className='property toolInfo'>
                        <div className={getIcon('tool')}/>
                        Tool: {this.props.tools[entity.tool].name}
                    </MenuItem>
                );

                properties = (
                    <Menu className='properties' onClick={(event) => {
                        this.selectWS(event, entity);
                    }}>
                        {active}
                        {time}
                        {distance}
                        {toolInfo}
                        {goToButton}
                    </Menu>
                );
                break;
            case 'tolerance':
                let tolType = entity.toleranceType[0].toUpperCase() + entity.toleranceType.slice(1);
                properties = (
                    <Menu className='properties'>
                        {active}
                        <MenuItem disabled key='tolType' className='property'>
                            <div className={getIcon('tolerance type')}/>
                            Type: {tolType} Tolerance
                        </MenuItem>
                        <MenuItem disabled key='tolValue' className='property'>
                            <div className={getIcon('tolerance value')}/>
                            Value: {entity.value}{entity.unit}
                        </MenuItem>
                        {hasWorkingsteps ?
                            <MenuItem disabled key='workingsteps' className='property children workingsteps'>
                                <div className='title'>
                                    Used in Workingsteps:
                                </div>
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
            case 'workplan':
            case 'workplan-setup':
            case 'selective':
                properties = (
                    <Menu className='properties'>
                        {time}
                        {distance}
                        {hasChildren ?
                            <MenuItem disabled key='children' className='property children'>
                                <div className='title'>Children:</div>
                                <div className='list'>
                                    {entity.children.map(this.renderNode)}
                                </div>
                            </MenuItem>
                        :
                            <MenuItem disabled key='children' className='property children'>
                                <div className='title'>No Children</div>
                            </MenuItem>
                        }
                    </Menu>
                );
                break;
            case 'tool':
                properties = (
                    <Menu className='properties'>
                        {hasWorkingsteps ? 
                            <MenuItem disabled key='workingsteps' className='property children workingsteps'>
                                <div className='title'>
                                    Used in Workingsteps:
                                </div>
                                <div className='list'>
                                    {entity.workingsteps.map(this.renderNode)}
                                </div>
                            </MenuItem>
                        : 
                            <MenuItem disabled key='workingsteps' className='property children workingsteps'>
                                <div className='title'>
                                    Not used in any workingsteps.
                                </div>
                            </MenuItem>
                        }
                    </Menu>
                );
                break;
            default:
                properties = (
                    <Menu className='properties'>
                        <MenuItem disabled className='property'>
                            No information available
                        </MenuItem>
                    </Menu>
                );
        }

        return properties;
    }

    render() {
        let entity = this.props.entity;
        let entityName = ''
        let entityType = '';
        let paneName = 'properties-pane';
        let titleIcon = '';
        
        if (entity !== null) {
            entityName = entity.name;
            entityType = entity.type[0].toUpperCase() + entity.type.slice(1);
            paneName += ' visible';
            if (entity.type === 'tolerance') {
                titleIcon = getIcon(entity.type, entity.toleranceType);
            } else {
                titleIcon = getIcon(entity.type);
            }
        }

        return (
            <div className={paneName}>
                <div className='titlebar'>
                    <span className={titleIcon} />
                    <span className='title'>
                        <div className='type'>{entityType}</div>
                        <div className='name'>{entityName}</div>
                    </span>
                    <span 
                        className={getIcon('exit')}
                        onClick={(event) => {this.props.propertiesCb(null);}}
                    />
                </div>
                {this.renderProperties(entity)}
            </div>
        );
    }
}
