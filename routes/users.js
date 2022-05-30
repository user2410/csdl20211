const express = require('express');
const router = express.Router();
const db    = require('../modules/db');
const ppconfig = require('../modules/ppconfig');
const msg   = require('../modules/message');
const {writeLog} = require('../modules/log');

router.use(ppconfig.checkAuthenticated);

// user profile
router.get('/user', async (req, res)=>{
    let id = parseInt(req.query.id);
    id = id || req.user.id;
    try{
        let usr = await db.uquery(`SELECT * FROM users WHERE id=${id}`);
        usr = usr[0];
        usr.avatar = db.getImgURL(usr.avatarType, usr.avatar, 'a');
        // let borrowed_books = await db.uquery(`SELECT * FROM (SELECT * FROM borrow WHERE userID=${req.user.id}) borrow INNER JOIN (SELECT id, title FROM csdl20211_books.books) b ON borrow.bookID=b.id`)
        res.render('users/profile', {usr: usr});
    }catch(err){
        writeLog(err);
        msg.display(res, 500, db.error(err), null);
    }
})

// get all books currently loaned by users
router.get('/borrow', async (req, res)=>{
    try{
        let books = await db.bquery(`SELECT borrow.bookID, b.title, borrow.loanDate, borrow.expireDate, borrow.returnDate FROM books b
        INNER JOIN csdl20211_users.borrow borrow ON borrow.bookID=b.id
        WHERE borrow.userID=${req.user.id} AND stat='await'`);
        res.render('users/borrowed_books', {books: books})
    }catch(err){
        writeLog(err);
        msg.display(res, 500, db.error(err), null);
    }
})

// user borrow a copy
router.post('/borrow', async (req, res)=>{
    let bookID = parseInt(req.body.bookID);
    if(Number.isNaN(bookID)){res.json({success: false, message: req.body.bookID})}
    try{
        let period = parseInt(req.body.period);
        if(![1, 7, 15, 30, 90].includes(period)){return res.json({success: false, message: req.body.period})}
        let status = await db.uquery(`CALL borrowBook(${req.user.id}, ${bookID}, ${req.user.credit}, ${period})`);
        status = status[0][0];
        res.json({success: status.code == 0 ? true : false, message: status.message});
    }catch(err){
        writeLog(err);
        res.json({success: false, message: db.error(err)});
    }
})

// user return a copy
router.delete('/borrow/:bookID', async (req, res)=>{
    let bookID = parseInt(req.params.bookID);
    if(Number.isNaN(bookID)){res.json({success: false, message: req.params.bookID})}
    try{
        let status = await db.uquery(`CALL returnBook(${req.user.id}, ${bookID})`);
        status = status[0][0];
        res.json({success: status.code == 0 ? true : false, message: status.message});
    }catch(err){
        writeLog(err);
        return res.json({success: false, message: db.error(err)})
    }
})

router.get('/report', async(req, res)=>{
    let bookID = parseInt(req.query.b);
    if(Number.isNaN(bookID)){res.redirect('/');}
    try{
        let report = await db.uquery(`SELECT * FROM borrow NATURAL JOIN borrow_exam HAVING bookID=${bookID} AND userID=${req.user.id} AND stat='checked'`);
        report.forEach(r=>r.image = db.getImgURL(r.imageType, r.image, 'b'));
        let book = await db.bquery('SELECT title, coverImage, coverType, price FROM books WHERE id=?', [req.query.b]);
        book = book[0];
        book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
        res.render('users/report', {report: report, book: book});
        await db.uquery(`UPDATE borrow SET stat='seen' WHERE bookID=${bookID} AND userID=${req.user.id} AND stat='checked'`);
    }catch(err){
        writeLog(err);
        msg.display(res, 500, db.error(err), null);
    }
})
module.exports = router;