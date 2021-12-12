const express = require('express');
const router = express.Router();
const db = require('../modules/db');
const msg = require('../modules/message');
const ppconfig = require('../modules/ppconfig');

router.get('/', (req, res) => {
    Promise.all([
        db.bquery('SELECT id, title, coverType, coverImage, views, votes FROM books ORDER BY votes DESC LIMIT 6'),
        db.bquery('SELECT id, title, coverType, coverImage, views, votes FROM books ORDER BY views DESC LIMIT 6'),
        db.bquery('SELECT id, title, coverType, coverImage, views, votes FROM books ORDER BY createAt DESC LIMIT 6'),
    ]).then((results)=>{
        results.forEach(r => r.forEach(b => b.coverImage = db.getImgURL(b.coverType, b.coverImage, 'b')));
        res.render('index', {
            votes: results[0],
            views: results[1],
            news: results[2]
        })
    }).catch((err)=>{
        console.error(err);
        msg.display(res, 500, err.sqlMessage, null);
    })
});

router.get('/login', ppconfig.checkNotAuthenticated, (req, res) => {res.render('login.ejs');})
  
router.post('/login', ppconfig.checkNotAuthenticated, ppconfig.passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

router.get('/register', ppconfig.checkNotAuthenticated, (req, res) => {res.render('register.ejs');})

router.post('/register', ppconfig.checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.pass, 10)
        await db.uquery('INSERT INTO users SETS ?', {
            name: req.body.name,
            pass: hashedPassword,
            email: req.body.email,
        });
        res.redirect('/login');
    } catch {
        res.redirect('/register')
    }
})

router.delete('/logout', ppconfig.checkAuthenticated, (req, res) => {
    req.logOut();
    res.redirect('/login');
})

module.exports = router;