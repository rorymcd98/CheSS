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

const server = require('http').Server(app)
const io = require('socket.io')(server);
io.on('connection', (socket)=>{
    setInterval(() => {
        io.emit('test',{
            some: 'info'
        })
    }, 5000);
});

server.listen(3000, ()=>{
    console.log('Server is listening')
})


// const express = require('express');
// const path = require('path');

// const app = express();
// const server = require('http').Server(app);
// const io = require('socket.io')(server);

// let rooms = 0;

// app.use(express.static(__dirname + '/dist'));

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });


// server.listen(process.env.PORT || 3000);