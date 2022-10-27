
import {setCss} from "./editor.js";
import {pieceTurnHandler, highlightSquares} from "./valid-move-checker.js";
import {logger} from "./logger.js";

export function factoryRenderBoard(webSocket){
const gameSocket = webSocket;
//Renders a board and attaches event listeners to everything
//Occurs when: A game is started or joined, when Submit CSS is pressed, when a multiplayer opponent makes a css/regular move
return function renderBoard(boardState, isWhiteTurn = true, cssText, whitePerspective = true){
    //fyle = file ... avoids confusion with file-system
    
    let exists = document.getElementById('board');
    if (exists){exists.remove()}


    const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
    const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
    if (isWhiteTurn){
        whiteTurnIndicatorEle.setAttribute('data-isWhiteTurn', "");
        blackTurnIndicatorEle.setAttribute('data-isWhiteTurn', "");
    } else {
        whiteTurnIndicatorEle.removeAttribute('data-isWhiteTurn');
        blackTurnIndicatorEle.removeAttribute('data-isWhiteTurn');
    }
    const submitCssButton = document.getElementById('submit-css-button');
    if(window.gameData.multiplayer){
        const myTurn = window.gameData.playerIsWhite === isWhiteTurn;
        submitCssButton.style.opacity = myTurn ? "100%" : "50%" 
    } else {
        submitCssButton.style.opacity = "100%";
    }

    //Create the board as a table element
    const boardElement = document.createElement("table");
    boardElement.className = "board";
    boardElement.id = "board";

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
            
            //If the boardstate is missing a rank or fyle don't render the square
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
        
        //Only render the rank if it has any squares
        rank.hasChildNodes() && boardElement.appendChild(rank);
    };
    const boardContainerEle = document.getElementById("board-container");
    boardContainerEle.style.transform = `translate(-50%) rotate(${boardState.rotation}deg)`;
    boardContainerEle.appendChild(boardElement);

    //Render the board legend (these are able to be dragged into the editor)
    //Render the fyles legend
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

    //Render the ranks legend (also renders the corner elements)
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
        } else {legend.classList.add('legend', 'corner', rankCount === -1 ? 'top' : 'bottom')}//shim
        row.insertBefore(legend, row.firstChild);
        row.appendChild(legend.cloneNode(true));
    };

    //Updates the editor text
    setCss(cssText)

    //Attach drag event listeners to draggables (pieces, legend)
    const draggables = document.querySelectorAll('.draggable');
    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            draggable.classList.add('dragging');
            e.stopPropagation();
        })
    
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        })
    })

    //Attach mouseover & mouseout event listeners for pieces for visualising potential moves
    const pieces = document.querySelectorAll('.piece')
    pieces.forEach(piece => {
        piece.addEventListener('mouseover', ()=>{
            const fromFyle = Number(piece.parentElement.getAttribute('data-fyle'));
            const fromRank = Number(piece.parentElement.getAttribute('data-rank'));
            const currentBoardState = window.gameData.gameTurnList.current.boardState;
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

    //Attach dragover & drop event listeners to squares 
    const squares = document.querySelectorAll('.square')
    squares.forEach(square => {
        square.addEventListener('dragover', (e)=>{
            e.preventDefault();
        })
    })
    
    //Drop events for squares handle the logic for regular chess moves
    //If a drag and drop is a valid move, the move is played, and the boardstate / turn list is updated
    squares.forEach(square => {
        square.addEventListener('drop', (e)=>{
            e.preventDefault();
            const draggedPiece = document.querySelector('.dragging');
            if(!draggedPiece.classList.contains('piece')){logger("That's not a piece!"); return false};
            const fromSquare = draggedPiece.parentElement;
            const fromFyle = Number(fromSquare.getAttribute('data-fyle'));
            const fromRank = Number(fromSquare.getAttribute('data-rank'));
            const toFyle = Number(square.getAttribute('data-fyle'));
            const toRank = Number(square.getAttribute('data-rank'));
            const boardState = window.gameData.gameTurnList.current.boardState;
            const isWhiteTurn = window.gameData.gameTurnList.current.isWhiteTurn;
            const curPiece = boardState[fromRank][fromFyle].piece;

            if (window.gameData.multiplayer && isWhiteTurn !== window.gameData.playerIsWhite){logger('Not your turn!'); return false}

            const [isValidMove, isCheckmate] = pieceTurnHandler(fromFyle, fromRank, toFyle, toRank, curPiece, boardState, isWhiteTurn);
            if (isValidMove){
                whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');

                const nextBoardState = structuredClone(boardState);
                nextBoardState[toRank][toFyle].piece = nextBoardState[fromRank][fromFyle].piece;
                nextBoardState[toRank][toFyle].piece.unmoved = false;
                nextBoardState[fromRank][fromFyle].piece = null;

                const nextCssText = window.gameData.gameTurnList.current.cssText;
                setCss(nextCssText);
                const nextIsWhiteTurn = isWhiteTurn?false:true
                window.gameData.gameTurnList.appendTurn(nextBoardState, nextIsWhiteTurn, nextCssText);

                if(window.gameData.multiplayer){
                    gameSocket.emit('move', {roomId: window.gameData.roomId, boardState: nextBoardState, isWhiteTurn: nextIsWhiteTurn, cssText: nextCssText})
                    const myTurn = window.gameData.playerIsWhite === nextIsWhiteTurn;
                    submitCssButton.style.opacity = myTurn ? "100%" : "50%";
                };

                if (square.hasChildNodes()){
                    square.removeChild(square.firstChild);
                }
                square.appendChild(draggedPiece);
                if (isCheckmate){
                    const checkmateOverlay = document.getElementById('checkmate-overlay');
                    const checkmateText = document.getElementById('checkmate-text');
                    const winnerCol = isWhiteTurn ? 'white' : 'black';

                    checkmateText.innerText = `Checkmate, ${winnerCol} wins!`
                    checkmateOverlay.style.display = 'block';
                    if(window.gameData.multiplayer){gameSocket.emit('checkmate', {roomId: window.gameData.roomId, winnerCol: winnerCol})};
                }
            }
        })
    })
}
}