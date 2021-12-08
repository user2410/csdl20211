const express   = require('express');
const router    = express.Router()
const db        = require('../modules/db');
const msg       = require('../modules/message');

router.get('/', async (req, res)=>{
    let _orderBy = ['title', 'views', 'votes', 'createAt']
    let orderBy = _orderBy.indexOf(req.query.orderBy);
    orderBy = orderBy == -1 ? 1 : orderBy;
    let _order = ['asc', 'desc']
    let order = _order.indexOf(req.query.order);
    order = order == -1 ? 1 : order;
    
    let book_query = 'books';
    let author_query = 'authors';
    let cat_query = '';
    if(req.query.title){if(req.query.title.length > 0){book_query = `(SELECT id, title, coverType, coverImage FROM books WHERE title LIKE '%${db.books.escape(req.query.title).slice(1,-1)}%')`}}
    if(req.query.aname){if(req.query.title.length > 0){author_query = `(SELECT id, aname FROM authors WHERE aname LIKE '%${db.books.escape(req.query.aname).slice(1,-1)}%')`}}
    let cat = parseInt(req.query.cat);
    if(!Number.isNaN(cat) && cat>0){cat_query = `WHERE bc.catID = ${cat}`}

    try{
        let books = await db.bquery(`SELECT * FROM ${book_query} AS b
        INNER JOIN book_category bc
        ON bc.bookID = b.id
        INNER JOIN publish p
        ON p.bookID = b.id
        INNER JOIN ${author_query} a
        ON a.id = p.authorID
        GROUP BY p.bookID ${cat_query} LIMIT 25`);
        books.forEach(book=>{
            book.catname = db.cats.find(cat => cat.id = book.catID).name;
            book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
        })
        res.render('books/',{books: books, cats: db.cats})
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})
router.get('/book', (req, res)=>{})
router.get('/cats', (req, res)=>{})

module.exports = router;