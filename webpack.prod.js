const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require("webpack");
const path = require('path');

module.exports = {
	mode: 'production',
	watch: false,
	devtool: 'source-map',
	entry: {app: path.resolve(__dirname,'src/js/main.js'),
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].[contenthash].js',
		sourceMapFilename: '[name].[contenthash].map',
		chunkFilename: '[id].[contenthash].js'
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
				type: 'asset/resource'
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
			],
	optimization: {
		runtimeChunk: 'single',
		},
};