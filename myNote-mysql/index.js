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

var mysql=require('mysql');
//var mongoose=require('mongoose');
var User=require('./models/models.js').User;
var Note=require('./models/models.js').Note;




//use mongoose to connect service
//mongoose.connect('mongodb://123.206.21.150:27017/notes');
//mongoose.connection.on('error',console.error.bind(console,"连接数据库失败"));

var pool=mysql.createPool({
	host:'localhost',
	user:'root',
	password:'123456',
	database:'notes',
	connectionLimit:10
});



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

var userSql={
    insert:'INSERT INTO user(name,password) VALUES(?,?)',
    queryByName:'SELECT * FROM user WHERE name=?'
};
var notesSql={
    insert:'INSERT INTO note(title,author,tag,content) VALUES(?,?,?,?)',
    queryByTitle:'SELECT * FROM note WHERE title=?',
    queryByAuthor:'SELECT * FROM note where author=?',
    queryById:'SELECT * FROM note where id=?'
};

app.use(function(req,res,next){
    var err=req.session.error;
    delete req.session.error;
    res.locals.message='';
    if(err){
        res.locals.message=err;
    }
    next();
});

//var User=models.User;
//var Note=models.Note;



app.get('/',checkLogin.noLogin);
//response get request
app.get('/',function(req,res){
	pool.getConnection(function(err,connection){
		if(err) throw err;
		var value=req.session.user.name;
		console.log("test index username"+value);	
		var query=connection.query(notesSql.queryByAuthor,value,function(err,allNotes){
			if(err){
               			 console.log(err);
               			 return res.redirect('/');
           		 }
           		 res.render('index',{
               			 title:'首页',
               			 user:req.session.user,
               			 notes:allNotes
           		 });
			connection.release();
		});
	});
    req.session.lastPage="/";
});

app.get('/login_register',function(req,res){
    res.render('login_register',{
        title:'登陆/注册'
    });
});

app.post('/register',function(req,res) {
    console.log("register post");
    var username = req.body.username,
        password = req.body.password;

    pool.getConnection(function (err,connection) {
        if (err) {
            console.log(err);
            req.session.error = '网络繁忙';
            return res.redirect('/login_register');
        }
	console.log('test username regist'+username);
        var queryUser = connection.query(userSql.queryByName, username, function (err, result) {
           console.log("test regist result"+result+"test");
	   if(result===undefined){
                console.log('用户名已存在');
                req.session.error = "用户名已经存在";
                return res.redirect('/login_register');
            } else {
                var md5 = crypto.createHash('md5'),
                    md5password = md5.update(password).digest('hex');

                var query = connection.query(userSql.insert, [username, md5password], function (err, result) {
                    if (err) {
                        console.log(err);
                        return res.redirect('/login_register');
                    }
                    console.log('注册成功');
                    req.session.user = new User(username, password);
                    console.log(req.session.user+"---------");
                    return res.redirect('/');
                });
            }
	connection.release();
        console.log("test connection");
        });
    });
	//connection.end();
});
app.post('/login',function(req,res){
    var username=req.body.username,
        password=req.body.password;

    console.log("login post");
     pool.getConnection(function (err,connection) {
        if (err) {
            console.log(err);
            req.session.error = '网络繁忙';
            connection.release();
            return res.redirect('/login_register');
        }
        var query=connection.query(userSql.queryByName,username,function(err,ret){
        if(err){
            console.log(err);
            req.session.error="网络繁忙，请稍后";
            res.redirect('/login');
        }
        
        if(ret===undefined){
            console.log("用户不存在");
            req.session.error="用户不存在";
            connection.release();
            return res.redirect('/login_register');
        }
        console.log("ret"+ret);
        var md5=crypto.createHash('md5'),
            md5password=md5.update(password).digest("hex");
            console.log("test login user"+ret+ret[0].name);
        if(md5password!==ret[0].password){
            console.log('密码错误');
            req.session.error="密码错误";
            return res.redirect('/login_register');
        }
        console.log("登陆成功");
        ret[0].password=null;
        delete ret[0].password;
        req.session.user=ret[0];
	connection.release();
        return res.redirect('/');
    });
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
    console.log("test post"+JSON.stringify(req.session.user)+req.session.user.name);
    /*var note=new Note{
        title:req.body.title,
        author:req.session.user.name,
        tag:req.body.tag,
        content:req.body.content
    };*/

    pool.getConnection(function (err,connection) {
        if (err) {
            console.log(err);
            req.session.error = '网络繁忙';
            connection.release();
            return res.redirect('/post');
        }
        var insertNote = connection.query(notesSql.insert,[req.body.title,req.session.user.name,req.body.tag,req.body.content], function (err, result) {
                    if (err) {
                        console.log(err);
                        return res.redirect('/post');
                    }
		    console.log(result);
                    console.log('发布成功');
                    connection.release();
                    return res.redirect('/');
                });
            });
   /* note.save(function(err,doc){
        if(err){
            console.log(err);
            return res.redirect('/post');
        }
        console.log("文章发表成功！");
        return res.redirect('/');
    });*/
});

app.get('/detail/:id',function(req,res){
    console.log("查看笔记1！+"+req.params.id);
   // req.session.lastPage='/detail/_id';  //cast(objectId)出错，因为这是后lastPage的值为字符串/detail/_id
    // req.session.lastPage='/detail/:'+req.params._id;   //：should not add :, cause ~~~
    req.session.lastPage='/detail/'+req.params.id;
    pool.getConnection(function(err,connection){
        if(err){
	    console.log(err); 
            req.session.error = '网络繁忙';
           return res.redirect('/');
	}    
    var queryNote = connection.query(notesSql.queryById,req.params.id, function (err, result) {
        if (err) {
            console.log(err);
            connection.release();
            return res.redirect('/post');
        }
        
        if(result!==undefined){
            res.render('detail',{
                title:'笔记详情',
                user:req.session.user,
                art:result[0],
                moment:moment
            });
        }
        connection.release();
    });
   });

});

app.listen(3000,function(req,res){
	console.log("server is running at port 3000");
});
