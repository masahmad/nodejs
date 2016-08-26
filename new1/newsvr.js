var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');


var fs = require('fs');
var util = require('util');



var POLLING_INTERVAL = 9000;
var pollingTimer;
var connectionsArray = [];

//my sql setup


//log file
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;


//config
require('dotenv').config();


console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};


var connection = mysql.createConnection({
		host : process.env.DB_HOST,
		user : process.env.DB_USER,
		password : '',
		database : process.env.DB_NM,
		port : 3306
	});

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/content/index.htm');
});

http.listen(3000, function () {
	console.log('listening on *:3000');
	console.log('socket version:' + require('socket.io/package').version);
	console.log('\n');

});





/*

  require('socketio-auth')  (io, {
  authenticate: authenticate, 
  postAuthenticate: postAuthenticate,
  timeout: 1000
});






function authenticate(socket, data, callback) {
  var username = data.username;
  var password = data.password;
  
  findUser('User', {username:username}, function(err, user) {
    if (err || !user) return callback(new Error("User not found"));
    return callback(null, user.password == password);
  });
}






function findUser(xusr) {

return true
}



function postAuthenticate(socket, data) {
  var username = data.username;
  console.log('post auth*******************************');
  findUser('User', {username:username}, function(err, user) {
    socket.client.user = user;
	console.log('post auth2*******************************');
	console.log(' socket.client.user:' +  socket.client.user);
  });
}
*/






// If there is an error connecting to the database
connection.connect(function (err) {
	if (err) {
		console.error('error connecting: ' + err.stack);
		return;
	}

	console.log('db connected as id ' + connection.threadId);
	console.log('\n\n');
	//pollingLoop();
});







io.on('connection', function (socket) {
	console.log('socket connection detected');
	

	
	var obj = {"socketid": socket.id, "secuid":   "testxx"}
	connectionsArray.push(socket.id);
	//connectionsArray.push(obj);
	
	
	var address = socket.handshake.address;
	console.log('connectionsArray.length:' + connectionsArray.length);
	console.log('connected socket.id:' + socket.id);
	

	//UPDATE authkeylog SET connected=1
	UpdateAuthKeyLogTbl(socket,1);

	// *** disconnect socket ***
	socket.on('disconnect', function () {
	
	var handshakeData = socket.request;
    //var secuid_disconnect =  handshakeData._query['secuid']);
	
		console.log(' system disconnect  - socket.id:' + socket.id);
		var socketIndex = connectionsArray.indexOf(socket.id);
		//console.log('secuid' +  secuid_disconnect  +  ' disconnected');
		//console.log('socket.handshake.address = ' + socket.handshake.address + ' disconnected');
		//console.log('socket.handshake.secuid = ' + socket.handshake.query.secuid + ' disconnected');

		UpdateAuthKeyLogTbl (socket,0); // disconnect
		

		if (socketIndex >= 0) {
			console.log(' socketindex=' + socketIndex);
			connectionsArray.splice(socketIndex, 1);
		}

	});
	
	
	
	

	// starting the loop only if at least there is one user connected
	if (connectionsArray.length > 0) {
		console.log('start loop again');
		pollingLoop();
	}
	
	
	
	
	
	
	
	// unused
  socket.on('unauthorized', function(err){
  console.log("There was an error with the authentication:", err.message); 
});

	

});





io.use(function(socket, next) {
  var handshakeData = socket.request;
  console.log("XXmiddleware:", handshakeData._query['secuId']);
  next();
});






var pollingLoop = function () {

	console.log('\n\n in  poll looping...');

	var query = connection.query("SELECT c.commandqid,c.commandqs,c.status,c.mac, a.authkey as authkey FROM commandq c , authkeylog a where c.status='pending' and a.mac=c.mac and firstscheduletime<=now();"),
	cmdq = []; // this array will contain the result of our db query

	//console.log("\nSELECT c.commandqid,c.commandqs,c.status,c.mac, a.authkey as authkey FROM commandq c , authkeylog a where c.status='pending' and a.mac=c.mac and firstscheduletime<=now();");

	// setting the query listeners
	query
	.on('error', function (err) {
		// Handle error, and 'end' event will be emitted after this as well
		console.log(err);
		updateSockets(err);
	})
	.on('result', function (user) {
		// it fills our array looping on each user row inside the db
		cmdq.push(user);
	})
	.on('end', function () {

		// loop on itself only if there are sockets still connected

		
		
		
		console.log('\n\n\n');
		console.log('---------------------------------------');
		console.log('.      Total socket connections  ' + connectionsArray.length + '    .');
		console.log('.                                     .');
		for (i = 0, len = connectionsArray.length; i < len; i++) {
			console.log('.      ' + connectionsArray[i] + '         .');
		}
		console.log('.                                     .');
		console.log('---------------------------------------');

		if (connectionsArray.length > 0) {
			//console.log( Date.toDateString());
			var d = new Date();
			var n = d.toTimeString();
			console.log(n);

			// Doing the database query
			pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);
			 if (cmdq.length >0) assignCmdQToSockets({	cmdq : cmdq});
		}
		
		else
		 {
		console.log('pause');
		}

	});

};


// this is called after reading db in  the polingloop
// if htere is a pending cmd in the queue then try to assign to socket below
var assignCmdQToSockets = function (data) {

	//console.log('\n   in Function UpdateSockets...');
   console.log('\n\n\n Pending Commands in Current MySQL Queue: ' + data.cmdq.length);
   console.log('*******************************************');
	// sending new data to all the sockets connected
	data.cmdq.forEach(function (tmpSocket) {
	
		console.log('status:' + tmpSocket.status);
		console.log('secuid:' + tmpSocket.mac);
		console.log('commandqs: ' + tmpSocket.commandqs);
		console.log('tmpSocket.authkey: ' + tmpSocket.authkey   +' (' + io.sockets.connected[tmpSocket.authkey] +')');
		console.log('*******************************************');
	

		if (io.sockets.connected[tmpSocket.authkey] != null) {

			io.sockets.connected[tmpSocket.authkey].emit("notification", tmpSocket, function (data) {
				// http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
				var myParams = data;
				console.log('xxparam data:' + data);
				connection.query("CALL spUpdateCmdQStatus(" + myParams + ")", function (err, results, fields) {
					//if (err || results[0].res === 0) {
					if (err) {
						throw err;
					} else {
						// My Callback Stuff ...
						console.log('stored proc updated')
					}

				});

				// endbrace of func data
			});

		} // if not null
	});

};







var UpdateAuthKeyLogTbl = function (logdata ,conflag) {
	//logdata is the socket
	
	  var handshakeData = logdata.request;
    var secuid  =  handshakeData._query['secuid'];
	console.log('in Function SavetoMySQL...');
	//var sql= "UPDATE authkeylog SET connected=1, ip='" + addressx.address +"',authkey='" + logdata.id+"',logdate=now() where mac='" + logdata.handshake.query.secuid+"'";
	var sql = "UPDATE authkeylog SET connected=" + conflag +" , authkey='" + logdata.id + "',logdate=now() where mac='" + secuid +"'";
	console.log(sql);
	connection.query(sql);
};





/*
var sqlDisconnect = function (logdata) {
	//logdata is the socket
	var addressx = logdata.handshake.address;
	var secuid = logdata.handshake.secuid;
	console.log('in Function sqlDisconnect...');
	

	//var sql= "UPDATE authkeylog SET connected=0 where mac='" + logdata.handshake.query.secuid+"'";
	var sql = "UPDATE authkeylog SET connected=0 where mac='test1'";
	//console.log(sql);
	connection.query(sql);

};
*/



