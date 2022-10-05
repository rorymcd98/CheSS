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

export class TurnList{
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
class Piece{
    constructor (col, type, unmoved, fyle, properties = {bold: false, big: false, ghost: false}) {
        this.col = col;
        this.type = type;
        this.unmoved = unmoved;
        this.fyle = fyle;
        this.properties = properties;
        this.objectId = this.col + '-' + this.fyle + '-' + this.type;
    }
}

//Creates the default board, constructed once per new-game
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

export const defaultBoardState = new DefaultBoard();
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