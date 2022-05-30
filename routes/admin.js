const express = require('express');
const router = express.Router();
const db    = require('../modules/db');
const { writeLog } = require('../modules/log');
const msg   = require('../modules/message');

router.use((req, res, next)=>{
    if(req.isAuthenticated()){
        if(req.user.role == 'admin'){
            return next();
        }
    }
    return res.redirect('/');
});

router.get('/manage', async(req, res)=>{
    try{
        let users = await db.uquery('SELECT id, name, email, role, stat FROM users');
        res.render('admin/users', {users: users});
    }catch(err){
        writeLog(err);
        msg.display(res, 500, db.error(err), null);
    }
});

router.delete('/user/:id', async(req, res)=>{
    try{
        await db.uquery(`DELETE FROM users WHERE id=${req.params.id}`);
        res.json({success: true, message: 'User deleted'});
    }catch(err){
        writeLog(err);
        res.json({success: false, message: msg.msg500});
    }
});

router.delete('/book/:id', async(req, res)=>{
    try{
        await db.bquery(`DELETE FROM books WHERE id=${req.params.id}`);
        res.json({success: true, message: 'Book entry deleted'});
    }catch(err){
        writeLog(err);
        res.json({success: false, message: msg.msg500});
    }
});

router.get('/statistic', async (req, res)=>{
    let lim = parseInt(req.query.lim);
    lim = lim || 5;
    try{
        let statistic = await db.uquery(`getStatistic(${lim})`);
        res.render('admin/statistic', {statistic: statistic});
    }catch(err){
        writeLog(err);
        msg.display(res.render, 500, msg.msg500, null);
    }
})

module.exports = router;