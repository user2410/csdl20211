const express = require('express');
const router = express.Router();
const db    = require('../modules/db');
const ppconfig = require('../modules/ppconfig');
const msg   = require('../modules/message');

router.use(ppconfig.checkAuthenticated);

// staff view all requests
router.get('/requests/:toUpdate', ppconfig.isStaff, async (req, res)=>{
    switch(req.params.toUpdate){
        case 'books':
            Promise.all([
                db.uquery(`SELECT * FROM new_books`),
                db.uquery(`SELECT * FROM new_books_cat`),
                db.uquery(`SELECT * FROM new_publish`)
            ]).then((result)=>{
                result[0].forEach(book => {
                    book.cats = result[1].filter(cat => cat.id == book.id);
                    book.cats.forEach(cat => cat.name = db.cats.find(c => c.id == cat.catID).name)
                    book.authors = result[2].filter(publish => publish.id == book.id);
                    book.coverImage = db.getImgURL(book.coverType, book.coverImage, 'b');
                });
                res.render('users/requests', {books: result[0]});
            }).catch((err)=>{
                msg.display(res, 500, err.sqlMessage, null);
            })
            break;
        case 'authors':
            try{
                authors = await db.uquery('SELECT * FROM new_authors_info');
                authors.forEach(a => {a.aImage = db.getImgURL(a.aImageType, a.aImage, 'a');})
                res.render('users/requests', {authors: authors});
            }catch(err){
                msg.display(res, 500, err.sqlMessage, null);
            }
            break;
        default:
            res.redirect('/')
    }
});

// receive and process new book ajax query
router.put('/accept/:id', ppconfig.isStaff, async (req, res)=>{
    let id=null;
    switch(req.params.id[0]){
        case 'b':
            id = parseInt(req.params.id.slice(1));
            if(Number.isNaN(id)){return res.status(400).json({success: false, message: req.params.id})}
            add_new_book(res, id);
            break;
        case 'a':
            id = parseInt(req.params.id.slice(1));
            if(Number.isNaN(id)){return res.status(400).json({success: false, message: req.params.id})}
            try{
                await db.bquery(`UPDATE authors a
                INNER JOIN csdl20211_users.new_authors na ON na.id = a.id
                SET a.aImageType = na.aImageType, a.aImage = na.aImage
                WHERE na.id = ${id}`);
                await db.uquery(`DELETE FROM new_authors WHERE id=${id}`);
                res.json({success: true, message: 'Successfully added a new author entry'});
            }catch(err){
                res.json({success: false, message: err.sqlMessage})
            }
            break;
        default:
            res.redirect('/');
    }
});

async function add_new_book(res, id){
    let isbn = 0;
    let new_authors = [];
    
    // insert new book
    try{
        isbn = await db.uquery(`SELECT isbn FROM new_books WHERE id = ${id}`);
        if(isbn.length == 0){throw {sqlMessage: 'not found'};}
        isbn = isbn[0].isbn;
        // insert new book
        await db.bquery(`INSERT INTO books(id, title, bdesc, pbDate, coverType, coverImage, copies)
        SELECT isbn, title, bdesc, pbDate, coverType, coverImage, copies FROM csdl20211_users.new_books nb
        WHERE nb.id=${id}`);

        // insert book - cat
        let cats = await db.uquery(`SELECT catID FROM new_books_cat WHERE id = ${id}`);
        for(let cat of cats){await db.bquery(`INSERT INTO book_category(bookID, catID) VALUES (${isbn}, ${cat.catID})`);}
        
        // insert new authors publish
        let authors = await db.uquery(`SELECT aname FROM new_publish WHERE id = ${id}`);
        for(let author of authors){
            let present = await db.bquery(`SELECT id FROM authors WHERE aname = '${author.aname}'`);
            let aid = null;
            if(present.length != 0){aid = present[0].id;}
            else{
                await db.bquery(`INSERT INTO authors(aname) VALUES ('${author.aname}')`);
                let new_author = await db.bquery('SELECT LAST_INSERT_ID() AS id');
                aid = new_author[0].id;
                new_authors.push(aid);
            }
            await db.bquery(`INSERT INTO publish (bookID, authorID) VALUES (${isbn}, ${aid})`);
        }
        await db.uquery(`DELETE FROM new_books WHERE id = ${id}`);
        res.json({success: true, message: 'Successfully added a new book entry'});
    }catch(err){
        Promise.all([
            db.bquery(`DELETE FROM books WHERE books.id = ${isbn}`),
            db.bquery(`DELETE FROM authors WHERE id IN (${new_authors.length > 0 ? new_authors : 0})`)
        ]).catch((err) => {console.log(err); process.exit(2);});
        res.json({success: false, message: err.sqlMessage})
    }
}

router.delete('/accept/:id', ppconfig.isStaff, async (req, res)=>{
    switch(req.query.id[0]){
        case 'b':
            id = parseInt(req.params.id.slice(1));
            if(Number.isNaN(id)){return res.json({success: false, message: req.params.id})}
            try{
                await db.uquery(`DELETE FROM new_books WHERE id=${id}`);
                res.json({success: true, message: 'Successfully delete a new book entry'});
            }catch(err){
                res.json({success: false, message: err.sqlMessage});
            };
            break;
        case 'a':
            id = parseInt(req.params.id.slice(1));
            if(Number.isNaN(id)){return res.json({success: false, message: req.params.id})}
            try{
                await db.uquery(`DELETE FROM new_authors WHERE id=${id}`);
                res.json({success: true, message: 'Successfully delete a new author entry'});
            }catch(err){
                res.json({success: false, message: err.sqlMessage});
            };
            break;
        default:
            res.redirect('/');
    }
})

// get all books currently loaned by users
router.get('/borrow', async (req, res)=>{
    try{
        let borrowed_books = await db.bquery(`SELECT borrow.bookID, b.title, borrow.loanDate, borrow.returnDate FROM books b
        INNER JOIN csdl20211_users.borrow borrow ON borrow.userID=b.id
        WHERE borrow.userID=${req.user.id}`);
        res.render('users/borrowed_books', {books: borrowed_books})
    }catch(err){
        msg.display(res, 500, err.sqlMessage, null);
    }
})

// user borrow a copy
router.post('/borrow', async (req, res)=>{
    try{
        let price = await db.bquery(`SELECT price FROM books WHERE id = ${req.body.bookID}`);
        if(price.length == 0){return msg.display(res, 404, 'book not found', null);}
        price = price[0].price;

        let credit = await db.uquery(`SELECT credit FROM users WHERE id = ${req.user.id}`);
        credit = credit[0].credit;

        if(price > credit){return msg.display(res, 403, 'not enough credit', null);}
        
        let borrow_time = parseInt(req.body.borrow_time);
        if(![1, 5, 15, 30, 90].includes(borrow_time)){return msg.display(res, 400, req.body.borrow_time, null)}
        let today = new Date();
        let returnDate = new Date(today.getTime() + borrow_time*86400000);
        
        await db.bquery(`UPDATE books SET copies = copies - 1 WHERE id = ${req.body.bookID}`);
        await db.uquery(`UPDATE users SET credit = credit - ${price >> 1} WHERE id = ${req.user.id}`);
        await db.uquery(`INSERT INTO borrow (bookID, userID, loanDate, returnDate) VALUES (${req.body.bookID}, ${req.user.id}, ${today.toISOString().split('T')[0]}, ${returnDate.toISOString().split('T')[0]})`);

        msg.display(res.json, 202, 'Successfully borrow a copy of this book', '/check.png')
    }catch(err){
        if(err.errno == 1062) msg.display(res, 403, 'Please return the last copy of this book', null);
        else
            msg.display(res, 500, err.sqlMessage, null);
    }
})

// user return a copy
router.delete('/borrow/:bookID', async (req, res)=>{
    try{
        let present = await db.uquery(`SELECT * FROM borrow WHERE bookID=${req.params.bookID} AND userID=${req.user.id}`);
        if(present.length == 0){return res.json({success: false, message: 'You did not borrowed this book yet'})}

        let price = await db.bquery(`SELECT price FROM books WHERE id = ${req.query.bookID}`);
        if(price.length == 0){return res.json({success: false, message: 'book not found'})}
        price = price[0].price;

        await db.bquery(`UPDATE books SET copies = copies + 1 WHERE id = ${req.query.bookID}`);
        await db.uquery(`UPDATE users SET credit = credit + ${price >> 1} WHERE id = ${req.user.id}`);
        await db.uquery(`DELETE FROM borrow WHERE bookID=${req.query.bookID} AND userID=${req.user.id}`);

        res.json({success:true, message: 'Successfully return this book'});
    }catch(err){
        res.json({success: false, message: err.sqlMessage})
    }
})
module.exports = router;