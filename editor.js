// //Create the monaco text editor element
require.config({ paths: { vs: 'node_modules/monaco-editor/min/vs' } });
var editor;
require(['vs/editor/editor.main'], function () {
    fetch('CheSS-styles.css').then(res => res.text()).then(initialCSS => {
        editor = monaco.editor.create(document.getElementById('text-editor'), {
            value: initialCSS,
            language: 'css',
            theme: 'vs-dark'
        });
    })

    
});



export function updateEditor(){
    fetch('CheSS-styles.css').then(res => res.text()).then(cssText => {
        editor.setValue(cssText)
    })
}


export function updateCSS(){
    const newCSS = editor.getValue();
}
