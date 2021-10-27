const mysql = require('mysql');
// var config = require('./config.json');

// Create connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'csdl20211',
});

// Connect to MySQL
db.connect((err)=>{
    if(err){throw err;}
    console.log('MySQL connected');
});

module.exports = db;