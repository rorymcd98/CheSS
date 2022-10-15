import {cssTurnHandler} from "./valid-move-checker.js"
import {initEditor, getCss} from "./editor.js"
import {DefaultBoard, TurnList} from "./turn-handler.js"
import {renderTurn} from "./board-rendering.js"
import "../css/main-styles.css"
import io from "socket.io-client";


//ws stuff below

window.multiplayer = true;
initEditor(initMain);

function initMain(){
    //Open websocket for multiplayer functions
    const socket = io('http://localhost:3000/');

    socket.on('err', (data)=>{
        console.log(data.errMessage);
    })

    const playerIdTextEle = document.getElementById('player-id-text');
    socket.on('clientAssignPlayer',(data)=>{
        window.playerId = data.playerId;
        playerIdTextEle.innerText = playerId;
        setCookie('playerId', playerId, 7);
    })


    const roomList = document.getElementById('room-list-container');
    //Set the lobby list to viewable, show all the rooms
    socket.on('clientViewRooms', (rooms)=>{
        const existingViewRoomButtons = document.querySelectorAll('.join-room-button');
        existingViewRoomButtons.forEach((ele)=>ele.remove())

        const roomIds = Object.keys(rooms);
        roomIds.forEach((roomId)=>{
            const playerCount = Object.keys(rooms[roomId].roomPlayers).length;
            addRoomButton(roomId, playerCount);
        })
    })

    function addRoomButton(roomId, playerCount){
        const joinRoomButton = document.createElement('button');
        joinRoomButton.innerText = `Room #${roomId} - ${playerCount}/2`;
        joinRoomButton.classList.add('join-room-button');
        joinRoomButton.id = `room-${roomId}`;
        joinRoomButton.addEventListener('click', ()=>{
            const resData = {};
            resData.roomId = roomId;
            resData.playerId = playerId;

            socket.emit('joinRoom', resData);
        })
        roomList.appendChild(joinRoomButton);
    }

    const playLocalButton = document.getElementById('play-local-button');
    playLocalButton.addEventListener('click', ()=>{
    window.multiplayer = false;
    roomList.style.display = "none";    
    })

    const viewGamesButton = document.getElementById('view-games-button');
    viewGamesButton.addEventListener('click', ()=>{
    window.multiplayer = true;
    roomList.style.display = "block";
    })


    const playerColTextEle = document.getElementById('player-col-text')
    const roomIdTextEle = document.getElementById('room-id-text');
    socket.on('clientJoinGame', (data)=>{
        playerColTextEle.innerText = data.isWhite ? 'White' : 'Black';
        roomIdTextEle.innerText = data.roomId;
        window.roomId = data.roomId;
        window.playerIsWhite = data.isWhite;
        const curTurn = data.clientCurrentTurn;
        roomList.style.display = "none";    

        window.gameTurnList.appendTurn(curTurn.boardState, curTurn.isWhiteTurn, curTurn.cssText)
        renderTurn(curTurn.boardState, curTurn.isWhiteTurn, curTurn.cssText, window.playerIsWhite);
    })

    const createRoomButton = document.getElementById('create-room-button');
    createRoomButton.addEventListener('click', ()=>{
        newGame();

        socket.emit('createRoom',{currentTurn: window.gameTurnList.current, playerId: playerId});
    })

    //Player chess actions
    socket.on('clientMove',(data)=>{
        renderTurn(data.boardState, data.isWhiteTurn, data.cssText, window.playerIsWhite);
        window.gameTurnList.appendTurn(data.boardState, data.isWhiteTurn, data.cssText);
    })

    socket.on('clientNewGame',()=>{
        newGame();
    })

    /////////////// ws stuff above


    const defaultEditorText = "/*Here are the white pieces [\u2659,\u2656,\u2658,\u2657,\u2654,\u2655]*/\n/*Here are the black pieces [\u265F,\u265C,\u265E,\u265D,\u265A,\u265B]*/\n";
    //---Create the board---
    newGame();
    //Create the event listeners for buttons
    const newGameButton = document.getElementById("new-game-button");
    newGameButton.addEventListener('click', ()=>{
        newGame();
        socket.emit('newGame', {roomId: window.roomId})
    });

    function newGame(){
        const defaultBoardState = new DefaultBoard();
        renderTurn(defaultBoardState, true, null, window.playerIsWhite);
        window.gameTurnList = new TurnList(defaultBoardState, true, defaultEditorText);
    }

    const undoButton = document.getElementById("undo-button");
    undoButton.addEventListener('click', ()=>{
        const isWhiteTurn = window.gameTurnList.current.isWhiteTurn;
        const [undoBoard, undoTurn, undoCssText] = window.gameTurnList.undo();
        if (undoBoard !== null){
            renderTurn(undoBoard, undoTurn, undoCssText, window.playerIsWhite);
        }
    });

    const redoButton = document.getElementById("redo-button");
    redoButton.addEventListener('click', ()=>{
        const [redoBoard, redoTurn, redoCssText] = window.gameTurnList.redo();
        if (redoBoard != null){
            renderTurn(redoBoard, redoTurn, redoCssText, window.playerIsWhite);
        }
    });

    const submitCssButton = document.getElementById("submit-css-button");
    submitCssButton.addEventListener('click', ()=>{
        const currentCssText = window.gameTurnList.current.cssText;
        const currentBoardState = structuredClone(window.gameTurnList.current.boardState);
        const currentIsWhiteTurn = window.gameTurnList.current.isWhiteTurn;
        if (window.multiplayer && currentIsWhiteTurn !== window.playerIsWhite){console.log('Not your turn!'); return false}

        const [isValidCssMove, nextBoardState] = cssTurnHandler(currentBoardState, currentIsWhiteTurn, currentCssText);
        if (isValidCssMove){
            const nextIsWhiteTurn = !currentIsWhiteTurn;
            const nextCssText = getCss();
            renderTurn(nextBoardState, nextIsWhiteTurn, nextCssText, window.playerIsWhite);
            window.gameTurnList.appendTurn(nextBoardState, nextIsWhiteTurn, nextCssText);
            if(window.multiplayer){socket.emit('move', {roomId: window.roomId, boardState: nextBoardState, isWhiteTurn: nextIsWhiteTurn, cssText: nextCssText})};
        }
    });
}


//Cookie functions from https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}