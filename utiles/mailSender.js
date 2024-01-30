const nodemailer = require('nodemailer');
require('dotenv').config();


const mailSender = (email, title, body) => {

    try{

    const transporter = nodemailer.createTransport({
        host : process.env.MAIL_HOST,
        auth : {
            user : process.env.MAIL_USER,
            pass : process.env.MAIL_PASS
        }
    });

    const response = transporter.sendMail({
        from : process.env.MAIL_USER,
        to : `${email}`,
        subject : `${title}`,
        html : `${body}`
    });

    console.log(response);

    return response;
    }
    catch(error) {
        console.log("Sending Mail Error",error);
    }
}

module.exports = mailSender;