var path                =      require("path"),
    webpack             =   require("webpack"),
    ExtractTextPlugin   = require("extract-text-webpack-plugin");
module.exports = { 
  context: process.cwd(),
  entry: {
    dependencies:[
     'react', 
     'react-dom', 
     'react-redux',
     'async',
     'bootstrap',
     'body-parser',
     'commander',
     'cookie-parser',
     'errorhandler',
     'express',
     'express-sessions',
     'jade',
     'jquery',
     'joi',
     'jsonwebtoken',
     'jstree',
     'jwt-decode',
     'lowdash',
     'method-override',
     'morgan',
     'node-sass',
     'pug',
     'qs',
     'query-string',
     'rc-menu',
     'react-tooltip',
     'react-treebeard',
     'request',
     'serve-favicon',
     'socket.io',
     'socket.io-client',
     'socket.io-express-session',
     'speakeasy',
     'superagent',
     'three',
     'webpack-sources',
     'winston'
    ],
    devdepends: [
      'babel',
      'babel-core',
      'babel-loader',
      'babel-plugin-transform-react-jsx',
      'babel-preset-es2015',
      'babel-preset-react',
      'style-loader',
      'css-loader',
      'bootstrap-webpack',
      'exports-loader',
      'file-loader',
      'extract-text-webpack-plugin',
      'imports-loader',
      'mocha',
      'node-markdown',
      'uglify-js',
      'uglify-loader',
      'url-loader',
      'webpack-glsl-loader',
      'style-loader',
      'sass-loader',
      'less'
    ]
  }, 
 
 output: { 
    filename: '[name].dll.js', 
    path: "", 
    library: '[name]', 
  }, 
  
  plugins: [ 
    new webpack.DllPlugin({ 
      name: '[name]', 
      path:  '[name].json'
    })
  ]
};