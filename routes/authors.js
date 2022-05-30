const {Buffer}  = require('buffer');
const express   = require('express');
const router    = express.Router();
const msg       = require('../modules/message');
const db        = require('../modules/db');
const ppconfig = require('../modules/ppconfig');
const { writeLog } = require('../modules/log');

// All Authors Route
router.get('/', async (req, res) => {
    let lim = parseInt(req.query.lim);
    lim = Number.isNaN(lim) ? 4 : lim;
    try{
        let results = await db.bquery(`CALL indexAuth(${lim})`);
        results.pop();
        results.forEach(r=>{r.forEach(a=>a.aImage = db.getImgURL(a.aImageType, a.aImage, 'a'))})
        res.render('authors/index', {
            views: results[0],
            votes: results[1]
        })
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
});

router.get('/author/:id', async (req, res)=>{
    let id = parseInt(req.params.id);
    if(Number.isNaN(id)){return msg.display(res, 400, req.query.id, null);}
    try{
        let author = await db.bquery(`CALL getAuthDetails(${id})`);
        if(author[0].length==0){return msg.display(res, 404, 'author not found', null)}
        author[0] = author[0][0];
        author[0].aImage = db.getImgURL(author[0].aImageType, author[0].aImage, 'a');
        author[0].adesc = db.processDesc(author[0].adesc);
        author[1].forEach(book=>{
            book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
            book.catname = book.name;
        });
        res.render('authors/author_view', {author: author[0], books: author[1]});
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
})

router.post('/addinfo', ppconfig.checkAuthenticated, async (req, res)=>{
    try{
        await db.uquery('INSERT INTO new_authors_info SET ?', {
            authorID: req.body.authorID,
            userID: req.user.id,
            aImageType: req.body.imgType,
            aImage: Buffer.from(req.body.imgContent, 'base64'),
            adesc: req.body.update_bio
        });
        msg.display(res, 200, 'Thanks for providing information', '/check.png')
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
})
module.exports = router;