//Server
var server				=	require('express')();
var http				=	require('http').Server(server);
var httpl 				=	require('http');
var net					=	require('net');
var express				=	require('express');
var fs					=	require('fs');   
var bodyParser			=	require('body-parser');    
var session				=	require('express-session');
var nodemailer 			=	require('nodemailer');
const dotenv 			=	require('dotenv');
var cookieParser		=	require('cookie-parser');
var crypto				=	require('crypto');
var mongo				=	require('mongodb');
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

function generateId(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
		result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
	}
   return result.join('');
}

var database;
var usersDB;
var invoiceDB;
var serviceDB;

//PORT Listening
http.listen(process.env.PORT, function(){
	mongoClient.connect(url,{useUnifiedTopology: true},function(err,client){
		if(err){
			console.log(err)
		}else{
			database 				=	client;
			invoiceDB				=	database.db(process.env.database).collection('Fakture');
			usersDB 				=	database.db(process.env.database).collection('Korisnici');
			serviceDB 				=	database.db(process.env.database).collection('Cenovnik');
			oldInvoiceDB 			=	database.db(process.env.database).collection('Stare Fakture');
			console.log("Database Connected...")
		}
	});
  	console.log('Server Started');
});

var mongoClient	=	mongo.MongoClient;
var url	=	process.env.mongourl;


server.get('/',function(req,res){
	if(process.env.siteurl=="http://localhost:3000"){
		req.session.user = {email:"avlave@hotmail.com","role":10}
	}
	if(req.session.user){
		serviceDB.find({}).toArray(function(err,cenovnik){
			if(err){
				console.log(err);
				res.send("Greska u bazi podataka");
			}else{
				res.render("home",{
					cenovnik: cenovnik
				});
			}
		});
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
		res.redirect("/login");
	}
});

server.post('/post-invoice',function(req,res){
	if(req.session.user){
		var fakturaJson	=	JSON.parse(req.body.fakturajson);
		if(fakturaJson.uniqueId=="new"){
			//Dodaj fakturu
			fakturaJson.uniqueId = generateId(10)+"--"+new Date().getTime();
			invoiceDB.insertOne(fakturaJson,function(err,addedResult){
				if(err){
					console.log(err);
					res.send("Greska u bazi podataka")
				}else{
					res.redirect('/all-invoices');
				}
			});
		}else{
			//Izmeni fakturu
			invoiceDB.replaceOne({uniqueId:fakturaJson.uniqueId},fakturaJson, (err , collection) => {
				if(err){
					console.log(err);
					res.send("Greska u bazi podataka");
				}else{
					res.redirect("/all-invoices");
				}
			});
		}
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

server.get('/edit-service',function(req,res){
	if(req.session.user){
		serviceDB.find({}).toArray(function(err,services){
			if(err){
				console.log(err);
				res.send("Greska u bazi podataka");
			}else{
				res.render("editService",{
					services: JSON.parse(JSON.stringify(services))
				});
			}
		});
		
	}else{
		res.redirect("/");
	}
});

server.post('/edit-service',function(req,res){
	if(req.session.user){
		if(req.body.id=="new"){
			var serviceJson	=	{};
			serviceJson.code = req.body.code;
			serviceJson.name = req.body.name;
			serviceJson.price = req.body.price;
			serviceJson.uniqueId = new Date().getTime().toString();
			serviceDB.insertOne(serviceJson,function(err,addedResult){
				if(err){
					console.log(err);
					res.send("Greska u bazi podataka")
				}else{
					res.redirect('/edit-service');
				}
			});	
		}else{
			var setObj	=	{ $set: {code:req.body.code,name:req.body.name,price:req.body.price}};
			serviceDB.updateOne({uniqueId:req.body.id.toString()},setObj, (err , collection) => {
				if(err){
					console.log(err);
					res.send("Greska u bazi podataka");
				}else{
					res.redirect('/edit-service');
				}
			});
		}
	}else{
		res.redirect("/");
	}
	
});

server.post('/delete-service',function(req,res){
	if(req.session.user){
		serviceDB.deleteOne({uniqueId:req.body.id},function(err,deletionResult){
			if(err){
				console.log(err);
				res.send("greska u bazi podataka");
			}else{
				res.redirect("/edit-service")
			}
		});
	}else{
		res.redirect("/");
	}
});

server.get('/all-invoices',function(req,res){
	if(req.session.user){
		invoiceDB.find({}).toArray(function(err,invoices){
			if(err){
				console.log(err);
				res.send("Greska u bazi podataka");
			}else{
				res.render("allInvoices",{
					invoices: JSON.parse(JSON.stringify(invoices))
				});
			}
		});
		
	}else{
		res.redirect("/");
	}
});

server.get('/invoice-view/:uniqueId',function(req,res){
	if(req.session.user){
		serviceDB.find({}).toArray(function(err,cenovnik){
			if(err){
				console.log(err);
				res.send("Greska u bazi podataka");
			}else{
				invoiceDB.find({uniqueId:req.params.uniqueId}).toArray(function(err,faktura){
					if(err){
						console.log(err);
						res.send("Greska u bazi podataka");
					}else{
						res.render("home",{
							cenovnik: cenovnik,
							faktura: faktura[0]
						});
					}
				});
				
			}
		});
	}else{
		res.redirect("/login");
	}
});

server.post('/delete-invoice',function(req,res){
	if(req.session.user){
		invoiceDB.find({uniqueId:req.body.deletionid}).toArray(function(err,faktura){
			if(err){
				console.log(err);
				res.send("Greska u bazi podataka");
			}else{
				var staraFaktura	=	JSON.parse(JSON.stringify(faktura[0]));
				invoiceDB.deleteOne({uniqueId:req.body.deletionid},function(err,deletionResult){
					if(err){
						console.log(err);
						res.send("greska u bazi podataka");
					}else{
						oldInvoiceDB.insertOne(staraFaktura,function(err,addedResult){
							if(err){
								console.log(err);
								res.send("Greska u bazi podataka")
							}else{
								res.redirect('/all-invoices');
							}
						});
					}
				});
				
			}
		});
		
	}else{
		res.redirect("/");
	}
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

process.on('uncaughtException', function (err) {
	// handle the error safely
	console.log("Uncaught exception: "+err);
});



















