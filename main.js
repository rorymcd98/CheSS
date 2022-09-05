import {domMoveChecker} from "./valid-move-checker.js"
let isLightTurn = true;
//Create the board
createBoard(null, isLightTurn);//null for default board

function createBoard(savedBoard = null, isLightTurn = true){
    const cols = {0:"A", 1:"B", 2:"C", 3:"D", 4:"E", 5:"F", 6:"G", 7:"H"}
    const table = document.createElement("table");
    table.className = "board";
    table.id = "board";
    for (let i = 1; i < 9; i++) {
        let tr = document.createElement('tr');
        tr.dataset.line = 9-i
        for (let j = 1; j < 9; j++) {
            let td = document.createElement('td');
            td.dataset.col = cols[j-1];
            td.dataset.line = 9-i;
            td.className = (i%2 === j%2) ? "light square" : "dark square";
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    document.querySelector("div").appendChild(table);
    
    if (savedBoard === null){
        const pieceOrder = ['A-rook', 'B-knight', 'C-bishop', 'X-queen', 'X-king', 'F-bishop', 'G-knight', 'H-rook'];
        //Draw the pieces
        //White Pawns
        const rankTwo = table.children[6];
        for (let i = 0; i<rankTwo.children.length; i++) {
            const square = rankTwo.children[i]
            const piece = document.createElement('text');
            piece.classList.add('piece', 'draggable');
            piece.setAttribute('draggable', true);
            piece.setAttribute('unmoved', true);
            piece.id = "light-" + cols[i] + "-pawn"
            square.appendChild(piece);
        }
        //Dark Pawns
        const rankSeven = table.children[1];
        for (let i = 0; i<rankSeven.children.length; i++) {
            const square = rankSeven.children[i]
            const piece = document.createElement('text');
            piece.classList.add('piece', 'draggable');
            piece.setAttribute('draggable', true);
            piece.setAttribute('unmoved', true);
            piece.id = "dark-" + cols[i] + "-pawn"
            square.appendChild(piece);
        }
        //Light pieces
        const rankOne = table.children[7];
        for (let i = 0; i<rankOne.children.length; i++) {
            const square = rankOne.children[i]
            const piece = document.createElement('text');
            piece.classList.add('piece', 'draggable');
            piece.setAttribute('draggable', true);
            piece.setAttribute('unmoved', true);
            piece.id = "light-" + pieceOrder[i];
            square.appendChild(piece);
        }
        //Dark pieces
        const rankEight = table.children[0];
        for (let i = 0; i<rankEight.children.length; i++) {
            const square = rankEight.children[i]
            const piece = document.createElement('text');
            piece.classList.add('piece', 'draggable');
            piece.setAttribute('draggable', true);
            piece.setAttribute('unmoved', true);
            piece.id = "dark-" + pieceOrder[i];
            square.appendChild(piece);
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
            let isValidMove;
            let isCheckmate;
            [isValidMove, isCheckmate] = domMoveChecker(fromSquare, square, isLightTurn, draggedPiece);
            if (isValidMove){
                if (square.hasChildNodes()){
                    square.removeChild(square.firstChild);
                }
                square.appendChild(draggedPiece);
                isLightTurn = !isLightTurn;
                const lightTurnIndicator = document.getElementById('light-turn-indicator');
                const darkTurnIndicator = document.getElementById('dark-turn-indicator');
                lightTurnIndicator.setAttribute('isLight', isLightTurn);
                darkTurnIndicator.setAttribute('isLight', isLightTurn);
            }
            if (isValidMove && isCheckmate){
                //
            }
        })
    })    
}
