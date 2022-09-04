//Passes the dom board to the valid move checker
export function domCheckValidMove (fromSquare, toSquare, isLightTurn, domPiece){
    const domBoard = document.getElementById('board');
    const boardState = domToBoardState(domBoard);

    const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
    //Co-ordinate system: Square A8 is [0,0]
    const fromX = files.findIndex((el)=> el === fromSquare.getAttribute('data-col'));
    const fromY = 8-fromSquare.getAttribute('data-line');
    const toX = files.findIndex((el)=> el === toSquare.getAttribute('data-col'));
    const toY = 8-toSquare.getAttribute('data-line');
    const curPiece = new Piece(domPiece);

    console.log('first log')
    console.log(boardState)

    if(checkValidMove(fromX, fromY, toX, toY, curPiece, boardState, isLightTurn)){
        domPiece.setAttribute('unmoved', false);
        return true;
    }
}

//Returns whether a piece move is a valid CheSS move
function checkValidMove(fromX, fromY, toX, toY, piece, boardState, isLightTurn){
    //Check if the move is valid
    //Right colour
    if ((isLightTurn && piece.col === 'dark') || (!isLightTurn && piece.col === 'light')){
        console.log('You can only move your own piece colour!')
        return false;
    }

    if ((fromX === toX) && (fromY === toY)){
        return false;
    }
    
    const [moveX, moveY] = [Math.abs(toX-fromX),Math.abs(toY-fromY)];
    //Check if the cell is either unnocupied or an enemy
    if(boardState[toY][toX] != null && !isEnemyPiece(toX, toY)){
        console.log('No self-taking!')
        return false;
    }  
    //Pawn
    if (piece.type === "pawn"){
        const orientation = piece.col === 'light' ? -1 : 1;
        const canMove = (piece.unmoved === "true") ? 2 : 1;
        const movePawn = orientation*(toY-fromY);
        
        if (!((movePawn > 0) && (movePawn <= canMove) && (fromX === toX) && !boardState[toY][toX] != null)){
            if (!((movePawn === 1 && moveX === 1) && isEnemyPiece(toX, toY))){
                console.log('Not a valid pawn move!')
                return false;
            }
        } //No en passant :(
    }
    //Knight
    if (piece.type === "knight"){
        if (!(((moveX === 1) && (moveY === 2) || (moveX === 2) && (moveY === 1)))){
            console.log('Not a valid knight move!')
            return false;
        }
    }
    //King
    if (piece.type === "king"){
        if (!((moveX === 1) || (moveY===1))){
            console.log('Not a valid king move!')
            return false;
        }
    }
    //Rest of the pieces
    const isQueen = piece.type === "queen";
    const isRook = piece.type === "rook";
    const isBishop = piece.type === "bishop";
    if (isQueen || isRook || isBishop){
        if (!((moveX === moveY) || ((moveX ===0)^(moveY === 0)))){
            console.log(`Not a valid ${piece.type} move!`)
            return false;
        }
        if ((moveX === moveY) && (isQueen || isBishop)){
            let xDir = (toX - fromX) > 0 ? 1 : -1;
            let yDir = (toY - fromY) > 0 ? 1 : -1;
            for (let i = 1; i<moveY;i++){
                if(boardState[fromY+i*yDir][fromX+i*xDir]!=null){
                    console.log("There's a piece in the way!")
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
                    console.log("There's a piece in the way!")
                    return false;
                }   
            }
        }
    }
    
    console.log('second log')
    console.log(boardState)
    //Move the piece in the board state
    boardState[toY][toX] = boardState[fromY][fromX];
    boardState[fromY][fromX] = null;

    
    console.log('third log')
    console.log(boardState)
    //Check for checks in the updated board state
    if (isKingInCheck(boardState)){
        console.log('The king will be in check!')
        return false;
    }
    
    //The move is fine!
    return true;
    
    //checkValidMove scoped functions
    //Check if the king is in 'check' after the turn
    function isKingInCheck(){
        const kings = findKings();
        const fits = makeFits(boardState[0].length, boardState.length);
        let res = false;
        kings.forEach((king)=>{
            if(checkLineForPiece(king, 1, 0)){res = true}
            if(checkLineForPiece(king, 0, 1)){res = true}
            if(checkLineForPiece(king, -1, 0)){res = true}
            if(checkLineForPiece(king, 0, -1)){res = true}
            if(checkLineForPiece(king, 1, 1)){res = true}
            if(checkLineForPiece(king, 1, -1)){res = true}
            if(checkLineForPiece(king, -1, 1)){res = true}
            if(checkLineForPiece(king, -1, -1)){res = true}
            const pawnDir = isLightTurn ? -1 : 1;
            const pawnMoveset =  [[1,1*pawnDir],[-1,1*pawnDir]];
            let kf= 2; let ks = 1; //knight forward, knight side
            const knightMoveset = [[kf,ks],[-kf,ks],[kf,-ks],[-kf,-ks],[ks,kf],[-ks,kf],[ks,-kf],[-ks,-kf]];
            let k = 1; //king step
            const kingMoveset = [[k,k],[-k,k],[k,-k],[-k,-k],[k,0],[0,k],[-k,0],[0,-k]];
            if(checkMovesetForPiece(king, pawnMoveset, 'pawn')){res = true}
            if(checkMovesetForPiece(king, knightMoveset, 'knight')){res = true}
            if(checkMovesetForPiece(king, kingMoveset, 'king')){res = true}
        })
        return res;
        //Find all the opposing kings
        function findKings(){
            let kings = [];
            for (let j=0; j<boardState.length;j++){
                for (let i=0; i<boardState[0].length;i++){
                    const piece = boardState[j][i];
                    const turn = isLightTurn ? 'light' : 'dark';
                    if ((piece) &&(piece["type"] === "king") && (piece.col === turn)){
                        kings.push([i,j]);
                    }
                }
            }
            return kings;
        }
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
function isCheckmate(boardState,isLightTurn){

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
            }
        }
    }
    return boardState;
}

//Turns the DOM piece element into a piece object
class Piece{
    constructor (domPiece) {
        this.col = domPiece.id.split('-')[0];
        this.type = domPiece.id.split('-')[2];
        this.unmoved = domPiece.getAttribute('unmoved');
    }
    //Todo, log the type when logging board for easier debugging
}