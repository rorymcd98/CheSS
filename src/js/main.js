import {cssTurnHandler} from "./valid-move-checker.js"
import {initEditor, getCss} from "./editor.js"
import {DefaultBoard, TurnList} from "./turn-list.js"
import {factoryRenderBoard} from "./board-rendering.js"
import io from "socket.io-client";
import "../css/main-styles.css"



import {setCss} from "./editor.js"
import {pieceTurnHandler, highlightSquares} from "./valid-move-checker.js"

//ws stuff below
window.gameData = {};
window.gameData.multiplayer = true;
const gameSocket = io('http://localhost:3000/');
const renderBoard = factoryRenderBoard(gameSocket);
initEditor(initMain);

function initMain(){
    //Logs all socket errors
    gameSocket.on('err', (data)=>{
        console.log(data.errMessage);
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
    }

    //Player chess actions
    gameSocket.on('clientMove',(data)=>{
        renderBoard(data.boardState, data.isWhiteTurn, data.cssText, gameData.playerIsWhite);
        gameData.gameTurnList.appendTurn(data.boardState, data.isWhiteTurn, data.cssText);
    })

    gameSocket.on('clientNewGame',()=>{
        newGame();
    })

    //Create the event listeners for buttons
    const newGameButton = document.getElementById("new-game-button");
    newGameButton.addEventListener('click', ()=>{
        newGame();
        gameSocket.emit('newGame', {roomId: gameData.roomId})
    });

    //Renders a new board from white's perspective, sets the global turnlist variable
    function newGame(){
        const defaultBoardState = new DefaultBoard();
        const defaultEditorText = "/*Here are the white pieces [\u2659,\u2656,\u2658,\u2657,\u2654,\u2655]*/\n/*Here are the black pieces [\u265F,\u265C,\u265E,\u265D,\u265A,\u265B]*/\n";
        renderBoard(defaultBoardState, true, defaultEditorText, gameData.playerIsWhite);
        gameData.gameTurnList = new TurnList(defaultBoardState, true, defaultEditorText);
    }

    const undoButton = document.getElementById("undo-button");
    undoButton.addEventListener('click', ()=>{
        const [undoBoard, undoTurn, undoCssText] = gameData.gameTurnList.undo();
        if (undoBoard !== null){
            renderBoard(undoBoard, undoTurn, undoCssText, gameData.playerIsWhite);
        }
    });

    const redoButton = document.getElementById("redo-button");
    redoButton.addEventListener('click', ()=>{
        const [redoBoard, redoTurn, redoCssText] = gameData.gameTurnList.redo();
        if (redoBoard != null){
            renderBoard(redoBoard, redoTurn, redoCssText, gameData.playerIsWhite);
        }
    });

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

    //Create
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

// function renderBoard(boardState, isWhiteTurn = true, cssText, whitePerspective = true){
//     //fyle = file ... avoids confusion with file-system
    
//     let exists = document.getElementById('board');
//     if (exists){exists.remove()}


//     const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
//     const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
//     if (isWhiteTurn){
//         whiteTurnIndicatorEle.setAttribute('data-isWhiteTurn', "");
//         blackTurnIndicatorEle.setAttribute('data-isWhiteTurn', "");
//     } else {
//         whiteTurnIndicatorEle.removeAttribute('data-isWhiteTurn');
//         blackTurnIndicatorEle.removeAttribute('data-isWhiteTurn');
//     }

//     //Create the board as a table element
//     const boardElement = document.createElement("table");
//     boardElement.className = "board";
//     boardElement.id = "board";

//     for(let rankCount=0; rankCount<8; rankCount++){
//         let rankNum = rankCount;
//         if(!whitePerspective){rankNum = 7 - rankCount};

//         let rank = document.createElement('tr');
//         rank.dataset.rank = rankNum;
//         for(let fyleCount=0; fyleCount<8; fyleCount++){
//             let fyleNum = fyleCount;
//             if(!whitePerspective){fyleNum = 7 - fyleCount};
            
//             let squareEle = document.createElement('td');
//             squareEle.dataset.fyle = fyleNum;
//             squareEle.dataset.rank = rankNum;
//             squareEle.className = (fyleNum%2 === rankNum%2) ? 'light square' : 'dark square';
            
//             //If the boardstate is missing a rank or fyle don't render the square
//             if(!(boardState.ranks.includes(rankNum)) || !(boardState.fyles.includes(fyleNum))){
//                 squareEle.style.display = 'none';
//             }
//             rank.appendChild(squareEle);
            
//             //Create a piece on the square if one exists
//             const pieceObj = boardState[rankNum][fyleNum].piece;
//             if (pieceObj){
//                 const pieceElement = document.createElement('text');
//                 pieceElement.classList.add('piece', 'draggable', pieceObj.col, pieceObj.type);
//                 pieceElement.setAttribute('draggable', true);
//                 if(pieceObj.properties.bold){pieceElement.setAttribute('bold','')};
//                 if(pieceObj.properties.big){pieceElement.setAttribute('big','')};
//                 if(pieceObj.properties.ghost){pieceElement.setAttribute('ghost','')};
//                 pieceElement.id = pieceObj.objectId;
//                 squareEle.appendChild(pieceElement);     
//             }
//         }
        
//         //Only render the rank if it has any squares
//         rank.hasChildNodes() && boardElement.appendChild(rank);
//     };
//     document.getElementById("board-container").appendChild(boardElement);

//     //Render the board legend, also a draggable element
//     const fyles = {0:'A', 1:'B', 2:'C', 3:'D', 4:'E', 5:'F', 6:'G', 7:'H'};
//     let topLegend = document.createElement('tr');
//     let bottomLegend = document.createElement('tr');
//     for(let fyleCount=0; fyleCount<9; fyleCount++){
//         let fyleNum = fyleCount;
//         if(!whitePerspective){fyleNum = 8 - fyleCount};

//         const legend = document.createElement('td');
//         legend.innerText = fyles[fyleNum];
//         legend.classList.add('legend', 'draggable');
//         legend.setAttribute('draggable', true);
//         legend.dataset.legFyle = fyleNum;

//         if(!(boardState.fyles.includes(fyleNum))){
//             legend.style.display = 'none';
//         }
//         topLegend.append(legend);
//         bottomLegend.append(legend.cloneNode(true));
//     };

//     boardElement.insertBefore(topLegend, boardElement.firstChild);
//     boardElement.appendChild(bottomLegend);
//     for(let rankCount=-1; rankCount<9; rankCount++){
//         const row = boardElement.children[rankCount+1];
//         const legend = document.createElement('td');

//         if(rankCount >= 0 && rankCount < 8){
//             let rankNum = rankCount;
//             if(!whitePerspective){rankNum = 7 - rankCount};
//             legend.classList.add('legend', 'draggable');
//             legend.setAttribute('draggable', true);
//             legend.innerText = 8-rankNum;
//             legend.dataset.legRank = rankNum;
//             if(!(boardState.ranks.includes(rankNum))){
//                 legend.style.display = 'none';
//             }
//         } else {legend.classList.add('legend', 'corner')}
//         row.insertBefore(legend, row.firstChild);
//         row.appendChild(legend.cloneNode(true));
//     };

//     //Updates the editor text
//     setCss(cssText)

//     //Attach drag event listeners to draggables (pieces, legend)
//     const draggables = document.querySelectorAll('.draggable');
//     draggables.forEach(draggable => {
//         draggable.addEventListener('dragstart', (e) => {
//             draggable.classList.add('dragging');
//         })
    
//         draggable.addEventListener('dragend', () => {
//             draggable.classList.remove('dragging');
//         })
//     })

//     //Attach mouseover & mouseout event listeners for pieces for visualising potential moves
//     const pieces = document.querySelectorAll('.piece')
//     pieces.forEach(piece => {
//         piece.addEventListener('mouseover', ()=>{
//             const fromFyle = Number(piece.parentElement.getAttribute('data-fyle'));
//             const fromRank = Number(piece.parentElement.getAttribute('data-rank'));
//             const currentBoardState = window.gameData.gameTurnList.current.boardState;
//             const hoverPiece = currentBoardState[fromRank][fromFyle].piece;
//             const pieceCol = hoverPiece.col;
//             highlightSquares(fromFyle, fromRank, hoverPiece, currentBoardState, pieceCol);
//         })
//     })
    
//     pieces.forEach(piece => {
//         piece.addEventListener('mouseout', ()=>{
//             const eles = document.querySelectorAll('.validMove');
//             eles.forEach((ele)=>ele.classList.remove('validMove'))
            
//         })
//     })

//     //Attach dragover & drop event listeners to squares 
//     const squares = document.querySelectorAll('.square')
//     squares.forEach(square => {
//         square.addEventListener('dragover', (e)=>{
//             e.preventDefault();
//         })
//     })
    
//     squares.forEach(square => {
//         square.addEventListener('drop', (e)=>{
//             e.preventDefault();
//             const draggedPiece = document.querySelector('.dragging');
//             if(!draggedPiece.classList.contains('piece')){console.log("That's not a piece!"); return false};
//             const fromSquare = draggedPiece.parentElement;
//             const fromFyle = Number(fromSquare.getAttribute('data-fyle'));
//             const fromRank = Number(fromSquare.getAttribute('data-rank'));
//             const toFyle = Number(square.getAttribute('data-fyle'));
//             const toRank = Number(square.getAttribute('data-rank'));
//             const boardState = window.gameData.gameTurnList.current.boardState;
//             const isWhiteTurn = window.gameData.gameTurnList.current.isWhiteTurn;
//             const curPiece = boardState[fromRank][fromFyle].piece;

//             if (window.gameData.multiplayer && isWhiteTurn !== window.gameData.playerIsWhite){console.log('Not your turn!'); return false}

//             const [isValidMove, isCheckmate] = pieceTurnHandler(fromFyle, fromRank, toFyle, toRank, curPiece, boardState, isWhiteTurn);
//             if (isValidMove){
//                 whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
//                 blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');

//                 const nextBoardState = structuredClone(boardState);
//                 nextBoardState[toRank][toFyle].piece = nextBoardState[fromRank][fromFyle].piece;
//                 nextBoardState[toRank][toFyle].piece.unmoved = false;
//                 nextBoardState[fromRank][fromFyle].piece = null;

//                 const nextCssText = window.gameData.gameTurnList.current.cssText;
//                 setCss(nextCssText);
//                 const nextIsWhiteTurn = isWhiteTurn?false:true
//                 window.gameData.gameTurnList.appendTurn(nextBoardState, nextIsWhiteTurn, nextCssText);
                
//                 if(window.gameData.multiplayer){gameSocket.emit('move', {roomId: window.gameData.roomId, boardState: nextBoardState, isWhiteTurn: nextIsWhiteTurn, cssText: nextCssText})};

//                 if (square.hasChildNodes()){
//                     square.removeChild(square.firstChild);
//                 }
//                 square.appendChild(draggedPiece);
//                 if (isCheckmate){
//                     //
//                 }
//             }
//         })
//     })
// }