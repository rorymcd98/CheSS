import {turnHandler, Piece} from "./valid-move-checker.js"
let isLightTurn = true;
var gameTurnList;

//Doubly linked list of turn nodes
class TurnNode{
    constructor(savedBoardState, isLightTurn){
        this.board = savedBoardState;
        this.turn = isLightTurn;
        this.next = null;
        this.prev = null;
    }
}

class TurnList{
    constructor(savedBoardState, isLightTurn){
        this.head = new TurnNode(savedBoardState, isLightTurn);
        this.head.prev = this.head;
        this.tail = this.head;
        this.current = this.tail;
    }
    append(savedBoardState, isLightTurn){
        let newTurnNode = new TurnNode(savedBoardState, isLightTurn);
        this.current.next = newTurnNode;
        newTurnNode.prev = this.current;
        this.tail = newTurnNode;
        this.current = this.tail;
    }
    undo(){
        console.log(this.current.board)
        // if (this.current === this.head){
        //     return [this.current.board, this.current.turn];
        // } else {
        const undoBoardState = this.current.board;
        const undoTurn = this.current.turn;
        this.current = this.current.prev;
        return [undoBoardState, undoTurn];
        // }

    }
}

//Create the board
let defaultBoardState = createDefaultBoard();
renderBoard(defaultBoardState, isLightTurn);//null for default board
gameTurnList = new TurnList(structuredClone(defaultBoardState), isLightTurn);

//Create the event listeners for buttons
let newGameButton = document.getElementById("new-game-button");
newGameButton.addEventListener('click', ()=>{
    renderBoard(createDefaultBoard(), true);
    gameTurnList = new TurnList(structuredClone(defaultBoardState), true);
});
let undoButton = document.getElementById("undo-button");
undoButton.addEventListener('click', ()=>{
    let [undoBoard, undoTurn] = gameTurnList.undo();
    renderBoard(undoBoard, undoTurn);
});

function renderBoard(boardState, isLightTurn = true){
    let exists = document.getElementById('board');
    if (exists){exists.remove()}
    const boardElement = document.createElement("table");
    boardElement.className = "board";
    boardElement.id = "board";
    const lightTurnIndicatorEle = document.getElementById('light-turn-indicator');
    const darkTurnIndicatorEle = document.getElementById('dark-turn-indicator');
    if (isLightTurn){
        lightTurnIndicatorEle.setAttribute('data-isLightTurn', "");
        darkTurnIndicatorEle.setAttribute('data-isLightTurn', "");
    } else {
        lightTurnIndicatorEle.removeAttribute('data-isLightTurn');
        darkTurnIndicatorEle.removeAttribute('data-isLightTurn');
    };
    //Create the board as a table element
    const fyles = {0:'A', 1:'B', 2:'C', 3:'D', 4:'E', 5:'F', 6:'G', 7:'H'};
    for (let i = 1; i < 9; i++) {
        let rank = document.createElement('tr');
        rank.dataset.line = 9-i
        for (let j = 1; j < 9; j++) {
            let square = document.createElement('td');
            square.dataset.fyle = fyles[j-1];
            square.dataset.rank = 9-i;
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
            const fyles = {'A':0, 'B':1, 'C':2, 'D':3, 'E':4, 'F':5, 'G':6, 'H':7};
            const fromX = fyles[fromSquare.getAttribute('data-fyle')];
            const fromY = 8-Number(fromSquare.getAttribute('data-rank'));
            const toX = fyles[square.getAttribute('data-fyle')];
            const toY = 8-Number(square.getAttribute('data-rank'));
            const curPiece = boardState[fromY][fromX];

            let [isValidMove, isCheckmate] = turnHandler(fromX, fromY, toX, toY, curPiece, boardState, isLightTurn);
            if (isValidMove){
                const savedBoardState = structuredClone(boardState);
                gameTurnList.append(savedBoardState, isLightTurn);
                const lightTurnIndicatorEle = document.getElementById('light-turn-indicator');
                const darkTurnIndicatorEle = document.getElementById('dark-turn-indicator');
                lightTurnIndicatorEle.toggleAttribute('data-isLightTurn');
                darkTurnIndicatorEle.toggleAttribute('data-isLightTurn');
                isLightTurn = !isLightTurn;

                boardState[toY][toX] = boardState[fromY][fromX];
                boardState[fromY][fromX] = undefined;

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
    let board = Array.apply(null, Array(8)).map(()=>{return new Array(8)});
    const fyles = {0:'A', 1:'B', 2:'C', 3:'D', 4:'E', 5:'F', 6:'G', 7:'H'};
    const pieceOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    //Draw the pieces
    //White Pawns
    for (let i = 0; i<8; i++) {
        board[0][i] = new Piece('dark', pieceOrder[i], true, fyles[i]);
        board[1][i] = new Piece('dark', 'pawn', true, fyles[i]);
        board[6][i] = new Piece('light', 'pawn', true, fyles[i]);
        board[7][i] = new Piece('light', pieceOrder[i], true, fyles[i]);
    }
    return board;
}