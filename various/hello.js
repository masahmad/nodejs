var http = require('http');
var fs= require('fs');


function  onRequest(request,response) {

if ( request.method =='GET' && request.url =='/') {

response.writeHead(200,{"Content-Type":"text/html"});
fs.createReadStream("./index.html").pipe(response);
}

else { send404Response(response)}



}




//404
function send404Response(response) {

response.writeHead(404,{"Content-Type":"text/plain"});
response.write("Error 404: Page not found!");
response.end();

}


// Handle requesrt
http.createServer(onRequest).listen(8888);
console.log('Server is running');