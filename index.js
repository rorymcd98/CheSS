const express = require('express');
const path = require('path');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

let rooms = 0;

app.use(express.static('.'));

// app.get('/loader/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'node_modules/monaco-editor/min/vs/loader.js'));
// });

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });


server.listen(process.env.PORT || 3000);