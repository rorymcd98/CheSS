//Closure function for logging to the logger element
export const logger = (()=>{
    const loggerEle = document.getElementById('logger');
    return (msg)=>{
        console.log(msg);
        line = document.createElement('p');
        line.innerText = msg;
        loggerEle.appendChild(line);
    }
})
