if(process.env.NODE_ENV == "dev")
    require('dotenv').config();
    // environment variables:
    // NODE_ENV
    // PORT

    // BODYPARSER_URLENCODED_LIM
    // BODYPARSER_URLENCODED_EXTENDED

    // SESSION_SECRET
    // SESSION_COOKIE_MAXAGE

    // DB_CONNECTION_LIM
    // DB_HOST
    // DB_USER
    // DB_PASS

    // EMAIL
    // REFRESH_TOKEN
    // CLIENT_SECRET
    // CLIENT_ID

const express = require('express');
const app = express();
const expressLayout = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const db = require('./modules/db');
const mailer = require('./modules/mailer');
const {writeLog} = require('./modules/log');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('layout', 'layouts/layout');
app.use(expressLayout);
app.use(express.static('public'));
app.use(bodyParser.urlencoded({limit: process.env.BODYPARSER_URLENCODED_LIM || '10mb', extended: false}));

const ppconfig = require('./modules/ppconfig');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

app.use(flash());
const cookieAge = parseInt(process.env.SESSION_COOKIE_MAXAGE) || 3600000;
app.use(session({
    secret: process.env.SESSION_SECRET || 'vj34rc249123rn',
    resave: false,
    saveUninitialized: false,
    cookie: {expires: cookieAge}
}));

app.use(ppconfig.passport.initialize())
app.use(ppconfig.passport.session());
app.use(methodOverride('_method'));

// render objects
app.use((req, res, next)=>{
    res.locals.cats = db.cats;
    res.locals.path = req.path.slice(req.path.lastIndexOf('/')+1);
    if(req.isAuthenticated()){
        res.locals.user = req.user;
        req.session.cookie.expires = new Date(Date.now() + cookieAge);
        if(req.user.role == 'member'){
            db.uquery(`CALL getNotifications(${req.user.id})`)
            .then((results)=>{
                results.pop();
                res.locals.notifications = results;
                next();
            }).catch((err)=>{
                console.error(err);
                res.locals.notifications = db.error(err);
                next();
            })
        }else{next();}
    }else{next();}
});

const indexRouter   = require('./routes/index');
const authorRouter  = require('./routes/authors');
const bookRouter    = require('./routes/books');
const userRouter    = require('./routes/users');
const staffRouter   = require('./routes/staffs');
const adminRouter   = require('./routes/admin');
app.use('/', indexRouter);
app.use('/authors', authorRouter);
app.use('/books', bookRouter);
app.use('/users', userRouter);
app.use('/staffs', staffRouter);
app.use('/admin', adminRouter);

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`Listening on port ${port}`));

const proc = require('process');
function shutdown(err){
    console.error(`About to exit with code ${err}`);
    writeLog(`About to exit with code ${err}`);
    db.books.end((err)=>console.error(err));
    db.users.end((err)=>console.error(err));
    mailer.transporter.close();
    server.close();
    process.exit(0);
}
// proc.on('exit', shutdown);
proc.on('SIGINT', shutdown);
proc.on('SIGTERM', shutdown);
proc.on('SIGABRT', shutdown);