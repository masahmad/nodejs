var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');

var POLLING_INTERVAL = 9000;
var pollingTimer;
var connectionsArray = [];

//my sql setup









var connection = mysql.createConnection({
		host : 'localhost',
		user : 'root',
		password : '',
		database : 'templatecontent',
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





  require('socketio-auth')  (io, {
  authenticate: authenticate, 
  postAuthenticate: postAuthenticate,
  timeout: 1000
});






function authenticate(socket, data, callback) {
  var username = data.username;
  var password = data.password;
  
  db.findUser('User', {username:username}, function(err, user) {
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
  db.findUser('User', {username:username}, function(err, user) {
    socket.client.user = user;
	console.log('post auth2*******************************');
	console.log(' socket.client.user:' +  socket.client.user);
  });
}








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
	connectionsArray.push(socket.id);
	
	
	var address = socket.handshake.address;
	console.log('connectionsArray.length:' + connectionsArray.length);
	console.log('connected socket.id:' + socket.id);
	console.log('socket.handshake.query.secuid = ' + socket.handshake.query.name );
	
	//console.log(socket.handshake);
	//console.log('req=' + socket.request.query);
	
	
	

	//connectionsArray.push(socket);
	//UPDATE authkeylog SET connected=1
	SavetoMySQL(socket);

	// *** disconnect socket ***
	socket.on('disconnect', function () {
		console.log(' systedem disconnect  - socket.id:' + socket.id);
		var socketIndex = connectionsArray.indexOf(socket.id);
		console.log('socket  index= ' + socketIndex + ' disconnected');
		//console.log('socket.handshake.address = ' + socket.handshake.address + ' disconnected');
		//console.log('socket.handshake.secuid = ' + socket.handshake.query.secuid + ' disconnected');

		sqlDisconnect(socket);

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

});














var pollingLoop = function () {

	console.log('\n\nin Function poll looping...');

	var query = connection.query("SELECT c.commandqid,c.commandqs,c.status,c.mac, a.authkey as authkey FROM commandq c , authkeylog a where c.status='pending' and a.mac=c.mac and firstscheduletime<=now();"),
	cmdq = []; // this array will contain the result of our db query

	console.log("\nSELECT c.commandqid,c.commandqs,c.status,c.mac, a.authkey as authkey FROM commandq c , authkeylog a where c.status='pending' and a.mac=c.mac and firstscheduletime<=now();");

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
			updateSockets({
				cmdq : cmdq
			});
		}

	});

};

// this is called after reading db in  the loop
var updateSockets = function (data) {

	console.log('\n   in Function UpdateSockets...');

	// adding the time of the last update
	//data.time = new Date();
	// sending new data to all the sockets connected
	data.cmdq.forEach(function (tmpSocket) {
		// tmpSocket.volatile.emit('notification', data);
		//
		// tmpSocket.emit('notification', data);

		console.log('\n');

		console.log('commandqs: ' + tmpSocket.commandqs);
		console.log('status:' + tmpSocket.status);
		console.log('mac:' + tmpSocket.mac);
		console.log('tmpSocket.authkey from db: ' + tmpSocket.authkey);
		console.log('length of cmdq objects:' + data.cmdq.length);
		//console.log("\r Object.keys(io.sockets.connected 1:" + Object.keys(io.sockets.connected));
		//console.log('\r  io.sockets.connected 2:'     + io.sockets.connected);
		console.log('\n\n  check if  socket id in cmdq  is currently connected :' + io.sockets.connected[tmpSocket.authkey]);

		//console.log("\r" + io.sockets.connected[');
		//Object.keys(o)

		//io.sockets.socket(tmpSocket.authkey).emit('notification', tmpSocket, function (data)
		//io.socket[tmpSocket.authkey].emit('notification', tmpSocket, function (data)


		if (io.sockets.connected[tmpSocket.authkey] != null) {

			io.sockets.connected[tmpSocket.authkey].emit("notification", tmpSocket, function (data) {
				// http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
				var myParams = data;
				console.log('xxxxxxxxxxxxxxxxxxparam data:' + data);
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







var SavetoMySQL = function (logdata) {
	//logdata is the socket
	var addressx = logdata.handshake.address;
	var secuid = logdata.handshake.secuid;
	console.log('in Function SavetoMySQL...');
	//var d = new Date();

	//var sql= "UPDATE authkeylog SET connected=1, ip='" + addressx.address +"',authkey='" + logdata.id+"',logdate=now() where mac='" + logdata.handshake.query.secuid+"'";
	var sql = "UPDATE authkeylog SET connected=1, ip='" + addressx.address + "',authkey='" + logdata.id + "',logdate=now() where mac='test1'";
	console.log(sql);
	connection.query(sql);

};






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
