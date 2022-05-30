const mysql = require('mysql');
const {Buffer} = require('buffer');
const util = require('util');
const { writeLog } = require('./log');

const db_books = mysql.createPool({
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIM) || 10,
    host    : process.env.DB_HOST || '127.0.0.1',
    user    : process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: 'csdl20211_books'
});

const db_users = mysql.createPool({
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIM) || 10,
    host    : process.env.DB_HOST || '127.0.0.1',
    user    : process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: 'csdl20211_users'
});

const bquery = util.promisify(db_books.query).bind(db_books);
const uquery = util.promisify(db_users.query).bind(db_users);

const imgTypes = ['apng', 'gif', 'ico', 'cur', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'svg'];
const getImgURL = function(imgType, imgData, type){
    if(imgData instanceof Buffer && imgTypes.includes(imgType)){
        return `data:image/${imgType};base64,${imgData.toString('base64')}`
    }
    switch(type){
        case 'b':
            return '/blank_cover.png';
        case 'a':
            return '/unknown_author.png';
        default:
            return '/white.jpg'
    }
}

const processDesc = function (desc){
    try{
        while(desc.includes('\n')){
            desc = desc.replace('\n', '<br>');
        }
        return desc;
    }catch{return null;}
}

//SELECT id, name, count(bookID) as counts FROM categories c INNER JOIN book_category bc ON bc.catID = c.id GROUP BY id
db_books.query('SELECT * FROM categories', (err, res)=>{
    if(err){
        writeLog(err);
        process.exit(1);
    }
    module.exports.cats = res;
})

module.exports.books = db_books;
module.exports.users = db_users;
module.exports.bquery = bquery;
module.exports.uquery = uquery;
module.exports.getImgURL = getImgURL;
module.exports.processDesc = processDesc;
module.exports.error = (err)=>{return 'database error' + ((err) ? `: ${err.sqlMessage}` : '')}