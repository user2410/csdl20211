const fs = require('fs');
const path = require('path');

// console.log(path.join(__dirname, '../server.js'));
// console.log(fs.existsSync(path.join(__dirname, '../server.js')));

function writeLog(content){
    let date = new Date().toISOString().split('T');
    let time = date.pop();
    let today = date.pop();
    let filename = `${today}.log`;
    let _path = path.join(__dirname, `../logs/${filename}`);
    
    if(content instanceof Object){
        content = JSON.stringify(content, null, 2);
    }else{
        content = `${content}`;
    }
    content = `${time}:${content}\n`;

    fs.writeFileSync(_path, content, {flag: 'a'});
}

module.exports = {writeLog: writeLog};