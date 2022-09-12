import {pieceTurnHandler, cssTurnHandler, Piece} from "./valid-move-checker.js"
import {setCss, getCss} from "./editor.js"
var gblIsWhiteTurn = true;
var gblBoardState;
var gblGameTurnList;

//Doubly linked list of turn nodes
class TurnNode{
    constructor(savedBoardState, isWhiteTurn, cssText){
        this.board = savedBoardState;
        this.turn = isWhiteTurn;
        this.cssText = cssText;
        this.next = null;
        this.prev = null;
    }
}

class TurnList{
    constructor(savedBoardState, isWhiteTurn, cssText){
        this.head = new TurnNode(savedBoardState, isWhiteTurn, cssText);
        // this.head.prev = null;
        this.tail = this.head;
        this.current = this.tail;
    }
    append(savedBoardState, isWhiteTurn, cssText){
        let newTurnNode = new TurnNode(savedBoardState, isWhiteTurn, cssText);
        newTurnNode.prev = this.current;
        this.current.next = newTurnNode;
        this.current = this.current.next;
        this.tail = newTurnNode;
    }
    undo(){
        if (this.current.prev !== null){
            this.current = this.current.prev;
            const undoBoardState = this.current.board;
            const undoTurn = this.current.turn;
            const undoCssText = this.current.cssText;
            return [undoBoardState, undoTurn, undoCssText];
        } else {return [null, null, null]}
    }
    redo(){
        if (this.current.next !== null){
            this.current = this.current.next;
            const redoBoard = this.current.board;
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
            console.log(dummy.board);
            dummy = dummy.next;
        }
    }
}

//---Create the board---
export function initBoard(){
    const defaultBoardState = createDefaultBoard();
    renderBoard(defaultBoardState, true);
    gblGameTurnList = new TurnList(structuredClone(defaultBoardState), true, '');
}

//Create the event listeners for buttons
const newGameButton = document.getElementById("new-game-button");
newGameButton.addEventListener('click', ()=>{
    const defaultBoardState = createDefaultBoard();
    renderBoard(defaultBoardState, true);
    gblGameTurnList = new TurnList(structuredClone(defaultBoardState), true , '');
});

const undoButton = document.getElementById("undo-button");
undoButton.addEventListener('click', ()=>{
    const [undoBoard, undoTurn, undoCssText] = gblGameTurnList.undo();
    if (undoBoard !== null){
        renderBoard(undoBoard, undoTurn, undoCssText);
    }
});

const redoButton = document.getElementById("redo-button");
redoButton.addEventListener('click', ()=>{
    const [redoBoard, redoTurn, redoCssText] = gblGameTurnList.redo();
    if (redoBoard != null){
        renderBoard(redoBoard, redoTurn, redoCssText);
    }
});

const saveButton = document.getElementById("save-button");
saveButton.addEventListener('click', ()=>{
    gblGameTurnList.debug();
});

const submitCssButton = document.getElementById("submit-css-button");
submitCssButton.addEventListener('click', ()=>{
    const isValidCssMove = cssTurnHandler(gblBoardState);
    if (isValidCssMove){
        gblIsWhiteTurn = !gblIsWhiteTurn;
        const currentCssText = getCss();
        renderBoard(gblBoardState, gblIsWhiteTurn, currentCssText);
        //Eventually we will add undo/redo functionality
        const savedBoardState = structuredClone(gblBoardState);
        gblGameTurnList.append(savedBoardState, gblIsWhiteTurn?true:false, currentCssText);
    }
});

function renderBoard(boardState, isWhiteTurn = true, cssText = ''){
    //Update the global board state
    gblBoardState = structuredClone(boardState);

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

    for (let i = 0; i < 8; i++) {
        let rank = document.createElement('tr');
        rank.dataset.rank = i
        for (let j = 0; j < 8; j++) {
            let square = document.createElement('td');
            square.dataset.fyle = j;
            square.dataset.rank = i;
            square.className = (i%2 === j%2) ? "light square" : "dark square";
            rank.appendChild(square);
        }
        boardElement.appendChild(rank);
    }
    document.getElementById("board-container").appendChild(boardElement);

    //Place the pieces
    for (let j = 0; j<8; j++){
        let rank = boardElement.children[j];
        for (let i = 0; i<8; i++) {
            const squareElement = rank.children[i]
            const pieceObj = boardState[j][i];
            if (pieceObj){
                const pieceElement = document.createElement('text');
                pieceElement.classList.add('piece', 'draggable');
                pieceElement.setAttribute('draggable', true);
                if (pieceObj.unmoved){pieceElement.setAttribute('data-unmoved', "")};
                pieceElement.id = pieceObj.col + '-' + pieceObj.file + '-' + pieceObj.type;
                squareElement.appendChild(pieceElement);
            }
        }
    }

    //Renders CSS from the editor
    renderCss(cssText)
    setCss(cssText)

    //Some text cases
    // td[data-fyle = "2"]{
    //     display: none;
    //   }
      
    // tr[data-rank = "7"]{
    //     display: none;
    // }

    //Attach drag event listeners to draggables (pieces)
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
    
    squares.forEach(square => {
        square.addEventListener('drop', (e)=>{
            e.preventDefault();
            const draggedPiece = document.querySelector('.dragging');
            const fromSquare = draggedPiece.parentElement;
            const fromX = Number(fromSquare.getAttribute('data-fyle'));
            const fromY = Number(fromSquare.getAttribute('data-rank'));
            const toX = Number(square.getAttribute('data-fyle'));
            const toY = Number(square.getAttribute('data-rank'));
            const curPiece = gblBoardState[fromY][fromX];

            const [isValidMove, isCheckmate] = pieceTurnHandler(fromX, fromY, toX, toY, curPiece, gblBoardState, gblIsWhiteTurn);
            if (isValidMove){
                const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
                const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
                whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                gblIsWhiteTurn = !gblIsWhiteTurn;

                gblBoardState[toY][toX] = boardState[fromY][fromX];
                gblBoardState[fromY][fromX] = null;
                const savedBoardState = structuredClone(gblBoardState);
                gblGameTurnList.append(savedBoardState, gblIsWhiteTurn?true:false, cssText);

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

export function createDefaultBoard(){
    let defaultBoard = {}; //Array.apply(null, Array(8)).map(()=>{return new Array(8)});
    for (let i = 0; i<8; i++) {defaultBoard[i] = {}}
    const fyles = {0:'A', 1:'B', 2:'C', 3:'D', 4:'E', 5:'F', 6:'G', 7:'H'};
    const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    //Draw the pieces
    for (let i = 0; i<8; i++) {
        defaultBoard[0][i] = new Piece('black', pieceOrder[i], true, fyles[i]);
        defaultBoard[1][i] = new Piece('black', 'pawn', true, fyles[i]);
        defaultBoard[2][i] = null;
        defaultBoard[3][i] = null;
        defaultBoard[4][i] = null;
        defaultBoard[5][i] = null;
        defaultBoard[6][i] = new Piece('white', 'pawn', true, fyles[i]);
        defaultBoard[7][i] = new Piece('white', pieceOrder[i], true, fyles[i]);
    }
    return defaultBoard;
}

function renderCss(cssText){
    const lines = cssText.split('\n');
    const validElements = ['td'];
    for(let i = 0; i<lines.length; i++){
        const line = lines[i];
        //--Start creating CSS rules here--
        if(line.startsWith('td')){
            //generalise this into a function which accepts a function
            const selector = line.substring(0,line.indexOf('{'));
            const eles = document.querySelectorAll(selector);
            i++;
            while (!lines[i].startsWith('}')){
                const styleArr = lines[i].split(":");
                eles.forEach((ele)=>{
                    const styleProperty = (styleArr[0]).trim();
                    const styleValue = (styleArr[1].replace(';','')).trim();
                    ele.style[styleProperty] = styleValue;
                })
                i++;
            }
        }
    }
}