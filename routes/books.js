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
    let _order = ['ASC', 'DESC']
    let order = _order.indexOf(req.query.order);
    order = order == -1 ? 1 : order;
    let cat = parseInt(req.query.cat);
    cat = Number.isNaN(cat) ? 0 : cat;
    let lim = parseInt(req.query.lim);
    lim = Number.isNaN(lim) ? 25 : lim;

    try{
        let books = await db.bquery('CALL generalBookSearch(?, ?, ?, ?, ?, ?)',
            [req.query.title, req.query.aname, cat, _orderBy[orderBy], _order[order], lim]);
        books = books[0];
        books.forEach(book=>{
            book.catname = db.cats.find(cat => cat.id = book.catID).name;
            book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
        })
        res.render('books/index', {books: books})
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
})

router.get('/book/:id', async(req, res)=>{
    let id = parseInt(req.params.id);
    if(Number.isNaN(id)){return msg.display(res, 403, msg.msg403+req.params.id, null);}
    try{
        // get the book
        let book = await db.bquery(`CALL getBookDetails(${id})`);
        if(book[0].length == 0){throw 'book not found'}
        book[0] = book[0][0];
        book[0].coverImage = db.getImgURL(book[0].coverType, book[0].coverImage, 'b');
        book[0].bdesc   = db.processDesc(book[0].bdesc);
        res.render('books/book_view', {book: book});
    }catch(err){
        if(err.errno){
            writeLog(err);
            msg.display(res, 500, msg.msg500, null);
        }else{
            msg.display(res, 403, msg.msg403+err, null);
        }
    }
})

// ajax query
router.put('/vote/:bookID', async (req, res)=>{
    if(!req.isAuthenticated()){throw 'Please sign in to vote this book'}
    let bookID = parseInt(req.params.bookID);
    if(Number.isNaN(bookID)){return msg.display(res, 403, msg.msg403+req.params.bookID, null);}
    try{
        let status = await db.bquery(`CALL voteBook(${bookID}, ${req.user.id})`);
        status = status[0][0];
        res.json({success: status.code == 0 ? true : false, message: status.message})
    }catch(err){
        if(err.errno){
            writeLog(err);
            msg.display(res, 500, msg.msg500, null);
        }else{
            msg.display(res, 403, msg.msg403+err, null);
        }
    }
})

router.get('/comments/:bookID', async (req, res)=>{
    let id = parseInt(req.params.bookID);
    if(Number.isNaN(id)){return msg.display(res, 403, msg.msg403+req.params.bookID, null);}
    try{
        let comments = await db.uquery(`SELECT * FROM (SELECT * FROM comments WHERE bookID=${id}) c INNER JOIN (SELECT id, name FROM users) u ON c.userID=u.id LIMIT 25`);
        res.json({success: true, comments: comments});
    }catch(err){
        writeLog(err);
        res.json({success: false});
    }
})

router.post('/comments/:bookID', async (req, res)=>{
    if(!req.isAuthenticated()){return res.json({success: false, message: 'Login to post comments'})}
    try{
        let status = await db.uquery('CALL insertComment(?,?,?)', [req.params.bookID, req.user.id, req.body.comment]);
        status = status[0][0];
        res.json({success: status.code == 0 ? true : false, message: status.message});
    }catch(err){
        writeLog(err);
        res.json({success: false, message: msg.msg500});
    }
})

router.get('/cats', async (req, res)=>{
    try{
        if(req.query.id){
            let id = parseInt(req.query.id);
            if(Number.isNaN(id)){return msg.display(res, 400, msg.msg403+req.query.id, null);}
            let cat = db.cats.find(cat=>cat.id==id);
            if(!cat){return msg.display(res, 404, 'category not found', null);}
            let books = await db.bquery(`SELECT * FROM (SELECT id, title, coverType, coverImage, views, votes FROM books WHERE id IN (SELECT bookID FROM book_category WHERE catID=${id})) b
            INNER JOIN book_category bc ON bc.bookID = b.id
            INNER JOIN publish p ON p.bookID = b.id
            INNER JOIN authors a ON a.id = p.authorID
            GROUP BY p.bookID ORDER BY views LIMIT 25`);
            
            books.forEach(book=>{
                book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
                book.catname = book.catname = db.cats.find(cat => cat.id = book.catID).name;
            });
            res.render('books/categories', {cat: cat, books: books})  
        }else{res.render('books/categories');}
    }catch(err){
        writeLog(err);
        msg.display(res, 500, msg.msg500, null);
    }
})

router.get('/new', ppconfig.checkAuthenticated, (req, res)=>{res.render('books/new');})

router.post('/new', ppconfig.checkAuthenticated, async (req, res)=>{
    let insert_id = 0;
    let new_auths = [];
    try{
        let presence = await db.bquery(`SELECT id FROM books WHERE id=${req.body.id}`);
        if(presence.length > 0){return msg.display(res, 403, `This <a href="/books/book/${presence[0].id}">book entry</a> has already exist`, null);}
        await db.uquery(`INSERT INTO ${req.user.role=='member'?'new_books':'csdl20211_books.books'} SET ?`, {
            isbn: req.body.id,
            title: req.body.title,
            bdesc: req.body.desc,
            pbDate: new Date(req.body.pbDate).toISOString().split('T')[0],
            coverType: req.body.imgType,
            coverImage: Buffer.from(req.body.imgContent, 'base64'),
            copies: req.body.copies,
            price: req.body.price,
            userID: req.user.id
        });
        insert_id = await db.uquery('SELECT @newInsertID as id');
        insert_id = insert_id[0].id;
        
        for(let i = 0;;i++){
            if(!req.body[`auth${i}`]) break;
            if(req.user.role=='member'){
                await db.uquery('INSERT INTO new_publish (id, aname) VALUES (?, ?)', [insert_id, req.body[`auth${i}`]]);
            }else{
                await db.bquery('INSERT INTO authors (aname) VALUES (?)', [req.body[`auth${i}`]]);
                let new_auth_id = await db.bquery('SELECT @newAuthorID as id');
                new_auth_id = new_auth_id[0].id;
                new_auths.push(new_auth_id);
                await db.bquery(`INSERT INTO publish (bookID, authorID) VALUES (${req.body.id}, ${new_auth_id})`);
            }
        }
        
        for(let i = 0;;i++){
            if(!req.body[`cat${i}`]) break;
            if(req.user.role=='member'){
                await db.uquery('INSERT INTO new_books_cat (id, catID) VALUES (?, ?)', [insert_id, req.body[`cat${i}`]]);
            }else{
                await db.bquery(`INSERT INTO book_category (bookID, catID) VALUES (${insert_id}, ${req.body[`cat${i}`]})`);
            }
        }
        
        msg.display(res, 201, 'Thanks for your contribution', '/check.png');
    }catch(err){
        writeLog(err);
        if(req.user.role == 'member'){
            await db.uquery(`DELETE FROM new_books WHERE id=${insert_id}`);
        }else{
            await db.bquery(`DELETE FROM books WHERE id=${req.body.id}`);
            await db.bquery(`DELETE FROM authors WHERE id IN (${new_auths})`);
        }
        msg.display(res, 500, msg.msg500, null);
    }
    
})

module.exports = router;