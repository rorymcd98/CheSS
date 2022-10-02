import {pieceTurnHandler, cssTurnHandler, highlightSquares} from "./valid-move-checker.js"
import {setCss, getCss} from "./editor.js"
import {b} from "./game-sockets.js"

console.log(b)

var mainIsWhiteTurn = true;
var mainBoardState;
var mainGameTurnList;
const defaultEditorText = "/*Here are the white pieces [\u2659,\u2656,\u2658,\u2657,\u2654,\u2655]*/\n/*Here are the black pieces [\u265F,\u265C,\u265E,\u265D,\u265A,\u265B]*/\n";
//Doubly linked list of turn nodes
class TurnNode{
    constructor(savedBoardState, savedIsWhiteTurn, savedCssText){
        this.boardState = savedBoardState;
        this.turn = savedIsWhiteTurn;
        this.cssText = savedCssText;
        this.next = null;
        this.prev = null;
    }
}

class TurnList{
    constructor(savedBoardState, savedIsWhiteTurn, savedCssText){
        this.head = new TurnNode(savedBoardState, savedIsWhiteTurn, savedCssText);
        // this.head.prev = null;
        this.tail = this.head;
        this.current = this.tail;
    }
    append(savedBoardState, savedIsWhiteTurn, savedCssText){
        let newTurnNode = new TurnNode(savedBoardState, savedIsWhiteTurn, savedCssText);
        newTurnNode.prev = this.current;
        this.current.next = newTurnNode;
        this.current = this.current.next;
        this.tail = newTurnNode;
    }
    undo(){
        if (this.current.prev !== null){
            this.current = this.current.prev;
            const undoBoardState = this.current.boardState;
            const undoTurn = this.current.turn;
            const undoCssText = this.current.cssText;
            return [undoBoardState, undoTurn, undoCssText];
        } else {return [null, null, null]}
    }
    redo(){
        if (this.current.next !== null){
            this.current = this.current.next;
            const redoBoard = this.current.boardState;
            const redoTurn = this.current.turn;
            const redoCssText = this.current.cssText;
            return [redoBoard, redoTurn, redoCssText];
        } else {return [null, null, null]}
    }
    debug(){
        let dummy = this.head;
        console.log("debug")
        while(dummy){
            if (dummy === this.current){console.log('current')}
            print(dummy.boardState);
            dummy = dummy.next;
        }
    }
}

//Creates a piece object
export class Piece{
    constructor (col, type, unmoved, fyle, properties = {bold: false, big: false, ghost: false}) {
        this.col = col;
        this.type = type;
        this.unmoved = unmoved;
        this.fyle = fyle;
        this.properties = properties;
        this.objectId = this.col + '-' + this.fyle + '-' + this.type;
    }
}

//---Create the board---
export function initBoard(){
    newGame();
}

//Create the event listeners for buttons
const newGameButton = document.getElementById("new-game-button");
newGameButton.addEventListener('click', ()=>{
    newGame();
});

function newGame(){
    const defaultBoardState = new DefaultBoard();
    renderBoard(defaultBoardState, true, null);
    mainGameTurnList = new TurnList(structuredClone(defaultBoardState), true, defaultEditorText);
}

const undoButton = document.getElementById("undo-button");
undoButton.addEventListener('click', ()=>{
    const [undoBoard, undoTurn, undoCssText] = mainGameTurnList.undo();
    if (undoBoard !== null){
        renderBoard(undoBoard, undoTurn, undoCssText);
    }
});

const redoButton = document.getElementById("redo-button");
redoButton.addEventListener('click', ()=>{
    const [redoBoard, redoTurn, redoCssText] = mainGameTurnList.redo();
    if (redoBoard != null){
        renderBoard(redoBoard, redoTurn, redoCssText);
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
    const [isValidCssMove, nextBoardState] = cssTurnHandler(currentBoardState, mainIsWhiteTurn, currentCssText);
    if (isValidCssMove){
        mainIsWhiteTurn = !mainIsWhiteTurn;
        const nextCssText = getCss();
        renderBoard(nextBoardState, mainIsWhiteTurn, nextCssText);
        mainGameTurnList.append(nextBoardState, mainIsWhiteTurn?true:false, nextCssText);
    }
});

function renderBoard(boardState, isWhiteTurn = true, cssText = null){
    //Update the global board state
    mainBoardState = structuredClone(boardState);
    mainIsWhiteTurn = isWhiteTurn;

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
            const hoverPiece = mainBoardState[fromRank][fromFyle].piece;
            if(hoverPiece.col === (mainIsWhiteTurn ? 'white':'black')){
                highlightSquares(fromFyle, fromRank, hoverPiece, mainBoardState, mainIsWhiteTurn);
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
            const curPiece = mainBoardState[fromRank][fromFyle].piece;

            const [isValidMove, isCheckmate] = pieceTurnHandler(fromFyle, fromRank, toFyle, toRank, curPiece, mainBoardState, mainIsWhiteTurn);
            if (isValidMove){
                const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
                const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
                whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                mainIsWhiteTurn = !mainIsWhiteTurn;

                mainBoardState[toRank][toFyle].piece = structuredClone(mainBoardState[fromRank][fromFyle].piece);
                mainBoardState[toRank][toFyle].piece.unmoved = false;
                mainBoardState[fromRank][fromFyle].piece = null;
                const nextBoardState = structuredClone(mainBoardState);
                const nextCssText = mainGameTurnList.current.cssText;
                setCss(nextCssText);
                mainGameTurnList.append(nextBoardState, mainIsWhiteTurn?true:false, nextCssText);

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

class DefaultBoard{
    constructor(){
        for (let j = 0; j<8; j++) {this[j] = {}; for (let i = 0; i<8; i++){this[j][i] = {square:{},piece:{}}}}
        const fyles = {0:'A', 1:'B', 2:'C', 3:'D', 4:'E', 5:'F', 6:'G', 7:'H'};
        const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        //Draw the pieces
        for (let i = 0; i<8; i++) {
            this[0][i].piece = new Piece('black', pieceOrder[i], true, fyles[i]);
            this[1][i].piece = new Piece('black', 'pawn', true, fyles[i]);
            this[2][i].piece = null;
            this[3][i].piece = null;
            this[4][i].piece = null;
            this[5][i].piece = null;
            this[6][i].piece = new Piece('white', 'pawn', true, fyles[i]);
            this[7][i].piece = new Piece('white', pieceOrder[i], true, fyles[i]);
        }
        this.ranks = [0,1,2,3,4,5,6,7];
        this.fyles = [0,1,2,3,4,5,6,7];
    }
}

//Prints the board (if css = true, it takes into account some CSS changes)
function print(boardState, css = true){
    const pieceToUnicode = {'white':{'pawn':'\u2659','rook':'\u2656','knight':'\u2658','bishop':'\u2657','king':'\u2654','queen':'\u2655'},
                            'black':{'pawn':'\u265F','rook':'\u265C','knight':'\u265E','bishop':'\u265D','king':'\u265A','queen':'\u265B'}};
    let resText = "";
    for(let j = 0; j<8; j++){
        resText += "\n|"
        for(let i = 0; i<8; i++){
            const pieceObj = boardState[j][i].piece;
            if(pieceObj){ 
                resText+=pieceToUnicode[pieceObj.col][pieceObj.type] + '\t|';
            } else {
                resText+='\t|';
            }
        }
    }
    console.log(resText)
}

export function getCurrentTurnCssText(){
    return mainGameTurnList.current.cssText;
}

export function getCurrentTurnBoardState(){
    return mainGameTurnList.current.boardState;
}