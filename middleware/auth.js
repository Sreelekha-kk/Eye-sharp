// const { login } = require("../controller/userController")
const User = require("../models/userModel")

// const express = require('express')
// const app = express();
// app.get('/set-session', (req, res) => {
//     req.session.user = 'John Doe'; // Set a session variable
//     res.send('Session variable set');
//   });
  
//   app.get('/get-session', (req, res) => {
//     const user = req.session.user; // Retrieve a session variable
//     res.send(`Session variable user: ${user}`);
//   });
  
const isLogin = (req, res, next)=>{
    try {
        if(!req.session.user_id){
            res.redirect("/login")
        } else {
            next()
        }
        
    } catch (error) {
        console.log(error.message)
    }
}

// const checkSession = (req,res,next) => {
//     // console.log(req.session.username,"lllll");
//     res.locals.userName = req.session.username
//     next()
// }
 
const checkSession = async (req, res, next) => {
    const user = await User.findById(req.session.user_id); // get the user from the database using the id stored in the session
    res.locals.user = user;
    res.locals.userName = req.session.username
    const isAuthenticated = req.session.user_id
    res.locals.isAuthenticated = isAuthenticated
    next()
}

// const isLogout = async(req, res, next)=>{
//     try {
//         if(req.session.user_id){
//             res.redirect('/home')
//         }
//         next()
//     } catch (error) {
//         console.log(error.message)
//     }
// }
const blocked = async(req, res, next) => {
    const userData = await User.findById(req.session.user_id)
    try {
        if(userData.is_blocked){
            res.redirect('/logout')
            //res.redirect('/error_403')
        }
        next()
    } catch (error) {
        console.log(error.message)
    }
}
const cartBlocked = async(req, res, next) => {
    const userData = await User.findById(req.session.user_id)
    try {
        if(userData.is_blocked){
            return res.send({status: "blocked"})
        }
        next()
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    isLogin,
    checkSession,
    blocked,
    // isLogout,
    cartBlocked
}
