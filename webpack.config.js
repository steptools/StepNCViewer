var path                =      require("path"),
    webpack             =   require("webpack"),
    ExtractTextPlugin   = require("extract-text-webpack-plugin");
    minimize            = process.argv[2] === "--minimize";

module.exports = {
    cache: true,
    debug: true,
    devtool: 'inline-source-map',
    sourceMapFileName: "[file].map",
    context: path.join(__dirname, "/src/client"),
    entry: {
        main: "./main",
        webworker: "./models/webworker"
    },
    output: {
        path: "./public/js/",
        filename: "[name].js",
        chunkFilename: "[id].js",
        sourceMapFilename: "[name].map",
        publicPath: "/js/"
    },
    module: {
        loaders: [
            { test: /bootstrap\/js\//, loader: 'imports?jQuery=jquery' },
            // required to write "require('./style.scss')"
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract("css?sourceMap!sass?sourceMap")
            },
            { 
                test: /\.(png|gif)$/,           
                loader: "url-loader?mimetype=image/[ext]" 
            },
            // required for glyphicons
            {
               test: /\.(eot|svg|ttf|woff|woff2)$/,
               loader: 'file?name=public/fonts/[name].[ext]'
            },
            // required for react jsx
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                query: {
                    presets: ['es2015', 'react']
                }
            },

            // required for GLSL support
            { test: /\.glsl$/, loader: 'webpack-glsl' }
        ]
    },
    resolve: {
        extensions: ['', '.js', '.jsx', '.scss'],
        alias: {
            underscore  : "lodash"
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
	    "React":	"react",
            "_":        "lodash",
            "$":        "jquery",
            "jQuery":   "jquery",
            "Backbone": "backbone",
            "THREE":    "three",
	    "request":  "superagent",
	    "ReactDOM": "react-dom",
	    "io":	"socket.io-client"
        })
        ,new ExtractTextPlugin("[name].css")
    ],
    
};
if(minimize){
        module.exports.plugins.push(new webpack.DefinePlugin({
                'process.env': {
            
                'NODE_ENV': JSON.stringify('production'),
            }
            }));
        module.exports.plugins.push(new webpack.optimize.DedupePlugin());
        module.exports.plugins.push(new webpack.optimize.UglifyJsPlugin({
                sourceMap: false,
                compress: {
                    sequences: true,
                    dead_code: true,
                    conditionals: true,
                    booleans: true,
                    unused: true,
                    if_return: true,
                    warnings: false,
                    join_vars: true,
                    drop_console: true
                },
                mangle: {
                    except: ['require']
                },
                output: {
                    comments: false
                } 
            }));

    }

