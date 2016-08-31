var express 	= require('express'),
	http 		= require('http'),
	socketIO 	= require('socket.io'),
	mongoose 	= require('mongoose'),
	app 		= express(),
	server 		= http.createServer(app),
	io 			= socketIO.listen(server),
	port 		= 3000;

const 	CHAT_COMMAND 				= '/',
		CHAT_COMMAND_PRIVATE_MSG 	= '/pm ',
		CHAT_COMMAND_KICK 			= '/k ';

const	CHAT_MESSAGE_USER_COMMAND_ERROR 	= 'Wrong command !',
		CHAT_MESSAGE_USER_KICK				= 'You have been kicked by ',
		CHAT_MESSAGE_ALL_KICK				= 'has been kicked by ';

// Database declaration
var db_ip 		= 'localhost',
	db_port 	= 27017,
	db_storage 	= 'mongodb',
	db_schema 	= 'mongodb',
	db_url 		= db_schema + '://' + db_ip + ':' + db_port + '/' + db_storage;

// Database connection
mongoose.connect(db_url, function(err){
	console.log("Connecting to database: " + db_url);
	if(err){
	console.log(err);
	} else{
	    console.log('Connected to mongodb!');
	}
	});

// Data model declaration
var db_schema = mongoose.Schema({ 
	user: 		String, 
    message: 	String,
    time: 	{ type : Date, default: Date.now }
});

var Message = mongoose.model('messages', db_schema);

module.exports = Message;

/*app.use(express.static(__dirname + '\\public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '\\public\\views');
app.get('/', function(req, res){ 
	res.render('index.ejs');
});  */

app.use(express.static(__dirname + '\\public'));
app.get('/', function(req, res){ 
	res.sendFile(__dirname + '\\public\\views\\index.html');
});  

server.listen(port, function(){
	console.log('\n					+-----------------------------+');
	console.log('					| Server Running - Port: ' + port + ' |');
	console.log('					+-----------------------------+\n');
}); 

io.on('connection', function(socket){
	var message_connection = 'User ' + socket.id + ' has joined the chat !';
	socket.broadcast.emit('user connected', message_connection); // Broadcast to ALL exclude socket
	saveMessage(socket.id, message_connection);
	console.log("Client connected: " + socket.id);
	console.log(io.engine.clientsCount);

	socket.on('disconnect', function(){
		var message_disconnection = 'User ' + socket.id + ' has left the chat !';
		socket.broadcast.emit('user disconnected', message_disconnection); // Broadcast to ALL exclude socket
    	saveMessage(socket.id, message_disconnection);
    	console.log("Client disconnected: " + socket.id);
    	console.log(io.engine.clientsCount);
  	});

	Message.find({}, function(err, users){
  	if (err) throw err;
  		console.log(users);
  		socket.emit('chat history', users);
	});

	socket.on('chat message', function(msg){
		if(msg.length == 0)
			return;
		if(msg.startsWith(CHAT_COMMAND)){
			if(msg.startsWith(CHAT_COMMAND_PRIVATE_MSG)){
				var user = userExist(msg);
				if(user == null)
					return;

				msg = msg.substr(msg.indexOf('\"', msg.indexOf('\"')+1)+1).trim();
				var message = '(PRIVATE) ' + socket.id + ' said : ' + msg;
				socket.to(user).emit('chat message', message);
				socket.emit('chat message', message);
			}
			else if(msg.startsWith(CHAT_COMMAND_KICK)){
				var user = userExist(msg);
				if(user == null)
					return;

				var message = '(KICKED) ' + socket.id + ' has been kicked';
				socket.to(user).emit('chat message', CHAT_MESSAGE_USER_KICK + socket.id);
				io.sockets.sockets[user].disconnect();
				io.emit('chat message', user + ' ' + CHAT_MESSAGE_ALL_KICK  + socket.id); // Broadcast to ALL include socket
				saveMessage(socket.id, message);
			}
			else {
				socket.emit('chat message', CHAT_MESSAGE_USER_COMMAND_ERROR);
			}
		}
		else {
			var message = socket.id + ' said: ' + msg;
			console.log(message);
			io.emit('chat message', message); // Broadcast to ALL include socket
			// Insert data into database
			saveMessage(socket.id, message);
		}
	});

});

function userExist(msg){
	var user = msg.substr(msg.indexOf('\"')+1, 
					  msg.indexOf('\"', msg.indexOf('\"')+1) - msg.indexOf('\"')-1
					  );
	if(typeof io.sockets.sockets[user] === 'undefined') // Should check if user exist to continue
		return null;
	return user;
}

function saveMessage(user, message){
	var _message = new Message({user: user, message: message});
	console.log('Saving Message: \n' + _message);
	_message.save(function(err){
		if(err) throw err;
		console.log('Message saved !');
	});
}