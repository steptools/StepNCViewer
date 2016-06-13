/* Copyright G. Hemingway, 2015 - All rights reserved */
"use strict";


import React                from 'react';
import ReactDOM             from 'react-dom';
import BrowserView          from './views/browser';
import LoginView            from './views/user/login';
import RegisterView         from './views/user/register';
import CADView              from './views/cad';
import HeaderView           from './views/header';
import SidebarView           from './views/sidebar';
import FooterView	    from './views/footer';
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
        ReactDOM.render(
                <div style={{height:'100%'}}>
                    <div id='cadview-container'>
                        <CADView
                        manager={this.app.cadManager}
                        viewContainerId='primary-view'
                        root3DObject={this.app._root3DObject}
                        />
                    </div>
                    <FooterView 
		      cadManager={this.app.cadManager}
		      actionManager={this.app.actionManager}
		      socket={this.app.socket}
                      />
                </div>
        , document.getElementById('primary-view'), function () {
            // Dispatch setModel to the CADManager
        });
	this.app.cadManager.dispatchEvent({
          type: 'setModel',
          path: pid,
          baseURL: this.app.services.api_endpoint + this.app.services.version,
          modelType: 'nc'
      })
    },

    /************** Default Route ************************/

    _default: function(path) {
        console.log('Landed on default path ' + path);
    }
});
