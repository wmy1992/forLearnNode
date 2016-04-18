/**
 * Created by ASUS on 2016/3/29.
 */

var express=require('express');
var path=require('path');
var bodyParser=require('body-parser');
var crypto=require('crypto');
var session=require('express-session');
var moment=require('moment');
var checkLogin=require('./checkLogin.js');

var mongoose=require('mongoose');
var models=require('./models/models.js');


//use mongoose to connect service
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error',console.error.bind(console,"连接数据库失败"));

var app=express();

//define ejs template engine and file location
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

//define static file directory
app.use(express.static(path.join(__dirname,'public')));

//define data parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//define session template
app.use(session({
    secret:'1234',
    name:'mynote',
    cookie:{maxAge:1000*60*60*24*7},//一周免登陆
    resave:false,
    saveUninitialized:true
}));

app.use(function(req,res,next){
    var err=req.session.error;
    delete req.session.error;
    res.locals.message='';
    if(err){
        res.locals.message=err;
    }
    next();
});

var User=models.User;
var Note=models.Note;



app.get('/',checkLogin.noLogin);
//response get request
app.get('/',function(req,res){
    Note.find({author:req.session.user.username})
        .exec(function(err,allNotes){
            if(err){
                console.log(err);
                return res.redirect('/');
            }
            res.render('index',{
                title:'首页',
                user:req.session.user,
                notes:allNotes
            })
        });
    req.session.lastPage="/";
});

app.get('/login_register',function(req,res){
    res.render('login_register',{
        title:'登陆/注册'
    });
});
/*app.get('/register',checkLogin.hasLogin);
//response get request for regist page
app.get('/register',function(req,res){
    console.log('注册！');
    res.render('login_register',{
        user:req.session.user,
        title:'注册'
    });
});*/

app.post('/register',function(req,res){
    console.log("register post");
    var username=req.body.username,
        password=req.body.password;

    /*if(!(/^(\w){3,20}$/.test(username))){
        console.log("用户名只能是字母、数字、下划线的组合，长度3-20个字符");
        req.session.error="用户名只能是字母、数字、下划线的组合，长度3-20个字符";
        return res.redirect('/register');
    }
    if(!(
            (/^[a-z0-9A-Z]{6,}$/.test(password))
            &&(/([A-Z]+)/.test(password))
            &&(/([a-z]+)/.test(password))
            &&(/([0-9]+)/.test(password))
        )){
        console.log("密码：长度不能少于6，必须同时包含数字、小写字母、大写字母。");
        req.session.error="密码：长度不能少于6，必须同时包含数字、小写字母、大写字母。";
        return res.redirect('/register');
    }

    if(password != passwordRepeat){
        console.log("密码不一致呀");
        req.session.error="密码不一致呀";
        return res.redirect('/login_register');
    }*/

    User.findOne({username:username},function(err,user){
        if(err){
            console.log(err);
            req.session.error='网络繁忙';
            return res.redirect('/login_register');
        }
        if(user){
            console.log('用户名已经存在');
            req.session.error="用户名已经存在";
            return res.redirect('/login_register');
        }
        var md5=crypto.createHash('md5'),
            md5password=md5.update(password).digest('hex');

        var newUser=new User({
            username:username,
            password:md5password
        });

        newUser.save(function(err,doc){
            if(err){
                console.log(err);
                return res.redirect('/login_register');
            }
            console.log('注册成功');
            newUser.password=null;
            delete newUser.password;
            req.session.user=newUser;
            return res.redirect('/');
        });
    });
});

/*app.get('/login',checkLogin.hasLogin);
app.get('/login',function(req,res){
    console.log("登录！");
    res.render('login_register',{
        user:req.session.user,
        title:'登录'
    });
});*/
app.post('/login',function(req,res){
    var username=req.body.username,
        password=req.body.password;

    console.log("login post");
    /*if(!(/^(\w){3,20}$/.test(username))){
        console.log("用户名只能是字母、数字、下划线的组合，长度3-20个字符");
        req.session.error="用户名只能是字母、数字、下划线的组合，长度3-20个字符";
        return res.redirect('/login');
    }
    if(!(
            (/^[a-z0-9A-Z]{6,}$/.test(password))
            &&(/([A-Z]+)/.test(password))
            &&(/([a-z]+)/.test(password))
            &&(/([0-9]+)/.test(password))
        )){
        console.log("密码：长度不能少于6，必须同时包含数字、小写字母、大写字母。");
        req.session.error="密码：长度不能少于6，必须同时包含数字、小写字母、大写字母。";
        return res.redirect('/login_register');
    }*/

    User.findOne({username:username},function(err,user){
        if(err){
            console.log(err);
            req.session.error="网络繁忙，请稍后";
            res.redirect('/login');
        }
        if(!user){
            console.log("用户不存在");
            req.session.error="用户不存在";
            return res.redirect('/login_register');
        }

        var md5=crypto.createHash('md5'),
            md5password=md5.update(password).digest("hex");
        if(user.password!==md5password){
            console.log('密码错误');
            req.session.error="密码错误";
            return res.redirect('/login_register');
        }
        console.log("登陆成功");
        user.password=null;
        delete user.password;
        req.session.user=user;
        return res.redirect('/');
    });
});
app.get('/quit',function(req,res){
    req.session.user=null;
    req.session.lastPage=null;
    console.log("退出！");
    return res.redirect('/login_register');
});

app.get('/post',function(req,res){
    console.log("发布！");
    res.render('post',{
        user:req.session.user,
        title:'发布'
    });
    req.session.lastPage='/post';
});

app.post('/post',function(req,res){
    var note=new Note({
        title:req.body.title,
        author:req.session.user.username,
        tag:req.body.tag,
        content:req.body.content
    });

    note.save(function(err,doc){
        if(err){
            console.log(err);
            return res.redirect('/post');
        }
        console.log("文章发表成功！");
        return res.redirect('/');
    });
});

app.get('/detail/:_id',function(req,res){
    console.log("查看笔记1！+"+req.params._id);
   // req.session.lastPage='/detail/_id';  //cast(objectId)出错，因为这是后lastPage的值为字符串/detail/_id
    // req.session.lastPage='/detail/:'+req.params._id;   //：should not add :, cause ~~~
    req.session.lastPage='/detail/'+req.params._id;
    Note.findOne({_id:req.params._id})
        .exec(function(err,art){
            if(err){
                console.log(err);
                return res.redirect('/');
            }
            if(art){
                res.render('detail',{
                    title:'笔记详情',
                    user:req.session.user,
                    art:art,
                    moment:moment
                });
            }
        });

});

app.listen(3000,function(req,res){
    console.log('app is running at port 3000');
});