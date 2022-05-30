var otps = [];

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

function getIndex(uID, otp){return otps.findIndex(e => e.uID==uID && e.otp==otp)}

function createOTP(uID){
    let new_otp = null;
    do{
        new_otp = getRandomInt(10000, 99999);
    }while(getIndex(uID, new_otp)!=-1);
    otps.push({uID: uID, otp: new_otp});
    return new_otp;
}

function removeOTP(uID, otp){
    var index = getIndex(uID, otp);
    if (index > -1) {
        otps.splice(index, 1);
        return true;
    }
    return false;
}

module.exports = {
    createOTP: createOTP,
    removeOTP: removeOTP,
    getIndex: getIndex
}