//Closure for logging to the logger element
export const logger = (()=>{
    const loggerEle = document.getElementById('logger');
    let lineNum = 1;
    return (msg)=>{
        console.log(msg);
        const line = document.createElement('p');
        line.innerHTML = lineNum + ': ' +msg;
        lineNum++;
        loggerEle.appendChild(line);
    }
})();
