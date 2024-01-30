const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User")

//auth
exports.auth=async(req,res,next)=>{
try{
    //extract token
    const token=req.cookies.token || req.body.token || req.header("Authorisation").replace("Bearer","");
//if token missing
if(!token){
    return res.status(401).json({
        success:false,
        message:'token is missing',
    });
}
//verify the token
try{
    const decode = await jwt.verify(token,process.env.JWT_SECRET);
    console.log(decode);
    req.user=decode;
}
catch(err){
    return res.status(401).json({
        success:false,
        message:'token is invalid',
    });

}
 next();

}
catch(error){
return res.status(401).json({
    successfalse,
    message:'something went wrong on vaildating the token',
});
}
}


//iscompany
exports.isCompany = async(req,res,next)=>{
    try{
        if(req.user.accountType !== "Company"){
            return res.status(401).json({
                success:false,
                message:'this protected route for company only'
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'user role cannot define'
        })
    }
}


//isadmin

exports.isAdmin = async(req,res,next)=>{
    try{
        if(req.user.accountType !== "Admin"){
            return res.status(401).json({
                success:false,
                message:'this protected route for Admin only'
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'user role cannot define'
        })
    }
}


//isuser


exports.isUser = async(req,res,next)=>{
    try{
        if(req.user.accountType !== "User"){
            return res.status(401).json({
                success:false,
                message:'this protected route for user only'
            });
        }
        next();
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'user role cannot define'
        });
    }
}