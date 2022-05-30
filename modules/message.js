function display(res, status, message, image){
    res.status(status);
    res.render('partials/message', {
        isError: status >= 400 && status < 600 ? true : false,
        message: message,
        image: image
    });
}

const msg500 = 'Internal server error';
const msg403 = 'Forbidden';

module.exports.display = display;
module.exports.msg500 = msg500;
module.exports.msg403 = msg403;