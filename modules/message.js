function display(res, status, message, image){
    res.status(status);
    res.render('partials/message', {
        isError: status >= 400 && status < 600 ? true : false,
        message: message,
        image: image
    });
}

module.exports.display = display;