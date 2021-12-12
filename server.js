require('dotenv').config();

const express = require('express');
const app = express();
const expressLayout = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const db = require('./modules/db');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.use(expressLayout);
app.use(express.static('public'));
app.use(bodyParser.urlencoded({limit: '10mb', extended: false}));

const ppconfig = require('./modules/ppconfig');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET || 'vj34rc249123rn',
    resave: false,
    saveUninitialized: false
}));
app.use(ppconfig.passport.initialize())
app.use(ppconfig.passport.session());
app.use(methodOverride('_method'));

// render objects
app.use((req, res, next)=>{
    res.locals.cats = db.cats;
    res.locals.user = req.isAuthenticated() ? req.user : null;
    next();
})
const indexRouter   = require('./routes/index');
const authorRouter  = require('./routes/authors');
const bookRouter    = require('./routes/books');
const userRouter    = require('./routes/users');
app.use('/', indexRouter);
app.use('/authors', authorRouter);
app.use('/books', bookRouter);
app.use('/users', userRouter);

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