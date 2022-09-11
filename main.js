import {turnHandler, Piece} from "./valid-move-checker.js"
let isWhiteTurn = true;
var gblBoardState;
var gblGameTurnList;

//Doubly linked list of turn nodes
class TurnNode{
    constructor(savedBoardState, isWhiteTurn){
        this.board = savedBoardState;
        this.turn = isWhiteTurn;
        this.next = null;
        this.prev = null;
    }
}

class TurnList{
    constructor(savedBoardState, isWhiteTurn){
        this.head = new TurnNode(savedBoardState, isWhiteTurn);
        // this.head.prev = null;
        this.tail = this.head;
        this.current = this.tail;
    }
    append(savedBoardState, isWhiteTurn){
        let newTurnNode = new TurnNode(savedBoardState, isWhiteTurn);
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
            return [undoBoardState, undoTurn];
        } else {return [null, null]}
    }
    redo(){
        if (this.current.next !== null){
            this.current = this.current.next;
            const redoBoard = this.current.board;
            const redoTurn = this.current.turn;
            return [redoBoard, redoTurn];
        } else {return [null, null]}
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
const defaultBoardState = createDefaultBoard();
renderBoard(defaultBoardState, isWhiteTurn);//null for default board
gblGameTurnList = new TurnList(structuredClone(defaultBoardState), isWhiteTurn);

//Create the event listeners for buttons
let newGameButton = document.getElementById("new-game-button");
newGameButton.addEventListener('click', ()=>{
    renderBoard(createDefaultBoard(), true);
    gblGameTurnList = new TurnList(structuredClone(defaultBoardState), true);
});
let undoButton = document.getElementById("undo-button");
undoButton.addEventListener('click', ()=>{
    const [undoBoard, undoTurn] = gblGameTurnList.undo();
    if (undoBoard !== null){
        renderBoard(undoBoard, undoTurn);
    }
});
let redoButton = document.getElementById("redo-button");
redoButton.addEventListener('click', ()=>{
    const [redoBoard, redoTurn] = gblGameTurnList.redo();
    if (redoBoard != null){
        renderBoard(redoBoard, redoTurn);
    }
});

let saveButton = document.getElementById("save-button");
saveButton.addEventListener('click', ()=>{
    gblGameTurnList.debug();
});

function renderBoard(boardState, isWhiteTurn = true){
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
            const fromX = fromSquare.getAttribute('data-fyle');
            const fromY = fromSquare.getAttribute('data-rank');
            const toX = square.getAttribute('data-fyle');
            const toY = square.getAttribute('data-rank');
            const curPiece = gblBoardState[fromY][fromX];

            const [isValidMove, isCheckmate] = turnHandler(fromX, fromY, toX, toY, curPiece, gblBoardState, isWhiteTurn);
            if (isValidMove){
                const whiteTurnIndicatorEle = document.getElementById('white-turn-indicator');
                const blackTurnIndicatorEle = document.getElementById('black-turn-indicator');
                whiteTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                blackTurnIndicatorEle.toggleAttribute('data-isWhiteTurn');
                isWhiteTurn = !isWhiteTurn;

                gblBoardState[toY][toX] = boardState[fromY][fromX];
                gblBoardState[fromY][fromX] = null;
                const savedBoardState = structuredClone(gblBoardState);
                gblGameTurnList.append(savedBoardState, isWhiteTurn);

                if (square.hasChildNodes()){
                    square.removeChild(square.firstChild);
                }
                square.appendChild(draggedPiece);
            }
            if (isValidMove && isCheckmate){
                //
            }
        })
    })    
}

function createDefaultBoard(){
    let defaultBoard = Array.apply(null, Array(8)).map(()=>{return new Array(8)});
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