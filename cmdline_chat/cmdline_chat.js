const events = require('events');
const net = require('net');
const sqlite3 = require('sqlite3').verbose();
const sha1 = require('sha1');
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
                  "/signup username password":"create user account with username and password",
                  "/login username password":"login as user",
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
channel.on('signup', (commandData) => {
  //process commandData commandData string
  const arr = commandData.split(" ");
  if (arr.length >2){
    const username = arr[1];
    const password = arr[2];
    //check if username exists
    const sqlUserQuery = `SELECT username u, password p
                          FROM users
                          WHERE username  = ?`;

    //first row only
    chatsrv_db.get(sqlUserQuery, [username], (err, row) => {
      if (err) {
        return console.error(err.message);
      }
      return row
        ? console.log(row.u, row.p)
        : console.log(`No user found with the username ${username}`);
    });

    //if not, create user and store in data base
    //if it exists print informing message

    //print username in the prompt

  }
  else if (arr.length == 2) {
    channel.emit('broadcast', '', 'Please also enter password. \r\n');
  }
  else {
    channel.emit('broadcast', '', 'Please enter username. \r\n');
  }
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
      //---process the string here and remove /n
      let lastChar = data.substr(data.length - 1);
      if (lastChar === '\n')
        data = data.slice(0, -1);

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
         channel.emit('signup', data);
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

//shutting down process gracefully when receiving Ctrl+C
//closing server, db connection and tcp connections
process.on('SIGINT', () => {
  console.log('Received SIGINT: shutting down process...');
  channel.emit('broadcast', '', 'Server shutting down...\r\n');
  server.close();
  chatsrv_db.close((err) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    console.log('Closed cmdline database connection.');
    for (var i in channel.clients) {
      channel.clients[i].destroy();
    }
  });
});
