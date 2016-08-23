var app = require('http').createServer(handler),
  io = require('socket.io').listen(app),
  fs = require('fs'),
  mysql = require('mysql'),
  connectionsArray = [],
  connection = mysql.createConnection({
    //host: 'dsktopii-pc',
	host: 'localhost',
    user: 'root',
    password: '',
	//password: 'root',
    database: 'templatecontent',
    port: 3306
  }),
  POLLING_INTERVAL = 3000,
  pollingTimer;

  
  
  
  
  console.log('socket version:' + require('socket.io/package').version);
  console.log('mysql:' +  require('mysql').resolve);
  
// If there is an error connecting to the database
connection.connect(function(err) {
   if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
 
  console.log('connected as id ' + connection.threadId);
});




// creating the server ( localhost:8000 )
app.listen(3000);

// on server started we can load our client.html page
function handler(req, res) {
  fs.readFile(__dirname + '/client.html', function(err, data) {
    if (err) {
      console.log(err);
      res.writeHead(500);
      return res.end('Error loading client.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}



/*
 *
 * HERE IT IS THE COOL PART
 * This function loops on itself since there are sockets connected to the page
 * sending the result of the database query after a constant interval
 *
 */



var pollingLoop = function() {

console.log('\rconnectionsArray.length:' +connectionsArray.length);
  // Doing the database query

  var query = connection.query("SELECT c.commandqid,c.commandqs,c.status,c.mac, a.authkey as authkey FROM commandq c , authkeylog a where c.status='pending' and a.mac=c.mac and firstscheduletime<=now();"),
    cmdq = []; // this array will contain the result of our db query

  // setting the query listeners
  query
    .on('error', function(err) {
      // Handle error, and 'end' event will be emitted after this as well
      console.log(err);
      updateSockets(err);
    })
    .on('result', function(user) {
      // it fills our array looping on each user row inside the db
      cmdq.push(user);
    })
    .on('end', function() {
      // loop on itself only if there are sockets still connected
      if (connectionsArray.length) {
	  //console.log( Date.toDateString());
	  var d = new Date();
var n = d.toTimeString(); 
console.log(n);
        pollingTimer = setTimeout(pollingLoop, POLLING_INTERVAL);

        updateSockets({cmdq: cmdq
        });
      }
    });

};








//io.set('log level', 1); 
io.set('authorization', function (handshakeData, cb) {
    console.log('Auth1: ', handshakeData.query);
   // console.log('\rAuth2: ', handshakeData.xdomain);
    //console.log('\rAuth3: ', handshakeData.headers);

console.log('secuid:' + handshakeData.query.secuid);
// check db if this is valid
var isValid=true;


    cb(null, isValid);
});



// creating a new websocket to keep the content updated without any AJAX request
io.sockets.on('connection', function(socket) {



// custom event 
socket.on('myotherevent', function (data) {
   console.log('wooooooooooooooooooooooooo hooooooooooooooooooooooooooooo');
   console.log(data);
  });




// test can access handshake object here
//console.log(socket.handshake.foo == true); // writes `true`
//console.log(socket.handshake.query); // writes `true`


  var address = socket.handshake.address;
  console.log('\rconnectionsArray.length:' +connectionsArray.length);
  console.log('\rsocket.id:' + socket.id);
  //console.log('\rXroom:' + socket.in.room);
   console.log("\raddress.address : address.port: " + address.address + ":" + address.port);


  // starting the loop only if at least there is one user connected
  if (!connectionsArray.length) {
    pollingLoop();
  }



  socket.on('disconnect', function() {
    var socketIndex = connectionsArray.indexOf(socket);
    console.log('\rsocket = ' + socketIndex + ' disconnected');
	console.log('\r socket.handshake.address = ' + socket.handshake.address + ' disconnected');
	console.log('\r socket.handshake.secuid = ' + socket.handshake.query.secuid + ' disconnected');

	
 sqlDisconnect(socket);

    if (socketIndex >= 0) {
      connectionsArray.splice(socketIndex, 1);
    }
  });


  console.log('\r\rA new socket is connected!\r\r');
  connectionsArray.push(socket);
  SavetoMySQL(socket);

});


//for (var i = 0, len = objJSON.length; i < len; ++i) {
 //    var student = objJSON[i];


var updateSockets = function(data) {
  // adding the time of the last update
  //data.time = new Date();
  // sending new data to all the sockets connected
  data.cmdq.forEach(function(tmpSocket) {
   // tmpSocket.volatile.emit('notification', data);
  //
   // tmpSocket.emit('notification', data);

    console.log('----------------------------------------------------------------------------\r');
      
      console.log('\r'+ tmpSocket.commandqs);
      console.log('\r'+ tmpSocket.status);
      console.log('\r'+ tmpSocket.mac);
      console.log('\r'+ tmpSocket.authkey);
      //console.log('\rlength:'+ data.cmdq.length);
      console.log('\r\r');
      io.sockets.socket(tmpSocket.authkey).emit('notification', tmpSocket,

        function(data) {
          //var sqlupd="update commandq set status='executed' where commandqid=" + data;
          //console.log('callback:' + sqlupd);
          //connection.query(sqlupd)



//try stored proc instead of sql
// http://stackoverflow.com/questions/10546956/is-there-a-driver-for-mysql-on-nodejs-that-supports-stored-procedures
var myParams = data;
console.log('xxxxxxxxxxxxxxxxxxparam data:' + data);
connection.query("CALL spUpdateCmdQStatus(" + myParams + ")", function(err, results, fields) {
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



       //io.sockets.socket(tmpSocket.authkey).emit('notification', function (tmpSocket,callbk  {});
  });

};








/*
var updateSockets = function(data) {
  // sending new data to all the sockets connected
  io.socket.emit('notification', data);
};

*/

var SavetoMySQL = function(logdata) {
  //logdata is the socket
  var addressx = logdata.handshake.address;
  var secuid =  logdata.handshake.secuid;
  console.log('\r\r\rSAving INSERT.......\r\r');
//var d = new Date();
 
var sql= "UPDATE authkeylog SET connected=1, ip='" + addressx.address +"',authkey='" + logdata.id+"',logdate=now() where mac='" + logdata.handshake.query.secuid+"'";

//console.log(sql);
 connection.query(sql);

};





var sqlDisconnect = function(logdata) {
  //logdata is the socket
  var addressx = logdata.handshake.address;
  var secuid =  logdata.handshake.secuid;
  console.log('\r\r\rUpdating disconnected flag.......\r\r');
//var d = new Date();
 
var sql= "UPDATE authkeylog SET connected=0 where mac='" + logdata.handshake.query.secuid+"'";

//console.log(sql);
 connection.query(sql);

};
