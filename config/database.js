const mongoose = require("mongoose");
require("dotenv").config();

exports.connect = () =>{
    mongoose.connect(process.env.MONGOBD_URL,{   useNewUrlParser:true,
        useUnifiedTopology:true,})
        .then(() => console.log("DB Connected Sucessfully"))
        .catch((error) => {
            console.log("DB CONNECTION FAILED");
            console.log(error);
            process.exit(1);
        })
};