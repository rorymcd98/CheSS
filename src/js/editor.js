//Create the monaco text editor element
import * as monaco from 'monaco-editor';

export function initEditor(callback){
    monaco.editor.onDidCreateModel(()=>{
        callback();
    })

    const editor = monaco.editor.create(document.getElementById('text-editor'), {
        value: '',
        language: 'css',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 20
    });

    //Allows for pieces, legend to be dropped into the text editor for automatic text rendering
    const textEditorEle = document.getElementById('text-editor');
    textEditorEle.addEventListener('drop', (e)=>{
        e.preventDefault();
        const currentCssText = window.gameData.gameTurnList.current.cssText;
        const currentBoardState = window.gameData.gameTurnList.current.boardState;
        const drgEle = document.querySelector('.dragging');
        
        let appendEditorText = "";
        if(drgEle.tagName === 'TEXT'){
            const rankNum = drgEle.parentElement.dataset.rank;
            const fyleNum = drgEle.parentElement.dataset.fyle;
            const pieceObj = currentBoardState[rankNum][fyleNum].piece;
            const pieceProps = pieceObj.properties;
            const pieceToUnicode = {'white':{'pawn':'\u2659','rook':'\u2656','knight':'\u2658','bishop':'\u2657','king':'\u2654','queen':'\u2655'},
                                    'black':{'pawn':'\u265F','rook':'\u265C','knight':'\u265E','bishop':'\u265D','king':'\u265A','queen':'\u265B'}}

            appendEditorText =
`#${drgEle.id}{
    content: ${pieceToUnicode[pieceObj.col][pieceObj.type]};
    font-size: ${pieceProps.big ? '6vw' : '3vw'};
    font-weight: ${pieceProps.bold ? 'bold' : 'normal'};
    opacity: ${pieceProps.ghost ? '50%' : '100%'};
}\n`;
    } else if (drgEle.tagName === 'TD'){
        appendEditorText =
`td[data-${drgEle.hasAttribute('data-leg-rank')?`rank = "${drgEle.dataset.legRank}"]`:`fyle = "${drgEle.dataset.legFyle}"]`}{
    display: table-cell;
}\n`
    }
        let nextEditorText = currentCssText + appendEditorText;
        setCss(nextEditorText);
    })
}

export function setCss(cssText){
    monaco.editor.getModels()[0].setValue(cssText);
}
export function getCss(){
    return monaco.editor.getModels()[0].getValue();
}