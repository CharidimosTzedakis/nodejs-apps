var http = require('http');
var qs = require('querystring');
var items = [];

var server = http.createServer(function(req, res){
  if ('/' == req.url) {
    switch (req.method) {
      case 'GET':
        show(res);
        break;
      case 'POST':
        add(req, res);
        break;
      case 'DELETE':
        console.log ("deleting item...");
        break;
      default:
        badRequest(res);
    }
  }
  else {
    notFound(res);
  }
});

server.listen(3000);

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
            + '<p><input id="inputText" type="text" name="item" /></p>'
            + '<p><input type="submit" value="Add Item" />'
            + '   <input type="button" value="Delete Item" onclick="deleteItem();"/> </p>'
            + '</form>'
            + '<script src="/to-do/todo-client.js" type="text/javascript"</script>'
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
