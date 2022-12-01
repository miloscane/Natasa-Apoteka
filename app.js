//Server
var server				=	require('express')();
var http					=	require('http').Server(server);
var httpl 				= require('http');
var net						=	require('net');
var express				=	require('express');
var fs						=	require('fs');   
var bodyParser		=	require('body-parser');    
var session				=	require('express-session');
var nodemailer 		= require('nodemailer');
const dotenv 			=	require('dotenv');
var cookieParser	=	require('cookie-parser');
var crypto				=	require('crypto');
var mongo					=	require('mongodb');
dotenv.config();

server.set('view engine','ejs');
var viewArray	=	[__dirname+'/views'];
var viewFolder	=	fs.readdirSync('views');
for(var i=0;i<viewFolder.length;i++){
	if(viewFolder[i].split(".").length==1){
		viewArray.push(__dirname+'/'+viewFolder[i])
	}
}
server.set('views', viewArray);
server.use(express.static(__dirname + '/public'));
server.use(bodyParser.json());  
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(session({
	secret: process.env.sessionsecret,
    resave: true,
    saveUninitialized: true
}));

function hashString(string){
	var hash	=	crypto.createHash('md5').update(string).digest('hex')
	return hash
}

var database;
var usersDB;
var invoiceDB;

//PORT Listening
http.listen(process.env.PORT, function(){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			database 				=	client;
			invoiceDB				=	database.db(process.env.database).collection('Fakture');
			usersDB 				=	database.db(process.env.database).collection('Korisnici');
			console.log("Database Connected...")
		}
	});
  	console.log('Server Started');
});

var mongoClient	=	mongo.MongoClient;
var url	=	process.env.mongourl;


server.get('/',function(req,res){
	if(req.session.user){
		res.render("home",{});	
	}else{
		res.redirect("/login");
	}
});

server.get('/login',function(req,res){
	if(req.session.user){
		res.redirect("/")
	}else{
		res.render("login",{});
	}
});

server.post('/login',function(req,res){
	if(!req.session.user){
		var email 		=	req.body.email;
		var password 	=	hashString(req.body.password);
		usersDB.find({email:email}).toArray(function(err,korisnici){
			if(err){
				console.log(err);
				res.send("Greska u bazi podataka")
			}else{
				if(korisnici.length>0){
					if(password == korisnici[0].password){
						var sessionObject	=	JSON.parse(JSON.stringify(korisnici[0]));
						delete sessionObject.password;
						req.session.user	=	sessionObject;
						res.redirect("/")
					}else{
						res.send("Pogresna Lozinka.")
					}
				}else{
					res.send("Ne postoji korisnik sa ovom e-mail adresom.");
				}
			}
		});
	}else{
		res.redirect("/");
	}
});

server.post('/new-invoice',function(req,res){
	if(req.session.user){
		res.redirect("/");
	}else{
		res.redirect("/");
	}
});

server.get('/logout',function(req,res){
	if(req.session){
		req.session.destroy(function(){});
	}
	res.redirect('/login');
});

server.get('*',function(req,res){
	res.send("Nepostojeci link")
});

process.on('SIGINT', function(){
	database.close();
	console.log("Database Closed [SIGINT]");
	process.exit();
});
process.on('SIGTERM', function(){
	database.close();
	console.log("Database Closed [SIGTERM]");
	process.exit();
});
process.on('exit', function(){
	database.close();
	console.log("Database Closed [EXIT]");
	process.exit();
});



















