require('dotenv').config();

const express = require('express');
const app = express();
const expressLayout = require('express-ejs-layouts');

const indexRouter = require('./routes/index');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.use(expressLayout);
app.use(express.static('public'));

const mysql = require('mysql');
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


app.use('/', indexRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));