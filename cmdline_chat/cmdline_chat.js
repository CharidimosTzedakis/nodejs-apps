const events = require('events');
const net = require('net');
const sqlite3 = require('sqlite3').verbose();
const chatsrv_db = new sqlite3.Database('cmdline_chat',  sqlite3.OPEN_READWRITE, (err)=> {
                        if (err) {
                          console.error(err.message);
                        }
                        console.log('Connected to the cmdline database.');
                  });

const channel = new events.EventEmitter();
channel.clients = {};
channel.subscriptions = {};

const commands = {"/start":"startup chat room (by room creator)",
                  "/shutdown":"shutdown chat room (by room creator)",
                  "/signup":"create user account",
                  "/login":"login as user",
                  "/logout":"logout from your account",
                  "/create room":"create chat room",
                  "/delete room":"delete chat room",
                  "/enter room":"enter a chat room" };

//adds a listener for the join event that stores a user's client object,
//allowing the application to send data back to the user
channel.on('join', function(id, client) {
  this.clients[id] = client;
  this.subscriptions[id] = (senderId, message) => {
      if (id != senderId) {
        this.clients[id].write(message);
      }
  };
  this.on('broadcast', this.subscriptions[id]);
});

//adds a listener for the leave event that removes broadcast listener for
//a specific client
channel.on('leave', function(id){
  channel.removeListener('broadcast', this.subscriptions[id]);
  channel.emit('broadcast', id, `${id} has left the chatroom.\r\n`);
});

//----shutdown command-----//
//prevent chat without shutting dowm the server
channel.on('shutdown', () => {
  channel.emit('broadcast', '', 'This room has shut down.\r\n');
  channel.removeAllListeners('broadcast');
});

//----startup command-----//
//add again listeners to broadcast event
channel.on('start', () => {
  if (channel.listenerCount('broadcast') == 0 ){
    for (var id in channel.subscriptions){
      channel.on('broadcast', channel.subscriptions[id]);
    }
    channel.emit('broadcast', '', 'The room has started.\r\n');
  }
  else{
    channel.emit('broadcast', '', 'The room is already up.\r\n');
  }
});

//----show list of commands----//
channel.on('showCommands', () => {
  let commandListString ='';
  for (var cmd in commands){
    commandListString += cmd + ' --> ' + commands[cmd] + "\r\n";
  }
  channel.emit('broadcast', '', commandListString+"\r\n\r\n");
});

//----signup procedure---------//
channel.on('signup', () => {

  channel.emit('broadcast', '', 'commandListString+"\r\n\r\n');
});

//User command: create new room/private room //




//Admin command: create new


//Show welcome message with number of listeners
channel.on('join', (id, client) => {
  const welcome =`Welcome!\r\nGuests online: ${channel.listeners('broadcast').length}\r\nTo print list of commands type: /?\r\n\r\n`;
  client.write(`${welcome}`);
});

//set max number of listeners
channel.setMaxListeners(50);

const server = net.createServer(client => {
  const id = `${client.remoteAddress}:${client.remotePort}`;
  channel.emit('join', id, client);

  client.on('data', data => {
      data = data.toString();
      //---process the string here and remove /r/n and whatever left
      if (data.startsWith('/shutdown')){
         channel.emit('shutdown');
      }
      else if (data.startsWith('/start')){
         channel.emit('start');
      }
      else if (data.startsWith('/?')){
         channel.emit('showCommands');
      }
      else if (data.startsWith('/signup')){
         channel.emit('signup');
      }
      else {
        channel.emit('broadcast', id, data);
      }
  });

  client.on('close', () => {
    channel.emit('leave', id);
  });
});
//'192.168.1.5'
server.listen(8888);

process.on('exit', (code) => {
  console.log(`About to exit with code: ${code}`);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT.  Press Control-D to exit.');
});
