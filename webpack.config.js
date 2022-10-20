const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require("webpack");
const path = require('path');

module.exports = {
	mode: 'development',
	watch: true,
	entry: {app: path.resolve(__dirname,'src/js/main.js'),
			// hot: 'webpack/hot/dev-server.js',
			// client: 'webpack-dev-server/client/index.js?hot=true&live-reload=true'
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].[hash:8].js',
		sourceMapFilename: '[name].[hash:8].map',
		chunkFilename: '[id].[hash:8].js'
	},
	devServer: {
		static: path.resolve(__dirname,'dist'),
		overlay: true,
		watch: true,
		hot: false,
		client: false
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
				  loader: 'babel-loader',
				  options: {
					presets: ['@babel/preset-env']
				  }
				}
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			},
			{
				test: /\.ttf$/,
				use: ['file-loader']
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: 'asset/resource',
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/i,
				type: 'asset/resource',
			}
		]
	},
	plugins: [	new MonacoWebpackPlugin(),
				new HtmlWebpackPlugin({
						hash:true,
						title: 'Project',
						template: path.resolve(__dirname,'src','html','index.ejs'),
						favicon: './src/assets/img/chess-favicon.ico',
					}),
				new webpack.HotModuleReplacementPlugin()
			]
};