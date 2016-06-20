import React from 'react';

export default class LoadProjectView extends React.Component {
  constructor(){
    super();
    this.state = {projects: []};

    this.handleProjectSelected = this.handleProjectSelected.bind(this);
  }

  componentDidMount(){
    this.props.socket.on("projects", (projects) => {
      this.setState({
        projects: projects
      });
    });
    this.props.socket.emit("req:projects");
  }

  handleProjectSelected(projectId){
    return (event => {
      this.props.actionManager.emit("project-selected", projectId);
      this.props.app.cadManager.dispatchEvent({
          type: 'setModel',
          path: projectId,
          baseURL: this.props.app.services.api_endpoint + this.props.app.services.version,
          modelType: 'nc'
      });
    }).bind(this);
  }

  render(){
    return (
      <div className='load-projects'>
        {this.state.projects.map((project, i) => {
          return <div onClick={this.handleProjectSelected(project.id)} className='project'>
            <span className='glyphicons glyphicons-file'/>
            <span className='project-id'>{project.name}</span>
            {project.hasCadjs ? <span className='icon-word'>CadJS</span> : null}
            {project.hasModel ? <span className='icon-word'>Model</span> : null}
          </div>;
        })}
      </div>
    );
  }
}
