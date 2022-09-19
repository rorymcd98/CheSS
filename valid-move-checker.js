import {getCss} from './editor.js';

//Passes the dom board to the valid move checker
export function pieceTurnHandler(fromFyle, fromRank, toFyle, toRank, curPiece, boardState, isWhiteTurn){
    let isValidMove = false;
    let isCheckmate = false;
    const {boardArray, fromX, fromY, toX, toY} = boardToArray(boardState, fromFyle, fromRank, toFyle, toRank);
    if(checkValidMove(fromX, fromY, toX, toY, curPiece, boardArray, isWhiteTurn)){
        isValidMove = true;
        let nextBoardArray = structuredClone(boardArray);
        nextBoardArray[fromY][fromX].unmoved = false;
        nextBoardArray[toY][toX] = nextBoardArray[fromY][fromX];
        nextBoardArray[fromY][fromX] = null;
        if(checkCheckmate(nextBoardArray, !isWhiteTurn)){
            isCheckmate = true;
        }
    }
    return [isValidMove, isCheckmate];
}

//Passes the dom board to the valid move checker
export function cssTurnHandler(boardState, isWhiteTurn, currentCssText){
    const {boardArray} = boardToArray(boardState);
    if(checkNumberCssChanges(currentCssText) !== 1){
        console.log('CSS moves must change or create exactly one property!')
        return [false, null];
    }
    if(isKingInCheck(boardArray, isWhiteTurn)){
        console.log('CSS moves can\'t be made while in check!')
        return [false, null];
    }
    const cssBoardState = cssUpdateBoardState(boardState);
    const {boardArray: cssBoardArray} = boardToArray(cssBoardState);

    if(!(findKings(cssBoardArray, true).length === 1 && findKings(cssBoardArray, false).length === 1)){
        console.log('CSS moves can\'t create or destroy a king!')
        return [false, null];
    }
    if(isKingInCheck(cssBoardArray, true) || isKingInCheck(cssBoardArray, true)){
        console.log('CSS moves can\'t put a king in check!')
        return [false, null];
    }
    return [true, cssBoardState];
}

//Returns whether a piece move is a valid CheSS move
function checkValidMove(fromX, fromY, toX, toY, piece, boardArray, isWhiteTurn, debug = true){
    const pP = piece.properties;

    //---Check if the move is valid---
    //Moved from its own square
    if ((fromX === toX) && (fromY === toY)){
        return false;
    }
    //On the board
    if ((toX>=boardArray[0].length) || (toY>=boardArray.length) || (toX<0) || (toY<0)){
        return false;
    }
    //Correct colour
    if ((isWhiteTurn && piece.col === 'black') || (!isWhiteTurn && piece.col === 'white')){
        if(debug){console.log('You can only move your own piece colour!')}
        return false;
    }
    //Useful intermediary values (absolute X, Y movement)
    const [moveX, moveY] = [Math.abs(toX-fromX),Math.abs(toY-fromY)];

    //Check that they're not taking their own king (this can happen sometimes)
    if(boardArray[toY][toX] !== null && boardArray[toY][toX].type === 'king' && !isEnemyPiece(toX, toY)){
        if(debug){console.log('You can\'t take your own king!')}
        return false;
    } 

    //Check if the cell is either unnocupied or an enemy, or the taking piece is bold
    if(boardArray[toY][toX] !== null && !isEnemyPiece(toX, toY) && !pP.bold){
        if(debug){console.log('No self-taking!')}
        return false;
    } 

    //Ghosts can't take
    if(pP.ghost && boardArray[toY][toX] !== null ){
        if(debug){console.log('Ghosts can\'t take!')};
        return false;
    }

    //Ghosts can't be taken
    if(boardArray[toY][toX] !== null && boardArray[toY][toX].properties.ghost){
        if(debug){console.log('Ghosts can\'t be taken!')};
        return false;
    }

    //Pawn
    if (piece.type === "pawn"){
        const orientation = piece.col === 'white' ? -1 : 1;
        let canMove = (piece.unmoved) ? 2 : 1;
        if(pP.big){canMove*=2};
        const movePawn = orientation*(toY-fromY);

        const withinLimits = (movePawn > 0) && (movePawn <= canMove);
        const movesLikeAPawn = (fromX === toX);
        const takeLikeAPawn = (movePawn === moveX);
        
        if(!withinLimits || !((movesLikeAPawn && (boardArray[toY][toX] === null || pP.bold)) || (takeLikeAPawn && isEnemyPiece(toX,toY)))){
            if(debug){console.log('Not a valid pawn move!')}
            return false;
        }
        
        //No en passant :(
    }
    //Knight
    if (piece.type === "knight"){
        if (!pP.big && !(((moveX === 1) && (moveY === 2) || (moveX === 2) && (moveY === 1)))){
            if(debug){console.log('Not a valid knight move!')}
            return false;
        }
        //Big knight
        if (pP.big && !([1,2].includes(moveX) && [2,4].includes(moveY) || [2,4].includes(moveX) && [1,2].includes(moveY))){
            if(debug){console.log('Not a valid big knight move!')}
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
        //Check if the rook, bishop, queen will encounter a piece on their route (unless the moving piece, or intercepting piece is a ghost)
        if ((moveX === moveY) && (isQueen || isBishop) && !pP.ghost){
            let xDir = (toX - fromX) > 0 ? 1 : -1;
            let yDir = (toY - fromY) > 0 ? 1 : -1;
            for (let i = 1; i<moveY;i++){
                const interPiece = boardArray[fromY+i*yDir][fromX+i*xDir];
                if(interPiece!==null || (interPiece && !interPiece.properties.ghost)){
                    if(debug){console.log("There's a piece in the way!")}
                    return false;
                }   
            }
        } 
        if (((moveX ===0)^(moveY === 0)) && (isQueen || isRook) && !pP.ghost){
            let xDir;
            let yDir;
            if (moveX>0){
                xDir = (toX - fromX) > 0 ? 1 : -1;
                yDir = 0;
            } else {
                xDir = 0;
                yDir = (toY - fromY) > 0 ? 1 : -1;
            }
            for (let i = 1; i<moveY;i++){
                const interPiece = boardArray[fromY+i*yDir][fromX+i*xDir];
                if(interPiece!==null || (interPiece && !interPiece.properties.ghost)){
                    if(debug){console.log("There's a piece in the way!")}
                    return false;
                }   
            }
        }
    }
    //Create a new board with the piece moved
    let nextBoardArray = structuredClone(boardArray);
    nextBoardArray[toY][toX] = nextBoardArray[fromY][fromX];
    nextBoardArray[fromY][fromX] = null;
    //Check for checks in the updated board state
    if (isKingInCheck(nextBoardArray, isWhiteTurn)){
        if(debug){console.log('The king will be in check!')}
        return false;
    }
    
    //The move is fine!
    return true;
    
    //checkValidMove scoped helper functions
    function isEnemyPiece(toX, toY){
        if(boardArray[toY][toX]===null){return false}
        return (isWhiteTurn && (boardArray[toY][toX].col === "black")) || (!isWhiteTurn && (boardArray[toY][toX].col === "white"))
    }
}

//Check if the king is in 'check' after the turn
function isKingInCheck(boardArray, isWhiteTurn){
    const kings = findKings(boardArray, isWhiteTurn);
    const movesets = new GenerateMoveset(isWhiteTurn);
    return(kings.some((king)=>{
        if(checkLineForPiece(king, 1, 0)){return true}
        if(checkLineForPiece(king, 0, 1)){return true}
        if(checkLineForPiece(king, -1, 0)){return true}
        if(checkLineForPiece(king, 0, -1)){return true}
        if(checkLineForPiece(king, 1, 1)){return true}
        if(checkLineForPiece(king, 1, -1)){return true}
        if(checkLineForPiece(king, -1, 1)){return true}
        if(checkLineForPiece(king, -1, -1)){return true}
        if(checkMovesetForPiece(king, movesets.pawnTake, 'pawn')){return true}
        if(checkMovesetForPiece(king, movesets.pawnTake.big, 'pawn', ['big'])){return true}
        if(checkMovesetForPiece(king, movesets.pawn, 'pawn', ['bold'])){return true}
        if(checkMovesetForPiece(king, movesets.pawn.big, 'pawn', ['bold', 'big'])){return true}
        if(checkMovesetForPiece(king, movesets.knight, 'knight')){return true}
        if(checkMovesetForPiece(king, movesets.knight.big, 'knight', ['big'])){return true}
        if(checkMovesetForPiece(king, movesets.king, 'king')){return true}
    }))

    //Returns true if the line encounters a threatening bishop/rook/queen, false if not
    function checkLineForPiece(king, dirX, dirY){
        const kingX = king[0];
        const kingY = king[1];
        const lookForType = (Math.abs(dirX) === Math.abs(dirY)) ? ["queen", "bishop"] : ["queen", "rook"];
        const lookForCol = isWhiteTurn ? 'black' : 'white';
        for (let i = 1; i<8; i++){
            const posX = kingX + dirX*i;
            const posY = kingY + dirY*i;
            if (fits(posY, posX) && boardArray[posY][posX] !== null && !boardArray[posY][posX].properties.ghost){
                return ((lookForType.includes(boardArray[posY][posX].type)) && (boardArray[posY][posX].col === lookForCol));
            }
        }
        return false;
    }

    //Returns true if an array of moves (the moveset) encounters a threatening piece/pawn, false if not
    function checkMovesetForPiece(king, moveset, lookForType, props = []){
        const kingX = king[0];
        const kingY = king[1];
        const lookForCol = isWhiteTurn ? 'black' : 'white';
        let res = false;
        moveset.forEach((move)=>{
            const posX = kingX + move[0];
            const posY = kingY + move[1];
            if (fits(posY, posX) && boardArray[posY][posX] !== null && props.every((prop)=>boardArray[posY][posX].properties[prop] && !boardArray[posY][posX].properties.ghost)){
                if((boardArray[posY][posX].type === lookForType) && (boardArray[posY][posX].col === lookForCol)){res = true};
            }
        })
        return res;
    }

    //Checks if a position is within the board
    function fits(posY, posX){
        return (posY>=0 && posY<boardArray.length && posX>=0 && posX<boardArray[0].length)
    }
}

//Check if the board is in 'checkmate'
function checkCheckmate(boardArray,isWhiteTurn){
    //1. Iterate through all pieces that can currently move
    //2. Generate all moves that that piece can do
    //3. For each move, check if the king is in check
    const movesets = new GenerateMoveset(isWhiteTurn);
    const lookForTurn = isWhiteTurn ? 'white' : 'black';
    for (let j=0; j<boardArray.length;j++){
        for (let i=0; i<boardArray[j].length;i++){
            const piece = boardArray[j][i];
            if ((piece) && (piece.col === lookForTurn)){
                let pieceMoveset;
                if(piece.properties.big){
                    pieceMoveset = movesets[piece.type].big;
                } else {pieceMoveset = movesets[piece.type];}
                if(pieceMoveset.some((move) => {
                    //if(checkValidMove(i,j,i+move[0],j+move[1],piece,boardState,isWhiteTurn)){console.log(i,j,move, piece)} //Common debug
                    return checkValidMove(i,j,i+move[0],j+move[1],piece,boardArray,isWhiteTurn, false)})
                    ){
                    return false;
                }
            }
        }
    }
    const winner = !isWhiteTurn ? 'white' : 'black';
    console.log(`Checkmate, ${winner} wins!`);
    return true;
}

export function highlightSquares(fromFyle, fromRank, hoverPiece, boardState, isWhiteTurn){
    const movesets = new GenerateMoveset(isWhiteTurn);
    const {boardArray, fromX, fromY} = boardToArray(boardState, fromFyle, fromRank);
    let pieceMoveset;
    if(hoverPiece.properties.big){
        pieceMoveset = movesets[hoverPiece.type].big;
    } else {pieceMoveset = movesets[hoverPiece.type];}

    pieceMoveset.forEach((move) => {
        const toX = fromX+move[0];
        const toY = fromY+move[1];
        if(checkValidMove(fromX,fromY,toX,toY,hoverPiece,boardArray,isWhiteTurn, false)){
            const toRank = boardState.ranks.indexOf(toY);
            const toFyle = boardState.fyles.indexOf(toX);
            const ele = document.querySelector(`td[data-rank = "${toRank}"][data-fyle = "${toFyle}"]`);
            ele.classList.add('validMove');
        }
    });
}

//Generates an exhaustive list of moves a piece can perform
function GenerateMoveset(isWhiteTurn){
    const pawnDir = isWhiteTurn ? -1 : 1;
    this.pawnTake =  [[1,1*pawnDir],[-1,1*pawnDir]];
    this.pawnTake.big = [...this.pawnTake,...this.pawnTake.map((move)=>[2*move[0],2*move[1]])];

    this.pawn =  [[1,1*pawnDir],[-1,1*pawnDir],[0,pawnDir],[0,2*pawnDir]];
    this.pawn.big = [...this.pawn,...this.pawn.map((move)=>[2*move[0],2*move[1]])];

    let kf= 2; let ks = 1; //knight forward, knight side
    this.knight = [[kf,ks],[-kf,ks],[kf,-ks],[-kf,-ks],[ks,kf],[-ks,kf],[ks,-kf],[-ks,-kf]];    
    this.knight.big = [...this.knight,...this.knight.map((move)=>[2*move[0],2*move[1]]),...this.knight.map((move)=>[move[0],2*move[1]]),...this.knight.map((move)=>[2*move[0],move[1]])];

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
//Find all the current-turn kings
//This workflow exists in case we want to get rid of CSS move rule.1 (multiple kings)
function findKings(boardArray, isWhiteTurn){
    let kings = [];
    const turn = isWhiteTurn ? 'white' : 'black';
    for (let j=0; j<boardArray.length;j++){
        for (let i=0; i<boardArray[j].length;i++){
            const piece = boardArray[j][i];
            if ((piece) && (piece.type === 'king') && (piece.col === turn)){
                kings.push([i,j]);
            }
        }
    }
    return kings;
}

//Currently just a dummy function until we can count the number of changes
function checkNumberCssChanges(currentCssText){
    const nextCssText = getCss();
    
    return 1;
    return numberCssChanges;
}
//Updates the board state with any CSS changes
function cssUpdateBoardState(boardState){
    let resBoard = structuredClone(boardState);
    const nextCssText = getCss().split('\n');
    for(let i=0;i<nextCssText.length;i++){
        let line = nextCssText[i];
        const unicodeToPiece = {'\u2659':['white','pawn'],'\u2656':['white','rook'],'\u2658':['white','knight'],'\u2657':['white','bishop'],'\u2654':['white','king'],'\u2655':['white','queen'],
                                '\u265F':['black','pawn'],'\u265C':['black','rook'],'\u265E':['black','knight'],'\u265D':['black','bishop'],'\u265A':['black','king'],'\u265B':['black','queen']};
        if(line.includes('{')){//At some point this will need to debug in case of invalid property.
            lineSelectorRules(i, ['td[data-rank'], 'ranks', 'display', {'none':false,'table-cell':true});
            lineSelectorRules(i, ['td[data-fyle'], 'fyles', 'display', {'none':false,'table-cell':true});
            pieceSelectorRules(i, ['#white', '#black', '.pawn', '.rook','.bishop', '.knight', '.queen', '.piece'], 'content', unicodeToPiece, (val,rN,fN)=>{const pc = resBoard[rN][fN].piece; pc.col = val[0]; pc.type = val[1]});
            pieceSelectorRules(i, ['#white', '#black', '.pawn', '.rook','.bishop', '.knight', '.queen', '.piece'], 'opacity', {'100%':false,'50%':true}, (val,rN,fN)=>{resBoard[rN][fN].piece.properties.ghost = val});
            pieceSelectorRules(i, ['#white', '#black', '.pawn', '.rook','.bishop', '.knight', '.queen', '.piece'], 'font-size', {'3rem':false,'6rem':true}, (val,rN,fN)=>{resBoard[rN][fN].piece.properties.big = val});
            pieceSelectorRules(i, ['#white', '#black', '.pawn', '.rook','.bishop', '.knight', '.queen', '.piece'], 'font-weight', {'normal':false,'bold':true}, (val,rN,fN)=>{resBoard[rN][fN].piece.properties.bold = val});
        }
    }

    function lineSelectorRules(j, selectorStarts, lineType, property, validValues){
        let line = nextCssText[j++];
        if(!selectorStarts.some((selecStart)=>(line.trim().startsWith(selecStart)))){return}
        const lineValueArr = line.split(/["`']/)
        const lineValue = Number(lineValueArr[1]);

        line = nextCssText[j];
        while(!line.includes('}')){
            if(line.includes(':')){
                const styleArr = line.split(':');
                const candidateProperty = styleArr[0].trim();
                const propertyValue = styleArr[1].trim().slice(0,-1);
                if (candidateProperty === property){
                    if (Object.keys(validValues).includes(propertyValue)){
                        const isVisible = validValues[propertyValue];
                        if (isVisible){
                            if(!resBoard[lineType].indexOf(lineValue)){resBoard[lineType].push(lineValue);}
                        } else {
                            console.log(lineValue)
                            const idx = resBoard[lineType].indexOf(lineValue);
                            if(idx>=0){resBoard[lineType].splice(idx, 1);}
                        }                       
                    } else {console.log("Invalid CSS styling value!")}
                }
            }
            j++;
            line = nextCssText[j];
        }
    }

    function pieceSelectorRules(j, selectorStarts, property, validValues, ruleCallback){
        let line = nextCssText[j++];
        if(!selectorStarts.some((selecStart)=>(line.trim().startsWith(selecStart)))){return}
        const selector = line.trim().slice(0,line.trim().indexOf('{'));
        const eles = document.querySelectorAll(selector);
        if ([...eles].some((ele)=>ele.classList.contains('king'))){console.log("CSS moves cannot effect kings!"); return};
        line = nextCssText[j];
        while(!line.includes('}')){
            if(line.includes(':')){
                const styleArr = line.split(':');
                const candidateProperty = styleArr[0].trim();
                const propertyValue = styleArr[1].trim().slice(0,-1);
                if (candidateProperty === property){
                    if (Object.keys(validValues).includes(propertyValue)){
                        const boardStateProp = validValues[propertyValue]
                        eles.forEach((ele)=>{
                            if (ele.classList.contains('piece')){
                                ele = ele.parentElement;
                            }
                            const rankNum = ele.dataset.rank;
                            const rankFyle = ele.dataset.fyle;
                            ruleCallback(boardStateProp, rankNum, rankFyle);
                        })
                    } else {console.log("Invalid CSS styling value!")}
                }
            }
            j++;
            line = nextCssText[j];
        }
    }
    return resBoard;
}

//Creates a 2D array from the board state, it also outputs the array (X,Y) co-ordinates corresponding to the rendered board (fyle, rank) coordinates
function boardToArray(boardState, fromFyle=-1, fromRank=-1, toFyle=-1, toRank=-1){
    let resArray = [];
    let resObject = {boardArray: [], fromX: -1, fromY: -1, toX: -1, toY: -1};
    let yCount = 0;
    for(let rankNum=0; rankNum<8; rankNum++){
        let rank = [];
        let xCount = 0;
        for(let fyleNum=0; fyleNum<8; fyleNum++){
            const curSquare = boardState[rankNum][fyleNum];
            if (boardState.ranks.includes(rankNum) && boardState.fyles.includes(fyleNum)){
                rank.push(curSquare.piece);
                if(fyleNum == fromFyle && rankNum == fromRank){resObject.fromX = xCount; resObject.fromY = yCount};
                if(fyleNum == toFyle && rankNum == toRank){resObject.toX = xCount; resObject.toY = yCount};
                xCount++;
            }
        }
        if(rank.length>0){resArray.push(rank);yCount++};
    }
    resObject.boardArray = resArray;
    return resObject;
}