var http = require('http');
var qs = require('querystring');
var mime = require('mime');
var path = require('path');
var fs = require ('fs');
var items = [];

var server = http.createServer(function(req, res){
  console.log(req.url);
  if ('/' == req.url) {
    switch (req.method) {
      case 'GET':
        show(res);
        break;
      case 'POST':
        add(req, res);
        break;
      case 'DELETE':
        delItem (req, res);
        break;
      default:
        badRequest(res);
    }
  }
  //deliver todo-client.js else show form
  else if ('/todo-client.js' == req.url) {
    filePath = 'todo_app_client/todo_client.js';
    serveStatic (res, filePath );
  }
  else {
    notFound(res);
  }
});

server.listen(3000);

//function to send 404 not found
function send404 (response) {
  response.writeHead (404, {'Content-Type': 'text/plain'});
  response.write ('Error 404: resource not found.');
  response.end();
}

//sending the file requested
function sendFile (response, filePath, fileContents) {
  response.writeHead(
    200,
    {"Content-type": mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

//function used to serve static files
function serveStatic (response, absPath)  {
  fs.exists (absPath, function (exists) {
    if (exists) {
      fs.readFile(absPath, function (err, data) {
        if (err) {
          send404(response);
        }
        else{
          sendFile(response, absPath, data);
        }
      });
    }
    else{
      send404(response);
    }
  });
}

//function showing items
function show(res) {
  //for simple apps, inlining the HTML instead of using a template engine works well
  var html = '<html><head><title>Todo List</title></head><body>'
            + '<h1>Todo List</h1>'
            + '<ul>'
            + items.map(function(item){
                return '<li>' + item + '</li>'
              }).join('')
            + '</ul>'
            + '<form method="post" action="/">'
            + '<p><input id="inputText" type="text" name="item"/> </p>'
            + '<p><input type="submit" value="Add Item" />'
            + '   <input type="button" value="Delete Item" onclick="deleteItem();"/> </p>'
            + '</form>'
            + '<script src="todo-client.js" type="text/javascript"> </script>'
            + '<script src="http://code.jquery.com/jquery-3.2.1.min.js" type="text/javascript"> </script>'
            + '</body></html>';


  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Length', Buffer.byteLength(html));
  res.end(html);
}

//not found handling
function notFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not Found');
}

//function adding items to toDO list
function add(req, res) {
  var body = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk){ body += chunk });
  req.on('end', function(){
    console.log(body);
    var obj = qs.parse(body);
    if (obj.item != ''){
      items.push(obj.item);
    }
      show(res);
  });
}

//function for deleting items from todo list
function delItem (req, res) {
  console.log ("deleting item...");
  var body = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk){ body += chunk });
  req.on('end', function(){
    console.log("Trying to delete item:"+ body);
    console.log (items);
    var index = items.indexOf(body);
    if (index != -1 ){
      items.splice(index, 1);
      console.log ("Item deleted.");
      console.log (items);
      res.statusCode = 200;
      show(res);
    }
  });
}
