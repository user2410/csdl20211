const express = require('express');
const router = express.Router();
const db = require('../modules/db');
const ppconfig = require('../modules/ppconfig');
const msg = require('../modules/message');

router.use(ppconfig.checkAuthenticated);

// view all requests
router.get('/requests/:toUpdate', ppconfig.isStaff, async (req, res)=>{
    if(req.params.toUpdate == 'books'){
        Promise.all([
            db.user_query(`SELECT * FROM new_books b`),
            db.user_query(`SELECT * FROM new_books_cat`),
            db.user_query(`SELECT * FROM new_publish`)
        ]).then((result)=>{
            result[0].forEach(book => {
                book.cats = result[1].filter(cat => cat.id == book.id);
                book.cats.forEach(cat => cat.name = db.categories.find(c => c.id == cat.catID).name)
                book.authors = result[2].filter(publish => publish.id == book.id);
                book.coverImage = db.getImgURL(book.coverType, book.coverImage);
            });
            
            res.render('users/requests', {books: result[0]});
        }).catch((err)=>{
            msg.display(res, 500, db.error+err.sqlMessage, true, null);
        })
    }
    else if(req.params.toUpdate == 'authors'){
        try{
            authors = await db.user_query('SELECT * FROM authors_info');
            authors.forEach(a => {a.aImage = db.getImgURL(a.aImageType, a.aImage);});
            
            res.render('users/requests', {authors: authors});
        }catch(err){
            msg.display(res, 500, db.error+err.sqlMessage, true, null);
        }
    }
    else {res.redirect('/')}
});

// receive and process ajax query
router.get('/accept', ppconfig.isStaff, async (req, res)=>{
    let id = null;
    switch(req.query.id[0]){
        case 'b':
            id = parseInt(req.query.id.slice(1));
            if(Number.isNaN(id)){return res.json(response)}
            add_new_book(res, id);
            break;
        case 'a':
            id = parseInt(req.query.id.slice(1));
            if(Number.isNaN(id)){return res.json(response)}
            try{
                await db.query(`UPDATE authors a
                INNER JOIN csdl20211_users.new_authors na ON na.id = a.id
                SET a.aImageType = na.aImageType, a.aImage = na.aImage
                WHERE na.id = ${id}`);
                await db.user_query(`DELETE FROM new_authors WHERE id=${id}`);
                res.json({success: true, message: 'Successfully added a new author entry'});
            }catch(err){
                res.json({success: false, message: db.error+err.sqlMessage})
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
        isbn = await db.user_query(`SELECT isbn FROM new_books WHERE id = ${id}`);
        if(isbn.length == 0){throw {sqlMessage: 'not found'};}
        isbn = isbn[0].isbn;
        // insert new book
        await db.query(`INSERT INTO books(id, title, bdesc, pbDate, coverType, coverImage, copies)
        SELECT isbn, title, bdesc, pbDate, coverType, coverImage, copies FROM csdl20211_users.new_books nb
        WHERE nb.id=${id}`);

        // insert book - cat
        let cats = await db.user_query(`SELECT catID FROM new_books_cat WHERE id = ${id}`);
        for(let cat of cats){await db.query(`INSERT INTO book_category(bookID, catID) VALUES (${isbn}, ${cat.catID})`);}
        
        // insert new authors publish
        let authors = await db.user_query(`SELECT aname FROM new_publish WHERE id = ${id}`);
        for(let author of authors){
            let present = await db.query(`SELECT id FROM authors WHERE aname = '${author.aname}'`);
            let aid = null;
            if(present.length != 0){aid = present[0].id;}
            else{
                await db.query(`INSERT INTO authors(aname) VALUES ('${author.aname}')`);
                let new_author = await db.query('SELECT LAST_INSERT_ID() AS id');
                aid = new_author[0].id;
                new_authors.push(aid);
            }
            await db.query(`INSERT INTO publish (bookID, authorID) VALUES (${isbn}, ${aid})`);
        }
        await db.user_query(`DELETE FROM new_books WHERE id = ${id}`);
        res.json({success: true, message: 'Successfully added a new book entry'});
    }catch(err){
        Promise.all([
            db.query(`DELETE FROM books WHERE books.id = ${isbn}`),
            db.query(`DELETE FROM authors WHERE id IN (${new_authors.length > 0 ? new_authors : 0})`)
        ]).catch((err) => {console.log(err); process.exit(2);});
        res.json({success: false, message: db.error+err.sqlMessage})
    }
}

router.delete('/accept', ppconfig.isStaff, async (req, res)=>{
    let id = null;
    switch(req.query.id[0]){
        case 'b':
            id = parseInt(req.query.id.slice(1));
            if(Number.isNaN(id)){return res.json({success: false, message: msg.invalid_input(req.query.id)})}
            try{
                await db.user_query(`DELETE FROM new_books WHERE id=${id}`);
                res.json({success: true, message: 'Successfully delete a new book entry'});
            }catch(err){
                res.json({success: false, message: db.error+err.sqlMessage});
            };
            break;
        case 'a':
            id = parseInt(req.query.id.slice(1));
            if(Number.isNaN(id)){return res.json({success: false, message: msg.invalid_input(req.query.id)})}
            try{
                await db.user_query(`DELETE FROM new_authors WHERE id=${id}`);
                res.json({success: true, message: 'Successfully delete a new author entry'});
            }catch(err){
                res.json({success: false, message: db.error+err.sqlMessage});
            };
            break;
        default:
            res.redirect('/');
    }
})

router.get('/vote', async (req, res)=>{
    try{
        await db.user_query(`INSERT INTO voted (bookID, userID) VALUES(${req.query.bookID}, ${req.user.id})`);
        await db.query(`UPDATE books SET votes = votes+1 WHERE id = ${req.query.bookID}`);
        res.json({success: true, message: 'Thanks for upvoting this book'})
    }catch(err){
        if(err.errno == 1062) res.json({success: false, message: 'Already upvoted this book'});
        else
            res.json({success: false, message: db.error+err.sqlMessage});
    }
})

router.post('/borrow', async (req, res)=>{
    try{
        let price = await db.query(`SELECT price FROM books WHERE id = ${req.body.bookID}`);
        if(price.length == 0){return msg.display(res, 400, 'book not found', true, null);}
        price = price[0].price;

        let credit = await db.user_query(`SELECT credit FROM users WHERE id = ${req.user.id}`);
        credit = credit[0].credit;

        if(price > credit){return res.json({success: false, message: 'Not enough credit'})}
        
        let borrow_time = parseInt(req.body.borrow_time);
        if(![1, 5, 15, 30, 90].includes(borrow_time)){return res.json({success:false, message: msg.invalid_input(req.body.borrow_time)})}
        let today = new Date();
        let returnDate = new Date(today.getTime() + borrow_time*86400000);
        
        await db.query(`UPDATE books SET copies = copies - 1 WHERE id = ${req.body.bookID}`);
        await db.user_query(`UPDATE users SET credit = credit - ${price >> 1} WHERE id = ${req.user.id}`);
        await db.user_query(`INSERT INTO borrow (bookID, userID, loanDate, returnDate) VALUES (${req.body.bookID}, ${req.user.id}, ${today.toISOString().split('T')[0]}, ${returnDate.toISOString().split('T')[0]})`);

        res.json({success: true, message: 'Successfully borrow this book'})
    }catch(err){
        if(err.errno == 1062) res.json({success: false, message: 'Please return the last copy of this book'})
        else
            res.json({success: false, message: err.sqlMessage})
    }
})

router.get('/return', async (req, res)=>{
    if(!req.query.bookID){
        let borrowed = await db.user_query(`SELECT * FROM borrow
        INNER JOIN (SELECT id,title,coverType,coverImage FROM csdl20211_books.books) AS b
        ON borrow.bookID = b.id
        WHERE userID=${req.user.id}`);
        borrowed.forEach(b => b.coverImage = db.getImgURL(b.coverType, b.coverImage))
        return res.render('users/return', {borrowed: borrowed})
    }
    try{
        let present = await db.user_query(`SELECT * FROM borrow WHERE bookID=${req.query.bookID} AND userID=${req.user.id}`);
        if(present.length == 0){return res.json({success: false, message: 'You did not borrowed this book yet'})}

        let price = await db.query(`SELECT price FROM books WHERE id = ${req.query.bookID}`);
        if(price.length == 0){return res.json({success: false, message: 'book not found'})}
        price = price[0].price;

        await db.query(`UPDATE books SET copies = copies + 1 WHERE id = ${req.query.bookID}`);
        await db.user_query(`UPDATE users SET credit = credit + ${price >> 1} WHERE id = ${req.user.id}`);
        await db.user_query(`DELETE FROM borrow WHERE bookID=${req.query.bookID} AND userID=${req.user.id}`);

        res.json({success:true, message: 'Successfully return this book'});
    }catch(err){
        res.json({success: false, message: db.error+err.sqlMessage})
    }
})
module.exports = router;