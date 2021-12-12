const {Buffer}  = require('buffer');
const express   = require('express');
const router    = express.Router();
const db        = require('../modules/db');
const msg       = require('../modules/message');
const ppconfig  = require('../modules/ppconfig');

router.get('/', async (req, res)=>{
    let _orderBy = ['title', 'views', 'votes', 'createAt']
    let orderBy = _orderBy.indexOf(req.query.orderBy);
    orderBy = orderBy == -1 ? 1 : orderBy;
    let _order = ['asc', 'desc']
    let order = _order.indexOf(req.query.order);
    order = order == -1 ? 1 : order;
    
    let book_query = 'SELECT id, title, createAt, coverType, coverImage, views, votes FROM books ';
    let author_query = 'SELECT id, aname FROM authors ';
    let cat_query = '';
    if(req.query.title){if(req.query.title.length > 0){book_query += `WHERE title LIKE '%${db.books.escape(req.query.title).slice(1,-1)}%'`}}
    if(req.query.aname){if(req.query.title.length > 0){author_query = `WHERE aname LIKE '%${db.books.escape(req.query.aname).slice(1,-1)}%'`}}
    let cat = parseInt(req.query.cat);
    if(!Number.isNaN(cat) && cat>0){cat_query = `WHERE bc.catID = ${cat}`}

    try{
        let books = await db.bquery(`SELECT * FROM (${book_query}) AS b
        INNER JOIN book_category bc ON bc.bookID = b.id
        INNER JOIN publish p ON p.bookID = b.id
        INNER JOIN (${author_query}) a ON a.id = p.authorID
        ${cat_query} GROUP BY p.bookID ORDER BY b.${_orderBy[orderBy]} ${_order[order]} LIMIT 25`);
        books.forEach(book=>{
            book.catname = db.cats.find(cat => cat.id = book.catID).name;
            book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
        })
        res.render('books/index', {books: books, cats: db.cats})
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})

router.get('/book', async(req, res)=>{
    let id = parseInt(req.query.id);
    if(Number.isNaN(id)){return msg.display(res, 400, req.query.id, null);}

    try{
        // get the book
        let book = await db.bquery(`SELECT * FROM books WHERE id=${id}`);
        if(book.length == 0){throw {sqlMessage: 'book not found'}}
        book = book[0];
        book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
        // get all authors
        book.authors = await db.bquery(`SELECT id, aname FROM authors WHERE id IN (SELECT authorID FROM publish WHERE bookID=${id})`);
        // get all categories
        book.cats = await db.bquery(`SELECT * FROM categories WHERE id IN (SELECT catID FROM book_category WHERE bookID=${id})`);
        res.render('books/book_view', {book: book})
        await db.bquery(`UPDATE books SET views=views+1 WHERE id=${id}`);
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})

// ajax query
router.put('/vote/:bookID', async (req, res)=>{
    try{
        if(!req.isAuthenticated()){throw {sqlMessage: 'Please sign in to vote this book'}}
        await db.uquery(`INSERT INTO voted (bookID, userID) VALUES(${req.params.bookID}, ${req.user.id})`);
        await db.bquery(`UPDATE books SET votes = votes+1 WHERE id = ${req.params.bookID}`);
        res.json({success: true, message: 'Thanks for upvoting this book'})
    }catch(err){
        if(err.errno == 1062) res.json({success: false, message: 'Already upvoted this book'});
        else
            res.json({success: false, message: err.sqlMessage});
    }
})

router.get('/cats', async (req, res)=>{
    try{
        if(req.query.id){
            let id = parseInt(req.query.id);
            if(Number.isNaN(id)){return msg.display(res, 400, req.query.id, null);}
            let cat = db.cats.find(cat=>cat.id==id);
            if(!cat){return msg.display(res, 404, 'category not found', null);}
            let books = await db.bquery(`SELECT id, title, coverType, coverImage, views, votes FROM books
            WHERE id IN (SELECT bookID FROM book_category WHERE catID=${id}) ORDER BY views`);
            books.forEach(book=>book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b'));
            res.render('books/categories', {cat: cat, books: books})    
        }else{
            let cats = await db.bquery('SELECT id, name, count(bookID) as counts FROM categories c INNER JOIN book_category bc ON bc.catID = c.id GROUP BY id');
            res.render('books/categories', {cats: cats})
        }
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})

router.get('/new', ppconfig.checkAuthenticated, (req, res)=>{res.render('books/new', {cats: db.cats});})

router.post('/new', ppconfig.checkAuthenticated, async (req, res)=>{
    let insert_id = 0;
    try{
        let new_book = {
            isbn: req.body.id,
            title: req.body.title,
            bdesc: req.body.desc,
            pbDate: new Date(req.body.pbDate).toISOString().split('T')[0],
            coverType: req.body.imgType,
            coverImage: `x'${Buffer.from(req.body.imgContent, 'base64').toString('hex')}'`,
            copies: req.body.copies,
            userID: req.user.id
        }
        await db.uquery('INSERT INTO new_books SET ?', new_book);
        insert_id = await db.uquery('SELECT LAST_INSERT_ID()');
        
        for(let i = 0;;i++){
            if(!req.body[`auth${i}`]) break;
            await db.uquery('INSERT INTO new_publish (id, aname) VALUES (?, ?)', [insert_id, req.body[`auth${i}`]]);
        }
        
        for(let i = 0;;i++){
            if(!req.body[`cat${i}`]) break;
            await db.uquery('INSERT INTO new_publish (id, catID) VALUES (?, ?)', [insert_id, req.body[`cat${i}`]]);
        }
        
        msg.display(res, 201, 'Thanks for your contribution', '/check.png');
    }catch(err){
        await db.uquery(`DELETE FROM new_books WHERE id=${insert_id}`);
        msg.display(res, 500, err.sqlMessage, null);
    }
    
})
module.exports = router;