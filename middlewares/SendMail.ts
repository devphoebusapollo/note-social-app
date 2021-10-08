const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const {OAuth2} = google.auth;
const OAUTH_PLAYGROUND = 'https://developers.google.com/oauthplayground';

const {
    CLIENT_ID,
    CLIENT_SECRET,
    CLIENT_REFRESH_TOKEN,
    SENDER_EMAIL
} = process.env;

const oauth2Client = new OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    CLIENT_REFRESH_TOKEN,
    OAUTH_PLAYGROUND
);

//Here we create a sendEmail function that takes in the email receiver, the url for activation, and the txt to confirm that the email is activated
const sendEmail = (to: any, url: any, txt: string) => {
    oauth2Client.setCredentials({
        refresh_token: CLIENT_REFRESH_TOKEN
    })

    const accessToken = oauth2Client.getAccessToken();
    const smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: 'OAuth2',
            user: SENDER_EMAIL,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: CLIENT_REFRESH_TOKEN,
            accessToken
        },
        tls: {
            rejectUnauthorized: false
        } //this will reject the ssl error when sending an email
    })

    //the mailOptions object will hold the details where to send the email and with what data
    //Here, we include the link with the activation token to be generated later when the user registers
    const mailOptions = {
        from: SENDER_EMAIL,
        to: to,
        subject: 'LORETO TABIO',
        generateTextFromHTML: true,
        html: `
            <div style="max-width: 700px; margin:auto; border: 10px solid #ddd; padding: 50px 20px; font-size: 110%;">
            <h2 style="text-align: center; text-transform: uppercase;color: teal;">Welcome to LORETO's CHANNEL.</h2>
            <p>Congratulations! You're almost set to start using LORETO✮SHOP.
                Just click the button below to validate your email address.
            </p>
            
            <a href=${url} style="background: crimson; text-decoration: none; color: white; padding: 10px 20px; margin: 10px 0; display: inline-block;">${txt}</a>
        
            <p>If the button doesn't work for any reason, you can also click on the link below:</p>
        
            <div>${url}</div>
            </div>
        `
    }

    //the sendMail method takes in the mailOptions as its first parameter and a callback function for error and success handling
    smtpTransport.sendMail(mailOptions, (err: any, infor: any) => {
        if(err) {
            console.log(err);
        } else {
            console.log(infor);
        }
    })

}

module.exports = sendEmail;