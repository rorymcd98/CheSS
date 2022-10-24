const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
	mode: 'production',
	watch: false,
	entry: {app: path.resolve(__dirname,'src/js/main.js'),
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].[contenthash].js',
		chunkFilename: '[id].[contenthash].js'
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
	plugins: [	new MonacoWebpackPlugin({
		languages: ['css']
	}),
				new HtmlWebpackPlugin({
						hash:true,
						title: 'Project',
						template: path.resolve(__dirname,'src','html','index.ejs'),
						favicon: './src/assets/img/chess-favicon.ico',
					})
			],
	optimization: {
		minimize: true
	}
};