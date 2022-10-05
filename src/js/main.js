import {pieceTurnHandler, cssTurnHandler, highlightSquares} from "./valid-move-checker.js"
import {initEditor, setCss, getCss} from "./editor.js"
import {DefaultBoard, TurnList} from "./turn-handler.js"

window.mainGameTurnList;
const defaultEditorText = "/*Here are the white pieces [\u2659,\u2656,\u2658,\u2657,\u2654,\u2655]*/\n/*Here are the black pieces [\u265F,\u265C,\u265E,\u265D,\u265A,\u265B]*/\n";

//---Create the board---
initEditor(newGame);


//Create the event listeners for buttons
const newGameButton = document.getElementById("new-game-button");
newGameButton.addEventListener('click', ()=>{
    newGame();
});

function newGame(){
    const defaultBoardState = new DefaultBoard();
    renderTurn(defaultBoardState, true, null);
    mainGameTurnList = new TurnList(structuredClone(defaultBoardState), true, defaultEditorText);
}

const undoButton = document.getElementById("undo-button");
undoButton.addEventListener('click', ()=>{
    const [undoBoard, undoTurn, undoCssText] = mainGameTurnList.undo();
    if (undoBoard !== null){
        renderTurn(undoBoard, undoTurn, undoCssText);
    }
});

const redoButton = document.getElementById("redo-button");
redoButton.addEventListener('click', ()=>{
    const [redoBoard, redoTurn, redoCssText] = mainGameTurnList.redo();
    if (redoBoard != null){
        renderTurn(redoBoard, redoTurn, redoCssText);
    }
});

const saveButton = document.getElementById("save-button");
saveButton.addEventListener('click', ()=>{
    mainGameTurnList.debug();
});

const submitCssButton = document.getElementById("submit-css-button");
submitCssButton.addEventListener('click', ()=>{
    const currentCssText = mainGameTurnList.current.cssText;
    const currentBoardState = structuredClone(mainGameTurnList.current.boardState);
    const currentIsWhiteTurn = mainGameTurnList.current.isWhiteTurn;
    const [isValidCssMove, nextBoardState] = cssTurnHandler(currentBoardState, currentIsWhiteTurn, currentCssText);
    if (isValidCssMove){
        const nextIsWhiteTurn = !currentIsWhiteTurn;
        const nextCssText = getCss();
        renderTurn(nextBoardState, nextIsWhiteTurn, nextCssText);
        mainGameTurnList.append(nextBoardState, nextIsWhiteTurn, nextCssText);
    }
});

function renderTurn(boardState, isWhiteTurn = true, cssText = null){
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
    for(let rankNum=0; rankNum<8; rankNum++){
        let rank = document.createElement('tr');
        rank.dataset.rank = rankNum;
        for(let fyleNum=0; fyleNum<8; fyleNum++){
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
    for(let fyleNum=0; fyleNum<9; fyleNum++){
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
    for(let rankNum=-1; rankNum<9; rankNum++){
        const row = boardElement.children[rankNum+1];
        const legend = document.createElement('td');
        if(rankNum >= 0 && rankNum < 8){
            legend.classList.add('legend', 'draggable');
            legend.setAttribute('draggable', true);
            legend.innerText = 8-Number(rankNum);
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
            const currentBoardState = mainGameTurnList.current.boardState;
            const currentIsWhiteTurn = mainGameTurnList.current.isWhiteTurn;
            const hoverPiece = currentBoardState[fromRank][fromFyle].piece;
            if(hoverPiece.col === (currentIsWhiteTurn ? 'white':'black')){
                highlightSquares(fromFyle, fromRank, hoverPiece, currentBoardState, currentIsWhiteTurn);
            }
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
            const boardState = mainGameTurnList.current.boardState;
            const isWhiteTurn = mainGameTurnList.current.isWhiteTurn;
            const curPiece = boardState[fromRank][fromFyle].piece;

            const [isValidMove, isCheckmate] = pieceTurnHandler(fromFyle, fromRank, toFyle, toRank, curPiece, boardState, isWhiteTurn);
            if (isValidMove){
                const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
                const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
                whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                isWhiteTurn = !isWhiteTurn;

                boardState[toRank][toFyle].piece = structuredClone(boardState[fromRank][fromFyle].piece);
                boardState[toRank][toFyle].piece.unmoved = false;
                boardState[fromRank][fromFyle].piece = null;
                const nextBoardState = structuredClone(boardState);
                const nextCssText = mainGameTurnList.current.cssText;
                setCss(nextCssText);
                mainGameTurnList.append(nextBoardState, isWhiteTurn?true:false, nextCssText);

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