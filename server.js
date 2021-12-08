require('dotenv').config();

const express = require('express');
const app = express();
const expressLayout = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const db = require('./modules/db');

const indexRouter   = require('./routes/index');
// const authorRouter  = require('./routes/authors');
const bookRouter    = require('./routes/books');
// const userRouter    = require('./routes/users');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.use(expressLayout);
app.use(express.static('public'));
app.use(bodyParser.urlencoded({limit: '10mb', extended: false}))

app.use('/', indexRouter);
// app.use('/authors', authorRouter);
app.use('/books', bookRouter);
// app.use('/users', userRouter);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Listening on port ${port}`));

const proc = require('process');
function shutdown(err){
    console.error(`About to exit with code ${err}`);
    db.books.end((err)=>console.error(err));
    db.users.end((err)=>console.error(err));
    server.close();
    process.exit(1)
}
proc.on('SIGINT', shutdown);
proc.on('SIGTERM', shutdown);
proc.on('SIGKILL', shutdown);