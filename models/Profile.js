const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
    gender:{
        type:String,
    },
    dateofBirth:{
        type:String,
    },
    about:{
        type:String,
        trime:true,
    },

    contactNumber:{
        type:Number,
        trime:true,
    }
    
});

module.exports = mongoose.model("Profile",profileSchema);