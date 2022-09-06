//Passes the dom board to the valid move checker
export function domMoveChecker(fromSquare, toSquare, domPiece){
    let isValidMove = false;
    let isCheckmate = false;
    let isLightTurn = document.getElementById('board').hasAttribute('isLightTurn') ? true : false;
    const domBoard = document.getElementById('board');
    const boardState = domToBoardState(domBoard);
    const movesets = new generateMoveset(isLightTurn);

    const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
    //Co-ordinate system: Square A8 is [0,0]
    const fromX = files.findIndex((el)=> el === fromSquare.getAttribute('data-col'));
    const fromY = 8-fromSquare.getAttribute('data-line');
    const toX = files.findIndex((el)=> el === toSquare.getAttribute('data-col'));
    const toY = 8-toSquare.getAttribute('data-line');
    const curPiece = new Piece(domPiece);

    if(checkValidMove(fromX, fromY, toX, toY, curPiece, boardState, isLightTurn)){
        domPiece.setAttribute('unmoved', false)
        isValidMove = true;
        let newBoardState = [];
        for (let i = 0; i<boardState.length; i++){
            newBoardState.push([...boardState[i]]);
        }
        newBoardState[toY][toX] = boardState[fromY][fromX];
        newBoardState[fromY][fromX] = null;
        if(checkCheckmate(newBoardState, !isLightTurn)){
            isCheckmate = true;
        }
    }
    return [isValidMove, isCheckmate];
}

//Returns whether a piece move is a valid CheSS move
function checkValidMove(fromX, fromY, toX, toY, piece, boardState, isLightTurn, debug = true){
    //***Check if the move is valid***
    //Moved from its own square
    if ((fromX === toX) && (fromY === toY)){
        return false;
    }
    //On the board
    if ((toX>=boardState[0].length) || (toY>=boardState.length) || (toX<0) || (toY<0)){
        return false;
    }
    //Correct colour
    if ((isLightTurn && piece.col === 'dark') || (!isLightTurn && piece.col === 'light')){
        if(debug){console.log('You can only move your own piece colour!')}
        return false;
    }
    const [moveX, moveY] = [Math.abs(toX-fromX),Math.abs(toY-fromY)];
    //Check if the cell is either unnocupied or an enemy
    if(boardState[toY][toX] != null && !isEnemyPiece(toX, toY)){
        if(debug){console.log('No self-taking!')}
        return false;
    }  
    //Pawn
    if (piece.type === "pawn"){
        const orientation = piece.col === 'light' ? -1 : 1;
        const canMove = (piece.unmoved === "true") ? 2 : 1;
        const movePawn = orientation*(toY-fromY);
        if (!((movePawn > 0) && (movePawn <= canMove) && (fromX === toX) && (boardState[toY][toX] === null))){
            if (!((movePawn === 1 && moveX === 1) && isEnemyPiece(toX, toY))){
                if(debug){console.log('Not a valid pawn move!')}
                return false;
            }
        } //No en passant :(
    }
    //Knight
    if (piece.type === "knight"){
        if (!(((moveX === 1) && (moveY === 2) || (moveX === 2) && (moveY === 1)))){
            if(debug){console.log('Not a valid knight move!')}
            return false;
        }
    }
    //King
    if (piece.type === "king"){
        if (!((moveX === 1) || (moveY===1))){
            if(debug){console.log('Not a valid king move!')}
            return false;
        }
    }
    //Rest of the pieces
    const isQueen = piece.type === "queen";
    const isRook = piece.type === "rook";
    const isBishop = piece.type === "bishop";
    if (isQueen || isRook || isBishop){
        if (!(((moveX === moveY) && !isRook) || (((moveX ===0)^(moveY === 0)) && !isBishop))){
            if(debug){console.log(`Not a valid ${piece.type} move!`)}
            return false;
        }
        if ((moveX === moveY) && (isQueen || isBishop)){
            let xDir = (toX - fromX) > 0 ? 1 : -1;
            let yDir = (toY - fromY) > 0 ? 1 : -1;
            for (let i = 1; i<moveY;i++){
                if(boardState[fromY+i*yDir][fromX+i*xDir]!=null){
                    if(debug){console.log("There's a piece in the way!")}
                    return false;
                }   
            }
        } 
        if (((moveX ===0)^(moveY === 0)) && (isQueen || isRook)){
            let xDir;
            let yDir;
            if (moveX>0){
                xDir = (toX - fromX) > 0 ? 1 : -1;
                yDir = 0;
            } else { //potential for bug here?
                xDir = 0;
                yDir = (toY - fromY) > 0 ? 1 : -1;
            }
            for (let i = 1; i<moveY;i++){
                if(boardState[fromY+i*yDir][fromX+i*xDir]!=null){
                    if(debug){console.log("There's a piece in the way!")}
                    return false;
                }   
            }
        }
    }
    //Create a new board with the piece moved
    let newBoardState = [];
    for (let i = 0; i<boardState.length; i++){
        newBoardState.push([...boardState[i]]);
    }
    newBoardState[toY][toX] = boardState[fromY][fromX];
    newBoardState[fromY][fromX] = null;
    //Check for checks in the updated board state
    if (isKingInCheck(newBoardState)){
        if(debug){console.log('The king will be in check!')}
        return false;
    }
    
    //The move is fine!
    return true;
    
    //checkValidMove scoped functions
    //Check if the king is in 'check' after the turn
    function isKingInCheck(boardState){
        const kings = findKings(boardState, isLightTurn);
        const fits = makeFits(boardState[0].length, boardState.length);
        return(kings.some((king)=>{
            if(checkLineForPiece(king, 1, 0)){return true}
            if(checkLineForPiece(king, 0, 1)){return true}
            if(checkLineForPiece(king, -1, 0)){return true}
            if(checkLineForPiece(king, 0, -1)){return true}
            if(checkLineForPiece(king, 1, 1)){return true}
            if(checkLineForPiece(king, 1, -1)){return true}
            if(checkLineForPiece(king, -1, 1)){return true}
            if(checkLineForPiece(king, -1, -1)){return true}
            const pawnDir = isLightTurn ? -1 : 1;
            const pawnMoveset =  [[1,1*pawnDir],[-1,1*pawnDir]];
            let kf= 2; let ks = 1; //knight forward, knight side
            const knightMoveset = [[kf,ks],[-kf,ks],[kf,-ks],[-kf,-ks],[ks,kf],[-ks,kf],[ks,-kf],[-ks,-kf]];
            let k = 1; //king step
            const kingMoveset = [[k,k],[-k,k],[k,-k],[-k,-k],[k,0],[0,k],[-k,0],[0,-k]];
            if(checkMovesetForPiece(king, pawnMoveset, 'pawn')){return true}
            if(checkMovesetForPiece(king, knightMoveset, 'knight')){return true}
            if(checkMovesetForPiece(king, kingMoveset, 'king')){return true}
        }))

        //Returns true if the line encounters a threatening bishop/rook/queen, false if not
        function checkLineForPiece(king, dirX, dirY){
            const kingX = king[0];
            const kingY = king[1];
            const lookForType = (Math.abs(dirX) === Math.abs(dirY)) ? ["queen", "bishop"] : ["queen", "rook"];
            const lookForCol = isLightTurn ? 'dark' : 'light';
            for (let i = 1; i<8; i++){
                const posX = kingX + dirX*i;
                const posY = kingY + dirY*i;
                if (!fits(posX, posY)){return false}
                if (boardState[posY][posX] != null){
                    return ((lookForType.includes(boardState[posY][posX].type)) && (boardState[posY][posX].col === lookForCol));
                }
            }
            return false;
        }
        //Returns true if an array of moves (the moveset) encounters a threatening piece/pawn, false if not
        function checkMovesetForPiece(king, moveset, lookForType){
            const kingX = king[0];
            const kingY = king[1];
            const lookForCol = isLightTurn ? 'dark' : 'light';
            let res = false;
            moveset.forEach((move)=>{
                const posX = kingX + move[0];
                const posY = kingY + move[1];
                if (fits(posX, posY)){
                    if (boardState[posY][posX] != null){
                        if((boardState[posY][posX].type === lookForType) && (boardState[posY][posX].col === lookForCol)){res = true};
                    }
                }
            })
            return res;
        }
        //Closure creator for checking if a coordinate fits within the board
        function makeFits(width, height){
            return (locX, locY)=>{
                return !((locX>=width) || (locX<0) || (locY>=height) || (locY<0));
            }
        }

    }
    
    function isEnemyPiece(toX, toY){
        if (boardState[toY][toX] != null) {
            const targetPieceCol = boardState[toY][toX].col;
            return (isLightTurn && (targetPieceCol === "dark")) || (!isLightTurn && (targetPieceCol === "light"))
        }
    }
}

//Check if the board is in 'checkmate'
function checkCheckmate(boardState,isLightTurn){
    //1. Iterate through all pieces that can currently move
    //2. Generate all moves that that piece can do
    //3. For each move, check if the king is in check

    const movesets = new generateMoveset(isLightTurn);
    const lookForTurn = isLightTurn ? 'light' : 'dark';
    for (let j=0; j<boardState.length;j++){
        for (let i=0; i<boardState[0].length;i++){
            const piece = boardState[j][i];
            if ((piece) && (piece.col === lookForTurn)){
                if(movesets[piece.type].some((move) => {
                    //if(checkValidMove(i,j,i+move[0],j+move[1],piece,boardState,isLightTurn)){console.log(i,j,move, piece)} //Common debug
                    return checkValidMove(i,j,i+move[0],j+move[1],piece,boardState,isLightTurn, false)})){
                    return false;
                }
            }
        }
    }
    const winner = !isLightTurn ? 'light' : 'dark';
    console.log(`Checkmate, ${winner} wins!`);
    return true;
}

//Generates an exhaustive list of moves a piece can perform
//Needs access to a 'moveset' variable
function generateMoveset(isLightTurn){
    const pawnDir = isLightTurn ? -1 : 1;
    this.pawn =  [[1,1*pawnDir],[-1,1*pawnDir],[0,pawnDir],[0,2*pawnDir]];

    let kf= 2; let ks = 1; //knight forward, knight side
    this.knight = [[kf,ks],[-kf,ks],[kf,-ks],[-kf,-ks],[ks,kf],[-ks,kf],[ks,-kf],[-ks,-kf]];    
    
    let k = 1; //king step
    this.king = [[k,k],[-k,k],[k,-k],[-k,-k],[k,0],[0,k],[-k,0],[0,-k]];

    let bishopMoveset = [];
    let rookMoveset = [];
    let queenMoveset = [];
    for (let i = 1; i < 8; i++){
        bishopMoveset.push([i,i],[i,-i],[-i,i],[-i,-i]);
        rookMoveset.push([i,0],[0,i],[-i,0],[0,-i]);
        queenMoveset.push([i,i],[i,-i],[-i,i],[-i,-i]);
        queenMoveset.push([i,0],[0,i],[-i,0],[0,-i]);
    }
    this.bishop = bishopMoveset;
    this.rook = rookMoveset;
    this.queen = queenMoveset;
}

//Turns the table DOM element into an interprettable board
function domToBoardState(domBoard){
    let boardState = Array.apply(null, Array(8)).map(()=>{return new Array(8)})
    for (let j=0; j<domBoard.children.length;j++){
        const rank = domBoard.children[j];
        for (let i=0; i<rank.children.length;i++){
            const square = rank.children[i];
            if (square.children.length>0){
                boardState[j][i] = new Piece(square.children[0]);
            } else {
                boardState[j][i] = null;
            }
        }
    }
    return boardState;
}

//Turns the DOM piece element into a piece object
export class Piece{
    constructor (col, type, unmoved, file, properties = {}) {
        this.col = col;
        this.type = type;
        this.unmoved = unmoved;
        this.file = file;
        this.properties = properties;
    }
}

//Find all the current-turn kings
function findKings(boardState, isLightTurn){
    let kings = [];
    const turn = isLightTurn ? 'light' : 'dark';
    for (let j=0; j<boardState.length;j++){
        for (let i=0; i<boardState[0].length;i++){
            const piece = boardState[j][i];
            if ((piece) && (piece["type"] === "king") && (piece.col === turn)){
                kings.push([i,j]);
            }
        }
    }
    return kings;
}