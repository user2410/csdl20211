const express = require('express');
const router = express.Router();
const db    = require('../modules/db');
const msg   = require('../modules/message');

router.use((req, res, next)=>{
    if(req.isAuthenticated()){
        if(req.user.role == 'staff'){
            return next();
        }
    }
    return res.redirect('/');
});

// staffs view all requests
router.get('/requests/:toUpdate', async (req, res)=>{
    switch(req.params.toUpdate){
        case 'books':
            try{
                let results = await db.uquery('CALL getRequestedBooks()');
                results[0].forEach(book => {
                    book.cats = results[1].filter(cat => cat.id == book.id);
                    book.cats.forEach(cat => cat.name = db.cats.find(c => c.id == cat.catID).name)
                    book.authors = results[2].filter(publish => publish.id == book.id);
                    book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
                    book.uname = results[3].find(user => user.id == book.userID).name;
                    book.bdesc = db.processDesc(book.bdesc);
                });
                res.render('staffs/requests', {books: results[0]});
            }catch(err){
                writeLog(err);
                msg.display(res, 500, msg.msg500, null);
            }
            break;
        case 'authors':
            try{
                let authors = await db.uquery('SELECT * FROM getRequestedAuths');
                for(let a of authors){
                    a.aImage = db.getImgURL(a.aImageType, a.aImage, 'a');
                }
                res.render('staffs/requests', {authors: authors});
            }catch(err){
                writeLog(err);
                msg.display(res, 500, msg.msg500, null);
            }
            break;
        case 'returns':
            try{
                let returns = await db.uquery(`SELECT borrow.bookID, b.title, borrow.userID, u.name, borrow.loanDate, borrow.expireDate, borrow.returnDate, b.price FROM (SELECT * FROM borrow WHERE stat='ret') borrow
                INNER JOIN (SELECT id, title, price FROM csdl20211_books.books) b ON borrow.bookID=b.id
                INNER JOIN (SELECT id, name FROM users) u ON u.id=borrow.userID`);
                res.render('staffs/requests', {returns: returns});
            }catch(err){
                writeLog(err);
                msg.display(res, 500, msg.msg500, null);
            }
            break;
        default:
            res.redirect('/');
    }
});

// receive and process new book ajax query
router.put('/accept/:id', async (req, res)=>{
    let id=parseInt(req.params.id.slice(1));
    if(Number.isNaN(id)){return res.json({success: false, message: req.params.id})}            
    switch(req.params.id[0]){
        case 'b':
            try{
                let status = await db.uquery(`CALL acceptBook(${id})`);
                status = status[0][0];
                res.json({success: status.code == 0 ? true : false, message: status.message});
            }catch(err){
                writeLog(err);
                res.json({success: false, message: msg.msg500})
            }
            break;
        case 'a':
            try{
                let status = await db.uquery(`CALL acceptAuth(${id})`);
                status = status[0][0];
                res.json({success: status.code == 0 ? true : false, message: status.message});
            }catch(err){
                writeLog(err);
                res.json({success: false, message: msg.msg500})
            }
            break;
        default:
            res.redirect('/');
    }
});

router.delete('/accept/:id', async (req, res)=>{
    switch(req.params.id[0]){
        case 'b':
            id = parseInt(req.params.id.slice(1));
            if(Number.isNaN(id)){return res.json({success: false, message: req.params.id})}
            try{
                await db.uquery(`UPDATE new_books SET stat='dec' WHERE id=${id}`);
                res.json({success: true, message: 'Successfully declined a new book entry'});
            }catch(err){
                writeLog(err);
                res.json({success: false, message: msg.msg500});
            };
            break;
        case 'a':
            id = parseInt(req.params.id.slice(1));
            if(Number.isNaN(id)){return res.json({success: false, message: req.params.id})}
            try{
                await db.uquery(`UPDATE new_authors_info SET stat='dec' WHERE authorID=${id}`);
                res.json({success: true, message: 'Successfully declined a new author entry'});
            }catch(err){
                writeLog(err);
                res.json({success: false, message: msg.msg500});
            };
            break;
        default:
            res.redirect('/');
    }
})

// Return report
router.post('/return', async(req, res)=>{
    try{
        for(let i=0;;i++){
            if(!req.body[`comment${i}`] || !req.body[`imgContent${i}`] || !req.body[`imgType${i}`]) break;
            await db.uquery('INSERT INTO borrow_exam SET ?', {
                bookID: req.body.bookID,
                userID: req.body.userID,
                remark: req.body[`comment${i}`],
                image: Buffer.from(req.body[`imgContent${i}`], 'base64'),
                imageType: req.body[`imgType${i}`],
                severity: req.body[`severity${i}`]
            })
        }
        await db.uquery('UPDATE users SET credit=credit-? WHERE id=?', [parseFloat(req.body.totalFine), req.body.userID]);
        await db.uquery(`UPDATE borrow SET stat='checked' WHERE bookID=? AND userID=? AND stat='ret'`, [req.body.bookID, req.body.userID])
        res.json({success: true, message: 'Report submitted'});
    }catch(err){
        writeLog(err);
        await db.uquery(`UPDATE borrow SET stat='ret' WHERE bookID=? AND userID=? AND stat='checked'`, [req.body.bookID, req.body.userID]);
        res.json({success: false, message: msg.msg500});
    }
})
module.exports = router;