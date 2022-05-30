const util = require('util');
const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const { resolve } = require('path');
const { rejects } = require('assert');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

const accessToken = util.promisify(oauth2Client.getAccessToken).bind(oauth2Client);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAUTH2',
      user: process.env.EMAIL,
      accessToken,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN
    }
});

const sendEmail = (option)=>{
  return new Promise((resolve, reject)=>{
    transporter.sendMail(option, (err, info)=>{
      if(err){
        return reject(err);
      }
      resolve(info);
    })
  }
)}
/*
sendEmail({
  from: '',
  replyTo: '',
  to: '',
  subject: '',
  text: '',
});
*/

module.exports = {
    transporter: transporter,
    sendEmail: sendEmail
}