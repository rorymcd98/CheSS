import {initBoard} from './main.js'
//Create the monaco text editor element
require.config({ paths: { vs: 'node_modules/monaco-editor/min/vs' } });
require(['vs/editor/editor.main'], function () {
    fetch('CheSS-styles.css').then(res => res.text()).then(initialCSS => {
        monaco.editor.onDidCreateModel(()=>{
            initBoard();
        })
        const editor = monaco.editor.create(document.getElementById('text-editor'), {
            value: initialCSS,
            language: 'css',
            theme: 'vs-dark'
        });

    })
});

export function setCss(cssText){
    monaco.editor.getModels()[0].setValue(cssText);
}

export function getCss(){
    return monaco.editor.getModels()[0].getValue();
}

