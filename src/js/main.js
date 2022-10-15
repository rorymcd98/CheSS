import {pieceTurnHandler, cssTurnHandler, highlightSquares} from "./valid-move-checker.js"
import {initEditor, getCss, setCss} from "./editor.js"
import {DefaultBoard, TurnList} from "./turn-handler.js"
import "../css/main-styles.css"
import io from "socket.io-client";
//Cookie functions from https://www.w3schools.com/js/js_cookies.asp
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

//ws stuff below

//shim - eventually only set to true if joining a game, set to false if the player selects local
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

    function renderTurn(boardState, isWhiteTurn = true, cssText = null, whitePerspective = true){
        let exists = document.getElementById('board');
        if (exists){exists.remove()}
        const boardElement = document.createElement("table");
        boardElement.className = "board";
        boardElement.id = "board";
        const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
        const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
        if (isWhiteTurn){
            whiteTurnIndicatorEle.setAttribute('data-isWhiteTurn', "");
            blackTurnIndicatorEle.setAttribute('data-isWhiteTurn', "");
        } else {
            whiteTurnIndicatorEle.removeAttribute('data-isWhiteTurn');
            blackTurnIndicatorEle.removeAttribute('data-isWhiteTurn');
        }

        //Create the board as a table element
        for(let rankCount=0; rankCount<8; rankCount++){
            let rankNum = rankCount;
            if(!whitePerspective){rankNum = 7 - rankCount};
            let rank = document.createElement('tr');
            rank.dataset.rank = rankNum;
            for(let fyleCount=0; fyleCount<8; fyleCount++){
                let fyleNum = fyleCount;
                if(!whitePerspective){fyleNum = 7 - fyleCount};
                let squareEle = document.createElement('td');
                squareEle.dataset.fyle = fyleNum;
                squareEle.dataset.rank = rankNum;
                squareEle.className = (fyleNum%2 === rankNum%2) ? 'light square' : 'dark square';
                if(!(boardState.ranks.includes(rankNum)) || !(boardState.fyles.includes(fyleNum))){
                    squareEle.style.display = 'none';
                }
                rank.appendChild(squareEle);
                
                //Create a piece on the square if one exists
                const pieceObj = boardState[rankNum][fyleNum].piece;
                if (pieceObj){
                    const pieceElement = document.createElement('text');
                    pieceElement.classList.add('piece', 'draggable', pieceObj.col, pieceObj.type);
                    pieceElement.setAttribute('draggable', true);
                    if(pieceObj.properties.bold){pieceElement.setAttribute('bold','')};
                    if(pieceObj.properties.big){pieceElement.setAttribute('big','')};
                    if(pieceObj.properties.ghost){pieceElement.setAttribute('ghost','')};
                    pieceElement.id = pieceObj.objectId;
                    squareEle.appendChild(pieceElement);     
                }
            }
            rank.hasChildNodes() && boardElement.appendChild(rank);
        };

        document.getElementById("board-container").appendChild(boardElement);

        //Render the board legend, also a draggable element
        const fyles = {0:'A', 1:'B', 2:'C', 3:'D', 4:'E', 5:'F', 6:'G', 7:'H'};
        let topLegend = document.createElement('tr');
        let bottomLegend = document.createElement('tr');
        for(let fyleCount=0; fyleCount<9; fyleCount++){
            let fyleNum = fyleCount;
            if(!whitePerspective){fyleNum = 8 - fyleCount};
            const legend = document.createElement('td');
            legend.innerText = fyles[fyleNum];
            legend.classList.add('legend', 'draggable');
            legend.setAttribute('draggable', true);
            legend.dataset.legFyle = fyleNum;
            if(!(boardState.fyles.includes(fyleNum))){
                legend.style.display = 'none';
            }
            topLegend.append(legend);
            bottomLegend.append(legend.cloneNode(true));
        };

        boardElement.insertBefore(topLegend, boardElement.firstChild);
        boardElement.appendChild(bottomLegend);
        for(let rankCount=-1; rankCount<9; rankCount++){
            const row = boardElement.children[rankCount+1];
            const legend = document.createElement('td');
            if(rankCount >= 0 && rankCount < 8){
                let rankNum = rankCount;
                if(!whitePerspective){rankNum = 7 - rankCount};
                legend.classList.add('legend', 'draggable');
                legend.setAttribute('draggable', true);
                legend.innerText = 8-rankNum;
                legend.dataset.legRank = rankNum;
                if(!(boardState.ranks.includes(rankNum))){
                    legend.style.display = 'none';
                }
            } else {legend.classList.add('legend', 'corner')}
            row.insertBefore(legend, row.firstChild);
            row.appendChild(legend.cloneNode(true));
        };


        //Updates the editor text
        cssText = cssText ? cssText:defaultEditorText;
        setCss(cssText)

        //Attach drag event listeners to draggables (pieces, legend)
        const draggables = document.querySelectorAll('.draggable');
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                draggable.classList.add('dragging');
            })
        
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
            })
        })
        
        //Attach dragover & drop event listeners to squares 
        const squares = document.querySelectorAll('.square')
        squares.forEach(square => {
            square.addEventListener('dragover', (e)=>{
                e.preventDefault();
            })
        })

        //Attach mouseover & mouseout event listeners for pieces for visualising potential moves
        const pieces = document.querySelectorAll('.piece')
        pieces.forEach(piece => {
            piece.addEventListener('mouseover', ()=>{
                const fromFyle = Number(piece.parentElement.getAttribute('data-fyle'));
                const fromRank = Number(piece.parentElement.getAttribute('data-rank'));
                const currentBoardState = window.gameTurnList.current.boardState;
                const hoverPiece = currentBoardState[fromRank][fromFyle].piece;
                const pieceCol = hoverPiece.col;
                highlightSquares(fromFyle, fromRank, hoverPiece, currentBoardState, pieceCol);
            })
        })
        pieces.forEach(piece => {
            piece.addEventListener('mouseout', ()=>{
                const eles = document.querySelectorAll('.validMove');
                eles.forEach((ele)=>ele.classList.remove('validMove'))
                
            })
        })
        
        squares.forEach(square => {
            square.addEventListener('drop', (e)=>{
                e.preventDefault();
                const draggedPiece = document.querySelector('.dragging');
                if(!draggedPiece.classList.contains('piece')){console.log("That's not a piece!"); return false};
                const fromSquare = draggedPiece.parentElement;
                const fromFyle = Number(fromSquare.getAttribute('data-fyle'));
                const fromRank = Number(fromSquare.getAttribute('data-rank'));
                const toFyle = Number(square.getAttribute('data-fyle'));
                const toRank = Number(square.getAttribute('data-rank'));
                const boardState = window.gameTurnList.current.boardState;
                const isWhiteTurn = window.gameTurnList.current.isWhiteTurn;
                const curPiece = boardState[fromRank][fromFyle].piece;
                if (window.multiplayer && isWhiteTurn !== window.playerIsWhite){console.log('Not your turn!'); return false}

                const [isValidMove, isCheckmate] = pieceTurnHandler(fromFyle, fromRank, toFyle, toRank, curPiece, boardState, isWhiteTurn);
                if (isValidMove){
                    const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
                    const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
                    whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                    blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');

                    const nextBoardState = structuredClone(boardState);
                    nextBoardState[toRank][toFyle].piece = nextBoardState[fromRank][fromFyle].piece;
                    nextBoardState[toRank][toFyle].piece.unmoved = false;
                    nextBoardState[fromRank][fromFyle].piece = null;
                    const nextCssText = window.gameTurnList.current.cssText;
                    setCss(nextCssText);
                    const nextIsWhiteTurn = isWhiteTurn?false:true
                    window.gameTurnList.appendTurn(nextBoardState, nextIsWhiteTurn, nextCssText);
                    
                    if(window.multiplayer){socket.emit('move', {roomId: window.roomId, boardState: nextBoardState, isWhiteTurn: nextIsWhiteTurn, cssText: nextCssText})};

                    if (square.hasChildNodes()){
                        square.removeChild(square.firstChild);
                    }
                    square.appendChild(draggedPiece);
                    if (isCheckmate){
                        //
                    }
                }
            })
        })    
    }
}
