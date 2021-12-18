const {Buffer}  = require('buffer');
const express   = require('express');
const router    = express.Router();
const msg       = require('../modules/message');
const db        = require('../modules/db');
const ppconfig = require('../modules/ppconfig');

// All Authors Route
router.get('/', (req, res) => {
    Promise.all([
        db.bquery('SELECT a.id, a.aname, a.aImageType, aImage, SUM(b.views) AS s FROM authors a INNER JOIN publish p ON p.authorID = a.id INNER JOIN books b ON b.id=p.bookID GROUP BY a.id ORDER BY s DESC LIMIT 3'),
        db.bquery('SELECT a.id, a.aname, a.aImageType, aImage, SUM(b.votes) AS s FROM authors a INNER JOIN publish p ON p.authorID = a.id INNER JOIN books b ON b.id=p.bookID GROUP BY a.id ORDER BY s DESC LIMIT 3')
    ]).then((results)=>{
        results.forEach(r=>{r.forEach(a=>a.aImage = db.getImgURL(a.aImageType, a.aImage, 'a'))})
        res.render('authors/index', {
            views: results[0],
            votes: results[1]
        })
    }).catch((err)=>{
        msg.display(res, 500, err.sqlMessage, null);
    })
});

router.get('/author', async (req, res)=>{
    let id = parseInt(req.query.id);
    if(Number.isNaN(id)){return msg.display(res, 400, req.query.id, null);}
    try{
        let author = await db.bquery(`SELECT * FROM authors WHERE id=${id}`);
        if(author.length==0){return msg.display(res, 404, 'author not found', null)}
        author = author[0];
        author.aImage = db.getImgURL(author.aImageType, author.aImage, 'a');
        let books = await db.bquery(`SELECT * FROM (SELECT id, title, coverType, coverImage, views, votes FROM books WHERE id IN (SELECT bookID FROM publish WHERE authorID=${id})) AS b
        INNER JOIN book_category bc ON bc.bookID=b.id
        INNER JOIN categories c ON bc.catID=c.id
        GROUP BY b.id`);
        author.adesc = db.processDesc(author.adesc);
        books.forEach(book=>{
            book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
            book.catname = book.name;
        });
        res.render('authors/author_view', {author: author, books: books});
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})

router.post('/addinfo', ppconfig.checkAuthenticated, async (req, res)=>{
    try{
        let update_info = {
            authorID: req.body.authorID,
            userID: req.user.id,
            aImageType: req.body.imgType,
            aImage: Buffer.from(req.body.imgContent, 'base64'),
            adesc: req.body.update_bio
        }
        await db.uquery('INSERT INTO new_authors_info SET ?', update_info);
        msg.display(res, 200, 'Thanks for providing information', '/check.png')
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})
module.exports = router;