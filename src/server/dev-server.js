const express = require("express");

const app = express();

const webpack = require("webpack");
const config = require("../../webpack.dev.js");
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

const server = require('http').Server(app)
const io = require('socket.io')(server);
//Cookie functions from https://www.w3schools.com/js/js_cookies.asp
function getCookie(cname, cookieString) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(cookieString);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

//Room object for tracking room properties, and the room players
class Room{
    constructor(data){
        const playerId = data.player.playerId;
        const isWhite = data.player.isWhite;
        this.roomPlayers = {};
        this.roomPlayers[playerId] = isWhite;
        this.currentTurn = data.currentTurn;
    }
}
class Player{
    constructor(data){
        this.playerId = data.playerId;
        this.isWhite = data.isWhite;
    }
}

//Keeps track of room objects
var rooms = {}
var allPlayers = {}
function generateRoomId(){
    let roomId = Math.floor(1000 + Math.random() * 9000).toString();
    if(roomId in rooms){
        roomId = generateRoomId();
    }
    return roomId;
}

function generatePlayerId(){
    let playerId = Math.floor(100000*Math.random()).toString();
    if(playerId in allPlayers){
        playerId = generatePlayerId();
    }
    return playerId;
}

function generateIsWhite(){
    if(Math.random()>0.5){
        return false;
    } else {
        return true;
    }
}

//Clear the player from their current room (if they're in one)
function leavePrev(socket, playerId){
    const prevRoomId = allPlayers[playerId].roomId;
    if (prevRoomId !== null){
        socket.leave(prevRoomId);
        delete rooms[prevRoomId].roomPlayers[playerId];
    }
}

io.on('connection', (socket)=>{
    let playerId = getCookie('playerId', socket.handshake.headers.cookie);

    //If the player doesn't have an ID, set it
    if(playerId === ""){
        playerId = generatePlayerId();
    }
    socket.emit('clientAssignPlayer', {playerId: playerId})
    
    if(!(playerId in allPlayers)){
        allPlayers[playerId] = {roomId: null, isWhite: null}; 
    }

    //If the player does have an ID, rejoin their room
    leftRoomId = allPlayers[playerId].roomId;
    if(leftRoomId !== null){
        socket.join(leftRoomId);

        const leftRoom = rooms[leftRoomId];
        const playerIsWhite = leftRoom.roomPlayers[playerId];
        const clientCurrentTurn = leftRoom.currentTurn;

        socket.emit('clientJoinGame', {roomId: leftRoomId, isWhite: playerIsWhite, clientCurrentTurn: clientCurrentTurn});
    } else {
        socket.emit('clientViewRooms', rooms);
    }

    //Create a new game room for the one joined
    socket.on('createRoom', (data)=>{
        const currentTurn = data.currentTurn;
        const playerId = data.playerId;
        const roomId = generateRoomId();

        leavePrev(socket, playerId);

        const newPlayer = new Player({playerId: data.playerId, isWhite: generateIsWhite()});
        const newRoom = new Room({currentTurn: currentTurn, player: newPlayer});
        rooms[roomId] = newRoom;

        socket.join(roomId)
        allPlayers[playerId].roomId = roomId;
        allPlayers[playerId].isWhite = newPlayer.isWhite;
        socket.emit('clientJoinGame', {roomId: roomId, isWhite: newPlayer.isWhite, clientCurrentTurn: currentTurn});
        io.emit('clientViewRooms', rooms);
    })

    //Join a room, determine player colours
    socket.on('joinRoom', (data)=>{
        const roomId = data.roomId;
        const playerId  = data.playerId;
        const room = rooms[roomId];

        if((room !== undefined) && Object.keys(room.roomPlayers).length <2 && !(playerId in room.roomPlayers)){
            socket.join(roomId);

            //Decide which player is white
            const room = rooms[roomId];
            const roomPlayers = Object.values(room.roomPlayers);
            let playerIsWhite;
            if(roomPlayers.length === 0){
                playerIsWhite = generateIsWhite();
            } else {
                playerIsWhite = roomPlayers[0] ? false : true;
            }

            leavePrev(socket, playerId)

            //Store information about the player
            room.roomPlayers[playerId] = playerIsWhite;
            allPlayers[playerId].roomId = roomId;
            allPlayers[playerId].isWhite = playerIsWhite;
        
            const clientCurrentTurn = room.currentTurn;
            socket.emit('clientJoinGame', {roomId: roomId, isWhite: playerIsWhite, clientCurrentTurn: clientCurrentTurn});
            io.emit('clientViewRooms', rooms);
        } else {
            socket.emit('err', {errMessage: "Error joining room"})
        }
    })

    socket.on('viewRooms', ()=>{
        socket.emit('clientViewRooms', rooms);
    })

    //Broadcast a player move
    socket.on('move', (data)=>{
        const currentTurn = rooms[data.roomId].currentTurn;
        currentTurn.boardState = data.boardState;
        currentTurn.isWhiteTurn = data.isWhiteTurn;
        currentTurn.cssText = data.cssText;

        socket.broadcast.to(data.roomId).emit('clientMove', data);
    })
    socket.on('newGame', (data)=>{
        socket.broadcast.to(data.roomId).emit('clientNewGame');
    })
    socket.on('checkmate', (data)=>{
        socket.broadcast.to(data.roomId).emit('clientCheckmate', data);
    })
});

server.listen(3000, ()=>{
    console.log('CheSS app - Web socket listening');
})