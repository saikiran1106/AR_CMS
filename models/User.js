const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required:true,
        trim:true,
    },
    lastName:{
        type:String,
        required:true,
        trim:true,
    },
    email:{
        type:String,
        required:true,
        trim:true,
    },
    password:{
        type:String,
        required:true,  
    },
    confirmpassword:{
        type:String,
        required:true,
    },

    accountType:{
        type:String,
        enum:["Admin","User","Company"],
        required:true
    },

 
    additionalDetails:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"profile",
    },

    image:{
        type:String,
        requird:true,
    },


});

module.exports = mongoose.model("User",userSchema);