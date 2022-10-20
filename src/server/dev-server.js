const express = require("express");

const app = express();

const webpack = require("webpack");
const config = require("../../webpack.config.js");
const compiler = webpack(config);

const webpackDevMiddleware =
require("webpack-dev-middleware")(
    compiler,
    {
        publicPath: '/'
    }
)

const webpackHotMiddleware =
require("webpack-hot-middleware")(compiler)

app.use(webpackDevMiddleware)
app.use(webpackHotMiddleware)

const staticMiddleware = express.static("dist")
app.use(staticMiddleware)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const {main} = require('./production-server');
main(app);