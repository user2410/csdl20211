const express = require('express');
const router = express.Router();
const db = require('../modules/db');
const msg = require('../modules/message');
const mailer = require('../modules/mailer');
const ppconfig = require('../modules/ppconfig');
const OTP = require('../modules/otp');
const bcrypt = require('bcrypt');
const { writeLog } = require('../modules/log');

router.get('/', async (req, res) => {
    try{
        // let lim = parseInt(req.query.lim);
        // lim = Number.isNaN(lim) ? 8 : lim;
        let results = await db.bquery(`CALL index_view(8)`);
        results.pop();
        results.forEach(r => r.forEach(b => b.coverImage = db.getImgURL(b.coverType, b.coverImage, 'b')));
        res.render('index', {
            votes: results[0],
            views: results[1],
            news: results[2]
        })
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
});

router.get('/login', ppconfig.checkNotAuthenticated, (req, res) => {res.render('login');})
  
router.post('/login', ppconfig.checkNotAuthenticated, ppconfig.passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

// password changing routes

router.post('/forget', async(req, res)=>{
    let uID, otp = null;
    try{
        uID = await db.uquery('SELECT id FROM users WHERE email=?', [req.body.email]);
        if(uID.length == 0){
            res.render('login', {messages: {error: 'No user with such email'}});
        }else{
            uID = uID[0].id;
            otp = OTP.createOTP(uID);
            await mailer.sendEmail({
                from: '"Mylibrary Team" <noreply@ender.com>',
                to: req.body.email,
                subject: 'Recovery passcode',
                html: `Use this code to change your password: <strong>${otp}</strong><br>Best regards<br><strong>Mylibrary Team</strong>`
            })
            res.render('otp', {toDo: 'forget', uID: uID});
        }
    }catch(err){
        writeLog(err);
        OTP.removeOTP(uID, otp);
        msg.display(res, 500, msg.msg500, null);
    }
});

router.post('/renewPass', ppconfig.checkNotAuthenticated, async (req, res)=>{
    let uID = parseInt(req.body.uID);
    let otp = parseInt(req.body.otp);
    try{
        if(OTP.getIndex(uID, otp)>-1){
            let hashedPassword = await bcrypt.hash(req.body.newPass, 10);
            await db.uquery(`UPDATE users SET pass=? WHERE id=${uID}`, [hashedPassword]);
            res.render('login', {messages: {error: 'Successfully changed your password'}});
        }else{
            res.render('login', {messages: {error: 'Wrong credential'}});
        }
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
});

router.get('/changePass', ppconfig.checkAuthenticated, (req, res)=>res.render('users/changePassword', {change: true}))

router.post('/changePass', ppconfig.checkAuthenticated, async (req, res)=>{
    if(req.body.forget == 'true'){
        req.logout();
        return res.render('login', {email: req.user.email});
    }
    try{
        let user = await db.uquery(`SELECT pass FROM users WHERE id=${req.user.id}`);
        user = user[0];
        if(await bcrypt.compare(req.body.oldPass, user.pass)){
            let hashedPassword = await bcrypt.hash(req.body.newPass, 10);
            await db.uquery(`UPDATE users SET pass=? WHERE id=${req.user.id}`, [hashedPassword]);
            res.render('login', {messages: {error: 'Successfully changed your password'}});
        }else{
            res.render('users/changePassword', {messages: {error: 'Wrong password'}})
        }
    }catch(err){
        writeLog(err);
        res.render('changePassword', {messages: {error: 'Internal server error'}});
    }
});

// registering routes
router.get('/register', ppconfig.checkNotAuthenticated, (req, res) => {res.render('register');})

router.post('/register', ppconfig.checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.pass, 10);
        await db.uquery('INSERT INTO users SET ?', {
            name: req.body.name,
            pass: hashedPassword,
            email: req.body.email,
            identity: req.body.id,
            avatar: Buffer.from(req.body.imgContent, 'base64'),
            avatarType: req.body.imgType,
            stat: 'inactive'
        });
        let newUserID = await db.uquery('SELECT @newUserID as id');
        let otp = createOTP(newUserID[0].id);
        await mailer.sendEmail({
            from: '"Mylibrary Team" <noreply@ender.com>',
            replyTo: 'noreply@ender.com',
            to: 'req.body.email',
            subject: 'Welcome to my library',
            html: `Use this code to verify your registration ${otp}<br>Best regards<br><strong>Mylibrary Team</strong>`,
          });
        res.render('otp', {toDo: 'activate', uID: newUserID});
    } catch(err) {
        writeLog(err);
        res.redirect('/register');
    }
})

router.post('/verify/:toDo', async (req, res)=>{
    let uID = parseInt(req.body.uID);
    let otp = parseInt(req.body.otp);
    try{
        if(OTP.getIndex(uID, otp)>-1){
            switch(req.params.toDo){
                case 'forget':
                    res.render('renewPassword', {uID: uID, otp: otp});
                    break;
                case 'activate':
                    await db.uquery(`UPDATE users SET stat='active' WHERE userID=${uID}`);
                    OTP.removeOTP(uID, otp);
                    res.render('login', {messages: {error: 'Welcome to MyLibrary<br>Please login again'}});
                    break;
                default:
                    res.redirect('/');
            }
        }else{
            res.render('login', {messages: {err: 'wrong credential'}});
       }
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
})

// logout
router.delete('/logout', ppconfig.checkAuthenticated, (req, res) => {
    req.logOut();
    res.redirect('/login');
})

module.exports = router;