const isLogin = (req, res, next)=>{
    try {
        if(req.session.user_id){
            res.redirect("/")
        }
        next()
    } catch (error) {
        console.log(error.message)
    }
}

const checkSession = (req,res,next) => {
    // console.log(req.session.username,"lllll");
    res.locals.userName = req.session.username
    next()
}

const isLogout = async(req, res, next)=>{
    try {
        if(req.session.user_id){
            res.redirect('/home')
        }
        next()
    } catch (error) {
        console.log(error.message)
    }
}


module.exports = {
    isLogin,
    checkSession
}