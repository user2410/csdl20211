const passport  = require('passport');
const LocalStrategy = require('passport-local').Strategy
const bcrypt    = require('bcrypt');
const db        = require('./db');

const authenticateUser = async (email, pass, done) => {
try {
    const users = await db.uquery('SELECT id, pass FROM users WHERE email=?', [email]);
    if (users.length == 0) {
        return done(null, false, { message: 'No user with that email' })
    }
    for(let user of users){
        if(await bcrypt.compare(pass, user.pass)){return done(null, user);}
    }
    return done(null, false, { message: 'Password incorrect' })
    } catch (e) {
    return done(e)
    }
}

passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'pass' }, authenticateUser))
passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => {
    db.uquery(`SELECT * FROM users WHERE id=${id}`)
    .then((res)=>{
        return done(null, res[0])
    }).catch((err)=>{
        done(err.sqlMessage);
        process.exit(143);
    })
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next();}
    res.redirect('/');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return res.redirect('/');}
    next();
}

function isStaff(req, res, next){
    if(req.user.role == 'staff' || req.user.role == 'admin'){return next();}
    res.redirect('/');
}

module.exports = {
    passport: passport,
    checkAuthenticated: checkAuthenticated,
    checkNotAuthenticated: checkNotAuthenticated,
    isStaff: isStaff
}