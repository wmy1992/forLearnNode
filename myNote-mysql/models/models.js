/**
 * Created by ASUS on 2016/3/29.
 */

/*var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var userSchema=new Schema({
    username:String,
    password:String,
    email:String,
    createTime:{
        type:Date,
        default:Date.now
    }
});

var noteSchema=new Schema({
    title:String,
    author:String,
    tag:String,
    content:String,
    createTime:{
        type:Date,
        default:Date.now
    }
});*/
function User(name,password){
    this.name=name;
    this.password=password;
};

function Note(title,author,tag,content,createTime){
    this.title=title;
    this.author=author;
    this.tag=tag;
    this.content=content;
    this.createTime=Date.now;
};

var user=new User("why","1234");
console.log("test models"+user+user.name+user.password);
exports.User=User;
exports.Note=Note;

