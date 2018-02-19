var http = require('http');
var formidable = require('formidable');

var server = http.createServer(function(req, res){
  switch (req.method) {
    case 'GET':
      show(req, res);
      break;
      case 'POST':
      upload(req, res);
      break;
  }
});

server.listen(3000);

//socket.io for realtime connection
var io = require('socket.io')(server);

io.on('connection', function(socket){
  console.log('a user connected');
});

function show(req, res) {
  var html = ''
    +'<script src="/socket.io/socket.io.js"></script>'
    +'<script>'
    +' var socket = io();'
    +'</script>'
    +'<form method="post" action="/" enctype="multipart/form-data">'
    + '<p><input type="text" name="name" /></p>'
    + '<p><input type="file" name="file" /></p>'
    + '<p><input type="submit" value="Upload" /></p>'
    + '<p><progress value="0" max="100"/></p>'
    + '</form>';
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Length', Buffer.byteLength(html));
  res.end(html);
}

function upload(req, res) {
  if (!isFormData(req)) {
    res.statusCode = 400;
    res.end('Bad Request: expecting multipart/form-data');
    return;
  }

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    console.log(fields);
    console.log(files);
    res.end('upload complete!');
  });

  //progress bar
  form.on('progress', function(bytesReceived, bytesExpected){
    var percent = Math.floor(bytesReceived / bytesExpected * 100);
    console.log(percent);
  });

  /* an other way is:
  form.on('field', function(field, value){
    console.log(field);
    console.log(value);
  });

  form.on('file', function(name, file){
    console.log(name);
    console.log(file);
  });

  form.on('end', function(){
    res.end('upload complete!');
  });

  form.parse(req); */

}

function isFormData(req) {
  var type = req.headers['content-type'] || '';
  return 0 == type.indexOf('multipart/form-data');
}
