import {cssTurnHandler} from "./valid-move-checker.js"
import {initEditor, getCss} from "./editor.js"
import {DefaultBoard, TurnList} from "./turn-list.js"
import {factoryRenderBoard} from "./board-rendering.js"
import io from "socket.io-client";
import "../css/main-styles.css"

//Global gameData vars are: playerId, multiplayer, roomId, gameTurnList
window.gameData = {};
const gameSocket = io('http://localhost:3000/');
const renderBoard = factoryRenderBoard(gameSocket);
initEditor(initMain);

function initMain(){
    //---websockets---
    //Logs all socket errors
    gameSocket.on('err', (data)=>{
        console.log(data.errMessage);
    })

    gameSocket.on('clientNewGame',()=>{
        newGame();
    })

    //Assigns a playerId if they don't have one in cookies
    const playerIdTextEle = document.getElementById('player-id-text');
    gameSocket.on('clientAssignPlayer',(data)=>{
        window.gameData.playerId = data.playerId;
        playerIdTextEle.innerText = gameData.playerId;
        setCookie('playerId', gameData.playerId, 7);
    })

    //Updates the rendering of rooms if a room is created or joined by another player
    const roomList = document.getElementById('room-list-container');
    gameSocket.on('clientViewRooms', (rooms)=>{
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
        joinRoomButton.innerText = `Room #${roomId} (${playerCount}/2)`;
        joinRoomButton.classList.add('join-room-button');

        joinRoomButton.addEventListener('click', ()=>{
            const resData = {};
            resData.roomId = roomId;
            resData.playerId = gameData.playerId;

            gameSocket.emit('joinRoom', resData);
        })
        roomList.appendChild(joinRoomButton);
    }

    //Creates a room - if the server allows this then the player is also forced to join
    const createRoomButton = document.getElementById('create-room-button');
    createRoomButton.addEventListener('click', ()=>{
        newGame();
        gameSocket.emit('createRoom',{currentTurn: gameData.gameTurnList.current, playerId: gameData.playerId});
    })

    //Connect the client to the game, and set the roomId (for socket) and player colour
    const playerColTextEle = document.getElementById('player-col-text')
    const roomIdTextEle = document.getElementById('room-id-text');
    gameSocket.on('clientJoinGame', (data)=>{
        playerColTextEle.innerText = data.isWhite ? 'White' : 'Black';
        roomIdTextEle.innerText = data.roomId;
        window.gameData.roomId = data.roomId;
        window.gameData.playerIsWhite = data.isWhite;
        const curTurn = data.clientCurrentTurn;
        roomList.style.display = "none";    

        gameData.gameTurnList.appendTurn(curTurn.boardState, curTurn.isWhiteTurn, curTurn.cssText)
        renderBoard(curTurn.boardState, curTurn.isWhiteTurn, curTurn.cssText, gameData.playerIsWhite);
    })

    //Sets the game to local mode (can now play as black and white), also hides any multiplayer info
    const playLocalButton = document.getElementById('play-local-button');
    playLocalButton.addEventListener('click', ()=>{
        setMultiplayer(false);
        roomList.style.display = "none";
    })

    //Brings up the games list and sets the game to multiplayer mode
    const viewGamesButton = document.getElementById('view-games-button');
    viewGamesButton.addEventListener('click', ()=>{
        setMultiplayer(true);
        roomList.style.display = "block";
    })
    function setMultiplayer(setVal){
        window.gameData.multiplayer = setVal;
        const displayValue = setVal ? 'block' : 'none';
        playerIdTextEle.style.display = displayValue;
        playerColTextEle.style.display = displayValue;
        roomIdTextEle.style.display = displayValue;
        
        undoButton.disabled = setVal;
        redoButton.disabled = setVal;
        undoButton.style.opacity = setVal ? '50%':"100%";
        redoButton.style.opacity = setVal ? '50%':"100%";
        if(!setVal){submitCssButton.style.opacity = "100%"}
    }

    //Render a board when the opponent makes a move
    gameSocket.on('clientMove',(data)=>{
        renderBoard(data.boardState, data.isWhiteTurn, data.cssText, gameData.playerIsWhite);
        gameData.gameTurnList.appendTurn(data.boardState, data.isWhiteTurn, data.cssText);
    })

    gameSocket.on('clientCheckmate', (data)=>{
        console.log('client here')
        const checkmateOverlay = document.getElementById('checkmate-overlay');
        const checkmateText = document.getElementById('checkmate-text');
        
        checkmateText.innerText = `Checkmate, ${data.winnerCol} wins!`
        checkmateOverlay.style.display = 'block';
    })

    //---buttons---
    //Create the event listeners for buttons
    
    const newGameButton = document.getElementById("new-game-button");
    newGameButton.addEventListener('click', ()=>{
        newGame();
        if(gameData.multiplayer){gameSocket.emit('newGame', {roomId: gameData.roomId})};
    });
    const playAgainButton = document.getElementById("play-again-button");
    playAgainButton.addEventListener('click', ()=>{
        newGame();
        if(gameData.multiplayer){gameSocket.emit('newGame', {roomId: gameData.roomId})};
    });


    //Renders a new board from white's perspective, sets the global turnlist variable
    function newGame(){
        const defaultBoardState = new DefaultBoard();
        const defaultEditorText = "/*Here are the white pieces [\u2659,\u2656,\u2658,\u2657,\u2654,\u2655]*/\n/*Here are the black pieces [\u265F,\u265C,\u265E,\u265D,\u265A,\u265B]*/\n";
        renderBoard(defaultBoardState, true, defaultEditorText, gameData.playerIsWhite);
        gameData.gameTurnList = new TurnList(defaultBoardState, true, defaultEditorText);
        const checkmateOverlay = document.getElementById('checkmate-overlay');
        checkmateOverlay.style.display = 'none';
    }

    //Undo (local only)
    const undoButton = document.getElementById("undo-button");
    undoButton.addEventListener('click', ()=>{
        const [undoBoard, undoTurn, undoCssText] = gameData.gameTurnList.undo();
        if (undoBoard !== null){
            renderBoard(undoBoard, undoTurn, undoCssText, gameData.playerIsWhite);
        }
    });

    //Redo (local only)
    const redoButton = document.getElementById("redo-button");
    redoButton.addEventListener('click', ()=>{
        const [redoBoard, redoTurn, redoCssText] = gameData.gameTurnList.redo();
        if (redoBoard != null){
            renderBoard(redoBoard, redoTurn, redoCssText, gameData.playerIsWhite);
        }
    });

    //Interprets the current CSS to make changes to the board state, appends this as a turn in the turn list
    const submitCssButton = document.getElementById("submit-css-button");
    submitCssButton.addEventListener('click', ()=>{
        const currentCssText = gameData.gameTurnList.current.cssText;
        const currentBoardState = structuredClone(gameData.gameTurnList.current.boardState);
        const currentIsWhiteTurn = gameData.gameTurnList.current.isWhiteTurn;
        if (gameData.multiplayer && currentIsWhiteTurn !== gameData.playerIsWhite){console.log('Not your turn!'); return false}

        const [isValidCssMove, nextBoardState] = cssTurnHandler(currentBoardState, currentIsWhiteTurn, currentCssText);
        if (isValidCssMove){
            const nextIsWhiteTurn = !currentIsWhiteTurn;
            const nextCssText = getCss();
            renderBoard(nextBoardState, nextIsWhiteTurn, nextCssText, gameData.playerIsWhite);
            gameData.gameTurnList.appendTurn(nextBoardState, nextIsWhiteTurn, nextCssText);
            if(gameData.multiplayer){gameSocket.emit('move', {roomId: gameData.roomId, boardState: nextBoardState, isWhiteTurn: nextIsWhiteTurn, cssText: nextCssText})};
        }
    });



    //Create the board
    setMultiplayer(true);
    newGame();
}

//Sets cookie (helper)
//From https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}