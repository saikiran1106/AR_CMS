const mongoose = require('mongoose');
const mailSender = require('../utiles/mailSender');
const emailVerificationTemplate = require('../mail/templates/emailVerificationTemplate');

const otpSchema = new mongoose.Schema({
    email : {
        type : String,
        required : true
    },
    otp : {
        type : Number,
        required : true
    },
    createdAt : {
        type : Date,
        default : Date.now(),
        expires : 5*60   
    }
});


//Function : Sends OTP to User attempting to SignUp
const sendVerificationEmail = async (email, otp) => {
    try{

        const mailResponse = await mailSender(email, "Verification Email - StudyNotion", emailVerificationTemplate(otp));
        console.log("Mail Sent Successfully", mailResponse);

    }
    catch(error) {
        console.log("Verification Email Error",error.message);
        throw error;
    }
}


//Pre-Middleware : Executed Before Saving to DB
otpSchema.pre('save', async function (next){
    if(this.isNew){
        await sendVerificationEmail(this.email, this.otp);
    }

    next();
})

module.exports = mongoose.model('OTP', otpSchema);