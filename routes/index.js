const express = require('express');
const router = express.Router();
const db = require('../modules/db');
const msg = require('../modules/message');

router.get('/', (req, res) => {
    Promise.all([
        db.bquery('SELECT id, title, coverType, coverImage, views, votes FROM books ORDER BY votes DESC LIMIT 6'),
        db.bquery('SELECT id, title, coverType, coverImage, views, votes FROM books ORDER BY views DESC LIMIT 6'),
        db.bquery('SELECT id, title, coverType, coverImage, views, votes FROM books ORDER BY createAt DESC LIMIT 6'),
    ]).then((results)=>{
        results.forEach(r => r.forEach(b => b.coverImage = db.getImgURL(b.coverType, b.coverImage, 'b')));
        res.render('index', {
            votes: results[0],
            views: results[1],
            news: results[2],
            cats: db.cats
        })
    }).catch((err)=>{
        console.error(err);
        msg.display(res, 500, err.sqlMessage, null);
    })
});

module.exports = router;