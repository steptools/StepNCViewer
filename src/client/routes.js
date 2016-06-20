/* Copyright G. Hemingway, 2015 - All rights reserved */
"use strict";


import React                from 'react';
import ReactDOM             from 'react-dom';
import BrowserView          from './views/browser';
import LoginView            from './views/user/login';
import RegisterView         from './views/user/register';
import ContainerView      from './views/container';
// import SidebarView           from './views/sidebar';
var qs                      = require('qs');
const queryString =         require('query-string');

/*************************************************************************/

module.exports = Backbone.Router.extend({
    routes: {
        '':                             '_landing',
        'browse':                       '_browse',
        'login':                        '_login',
        'register':                     '_register',
        'stepnc/:projectid':            '_stepnc',
        ':modelID':                     '_model',
        '*path':                        '_default',
    },
    initialize: function(options) {
        this.app = options.app;
    },

    _landing: function() {
        console.log('Landing path');
    },

    _browse: function() {
        if (this.app.config.auth && !this.app.state.user) {
            // Redirect to Login if auth required and not done
            this.navigate('login', { trigger: true });
        } else {
            ReactDOM.render(<BrowserView
                router={this}
                user={this.app.state.user}
                token={this.app.state.token}
                config={this.app.config}
                services={this.app.services}
                socket={this.app.socket}
            />, document.getElementById('primary-view'));
        }
    },

    _login: function() {
        if (this.app.config.auth && !this.app.state.user) {
            ReactDOM.render(<LoginView
                router={this}
                dispatcher={this.app}
                twoFactor={this.app.config.two_factor}
            />, document.getElementById('primary-view'));
        } else {
            // No login needed, go to Browse
            this.navigate('browse', { trigger: true });
        }
    },

    _register: function() {
        if (this.app.config.auth && !this.app.state.user) {
            ReactDOM.render(<RegisterView
                router={this}
            />, document.getElementById('primary-view'));
        } else {
            // No login needed, go to Browse
            this.navigate('browse', { trigger: true });
        }
    },

    _model: function(modelID, query) {
        if (this.app.config.auth && !this.app.state.user) {
            // Redirect to Login if auth required and not done
            this.navigate('login', { trigger: true });
        } else {
            query = queryString.parse(query);
            let self = this;
            // Render the root CAD view
            ReactDOM.render(<CADView
                manager={this.app.cadManager}
                viewContainerId='primary-view'
                root3DObject={this.app._root3DObject}
            />, document.getElementById('primary-view'), function () {
                // Dispatch setModel to the CADManager
                self.app.cadManager.dispatchEvent({
                    type: 'setModel',
                    path: modelID,
                    baseURL: self.app.services.api_endpoint + self.app.services.version,
                    modelType: query.type
                });
            });
        }
    },

    _stepnc: function(pid){
        var self = this;
<<<<<<< HEAD
      ReactDOM.render(
        <div style={{height:'100%'}}>
      <ContainerView
        app={this.app}
        pid={pid}
        />
        </div>
      , document.getElementById('primary-view'), function () {
    // Dispatch setModel to the CADManager
      });
  pid = 'projects/' + pid;
  this.app.cadManager.dispatchEvent({
          type: 'setModel',
          path: pid,
          baseURL: this.app.services.api_endpoint + this.app.services.version,
          modelType: 'nc'
      })
=======
        
        let xhr = new XMLHttpRequest();
        
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    let projectList = JSON.parse(xhr.responseText);
                    
                    if (projectList[pid] !== undefined) {
                        // project exists, render view
                        ReactDOM.render(
                        <div style={{ height:'100%'}}>
                            <ContainerView
                                app = {self.app }
                                pid = {pid}
                                />
                        </div>
                        , document.getElementById('primary-view'), function () {
                            // Dispatch setModel to the CADManager
                        });
                         
                        pid = 'projects/' + pid;
                        self.app.cadManager.dispatchEvent({
                            type: 'setModel',
                            path: pid + '/state/key',
                            baseURL: self.app.services.api_endpoint + self.app.services.version,
                            modelType: 'nc'
                        });
                        
                    }
                    else {
                        // display an error message
                        ReactDOM.render(
                            <div style={{width:'100%'}}>
                                <h1>Error 404: project '{pid}' not found.</h1>
                            </div>
                        , document.getElementById('primary-view'), function() {});            
                    }
                }
            }
        };

        let url = "/v2/nc/projects/";
        xhr.open("GET", url, true);
        xhr.send(null);
>>>>>>> master
    },

    /************** Default Route ************************/

    _default: function(path) {
        console.log('Landed on default path ' + path);
    }
});
