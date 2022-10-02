//Create the monaco text editor element
export var b;
require.config({
    paths: {
        "socket.io" : "node_modules/socket.io-client/dist/socket.io"
      }
    });
    
require([ 'socket.io'],
function   ( io) {
    console.log(io);
    var socket = io('http://localhost:3000');
})    