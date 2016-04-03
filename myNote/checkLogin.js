/**
 * Created by ASUS on 2016/4/1.
 */

function noLogin(req,res,next){
    if(!req.session.user){
        console.log("抱歉，还未登陆");
        req.session.error="抱歉，还未登陆";
        return res.redirect("/login");
    }
    next();
}

function hasLogin(req,res,next){
    if(req.session.user){
        console.log("您已登录");
        req.session.error="您已登录";
        return res.redirect(req.session.lastPage);
    }
    next();
}

exports.noLogin=noLogin;
exports.hasLogin=hasLogin;