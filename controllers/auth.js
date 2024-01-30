const OTP = require("../models/OTP");
const User = require("../models/User");
const otpGenerator = require("otp-generator");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Profile = require('../models/Profile');
const mailSender = require('../utiles/mailSender');

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email });

    if (user) {
      return res.status(500).json({
        success: false,
        message: "User Already Exists",
      });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });



    //checking otp unique or not -- not good code
    const result = await OTP.findOne({ otp: otp });

    while (result) {
      const otp = otpGenerator.generate(6 , {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      });
      result = await OTP.findOne({ otp: otp });
    }

    const otpPayload = { email, otp };

    const otpSaved = await OTP.create({ email: email, otp: otp });


    return res.status(200).json({
      success: true,
      message: "OTP Sent Successfully",
      otp : otpSaved.otp
    });

  } catch (error) {
    console.log("OTP Error : ", error);
    return res.status(500).json({
      success: true,
      message: "OTP Sending Error",
    });
  }
};

//signup
exports.signup = async (req,res) => {
    try {
        //fetch from req body
        const {firstName, lastName, email, password, confirmPassword, accountType, otp} = req.body;
        //validate all fields
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(400).json({
                success : false,
                message : "All Fields Required"
            });
        }

        //password and confirmPassword matching
        if(password !== confirmPassword) {
            return res.status(400).json({
                success : false,
                message : "Password and ConfirmPassword are not matching"
            });
        }

        //check if user already exists
        const userData = await User.findOne({email : email});

        if(userData){
            return res.status(400).json({
                success : false,
                message : "User Already Exists"
            })
        }
        //find recent OTP
        const recentOTP = await OTP.findOne({email : email}).sort({createdAt:-1}).limit(1);

        if(recentOTP?.otp != otp){
            return res.status(400).json({
                success : false,
                message : "OTP is Invalid"
            });
        }

        //hash password
        const hashedPassword = await bcrypt.hash(password,10);


        //create db entry of user profile
        const profileDetails = await Profile.create({          
            gender : null,
            dateOfBirth : null,
            contactNumber : null,
            about : null
        });

        const savedUser = await User.create({
            firstName : firstName, 
            lastName : lastName, 
            email : email,
            image : `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
            password : hashedPassword, 
            accountType : accountType, 
            additionalDetails : profileDetails._id
        });

        return res.status(200).json({
            success : true,
            message : 'User Sign Up Successful',
            savedUser
        });
    }
    catch(error) {
        console.log("User Sign Up ", error);
        return res.status(500).json({
            success : false,
            message : 'User Sign Up Error, Please try again'
        });
    }
}

//login
exports.login = async (req,res) => {
    try{
        const {email, password} = req.body;

        if(!email | !password) {
            return res.status(400).json({
                success : false,
                message : "Email and Password Both Required"
            });
        }

        const user = await User.findOne({email : email}).populate("additionalDetails");

        if(!user){
            return res.status(401).json({
                success : false,
                message : "User with this email not exists"
            });
        }

        if(await bcrypt.compare(password, user.password)){
            const token = jwt.sign(
                {email : user.email, id:user._id, accountType : user.accountType},
                process.env.JWT_SECRET,{
                expiresIn : "24h"
            });

            user.token = token;
            user.password = undefined;
        


        return res.cookie('token', user.token, {maxAge : 90000000, httpOnly : true}).json({
            success : true,
            message : "Login Successful",
            token,
            user
        });
    } else{
        return res.status(401).json({
            success : false,
            message : "Password Is Incorrect"
        })
    }
    }
    catch(error){
        console.log("Login error ", error.message);
        return res.status(500).json({
            success : false,
            message : "Login Error, Please Try Again",
        });
    }
}

//changePassword
exports.changePassword = async (req,res) => {
    try{
        const {oldPassword, newPassword, confirmNewPassword} = req.body;

        if(!oldPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({
                success : false,
                message : "All Fields Required"
            });
        }

        if(newPassword !== confirmNewPassword){
            return res.status(400).json({
                success : false,
                message : "NewPassword and ConfirmPassword Not Matching"
            });
        }

        const oldHashedPassword = await bcrypt.hash(oldPassword, 10);
        const newHashedPassword = await bcrypt.hash(newPassword, 10);


        const updatedUser = await User.findOneAndUpdate({_id : req.user.id}, {password : newHashedPassword}, {new : true});

        const user = await User.findOne({_id : req.user.id});

        const response = mailSender(user.email, "Password Change Successful - StudyNotion",`Password Changed for ${user.firstName} ${user.lastName}`);

        console.log("change password 3");
 
        return res.status(200).json({
            success : true,
            message : "Password Change Successful"
        });
    }
    catch(error) {
        console.log("Password change ", error.message);
        return res.status(400).json({
            success : false,
            message : "Error In Password Change, Please Try Again"
        });
    }
}