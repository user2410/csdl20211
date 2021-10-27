const express = require('express');
const { route } = require('.');
const router = express.Router();
const db = require('../db');

// All Authors Route
router.get('/', async (req, res) => {
    try{
        let query = 'SELECT * FROM Authors';
        if(req.query.name != null && req.query.name !== ''){
            query += ` WHERE name LIKE '%${req.query.name}%'`;
        }
        db.query(query, (err, result) => {
            if(err){ throw err;}
            res.render('authors/index', {authors: result});
        })
    }catch(err){
        console.log(err);
        res.redirect('/');
    }
});

// New Author Route
router.get('/new', (req, res) =>{
    res.render('authors/new');
});

// Helper function to validate user input
function validateAuthor(name){
    if(!name){ throw 'No author\'s name provided';}
    if(name.length < 3){ throw 'invalid name';}
}

// Create Author Route
router.post('/', async (req, res) => {
    try{
        validateAuthor(req.body.name);
        res.redirect('/authors');
    }catch(err){
        res.render('authors/new', {
            errorMessage: err
        })
    }
});

module.exports = router;