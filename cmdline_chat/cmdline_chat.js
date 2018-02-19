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
const roomUsersNumber = 10;
channel.clients = {};              // {key:value}--> {id:client}
channel.subscriptions = {};        // {key:value}--> {id:subscription function}
channel.usernames = {};            // {key:value}--> {id:username}

const commands = {"/start":"startup chat room (by room creator)",
                  "/shutdown":"shutdown chat room (by room creator)",
                  "/signup username password":"create user account with username and password",
                  "/login username password":"login as user",
                  "/logout":"logout from your account",
                  "/create room name password":"create chat room",
                  "/delete room name password":"delete chat room",
                  "/enter room name password":"enter a chat room" };

//---------------joining procedure--------------------------------------------//
channel.on('join', (id, client) => {
  channel.clients[id] = client;
  channel.subscriptions[id] = (senderId, message) => {
      if (id != senderId) {
        let messageSent = '\r\n' +`${channel.usernames[senderId]}:` + message + '\r\n' + `${channel.usernames[id]}>>`;
        channel.clients[id].write(messageSent);
      }
  };
  //find "guest" username that is not used
  let initialUsername = "Guest";
  let usernameExists = true;
  let i=1;

  while ((i<roomUsersNumber+1) && (usernameExists)) {
    initialUsername = "Guest";
    initialUsername = initialUsername + i.toString(); //checking Guest1, Guest2,...
    usernameExists = false;
    for (var id_indx in  channel.usernames){
        if (initialUsername === channel.usernames[id_indx] ){
          usernameExists = true;
          break;
        }
    }
    i++;
  }
  channel.usernames[id] = initialUsername;
  channel.on('broadcast', channel.subscriptions[id]);
  channel.on('messageToUser', (senderId, message) =>{
    if (id == senderId) {
      let messageSent = '\r\n' + message +'\r\n'+ `${channel.usernames[id]}>>`;
      if (message ==='userPrompt'){
         messageSent = `${channel.usernames[id]}>>`;
      }
      channel.clients[id].write(messageSent);
    }
  });

  //Notify user and the other participants for the joining
  const welcome =`Welcome ${initialUsername}!\r\nGuests online: ${channel.listeners('broadcast').length}\r\nTo print list of commands type: /?\r\n\r\n`;
  channel.emit ('messageToUser', id, welcome);
  channel.emit('broadcast', id, `${initialUsername} entered the room.\r\n`);

});

//adds a listener for the leave event that removes broadcast listener for
//a specific client
channel.on('leave', (id) => {
  channel.removeListener('broadcast', channel.subscriptions[id]);
  channel.emit('broadcast', id, `${id} has left the chatroom.\r\n`);
});

//----shutdown command--------------------------------------------------------//
//prevent chat without shutting dowm the server
channel.on('shutdown', () => {
  channel.emit('broadcast', '', 'This room has shut down.\r\n');
  channel.removeAllListeners('broadcast');
});

//----startup command---------------------------------------------------------//
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

//----show list of commands---------------------------------------------------//
channel.on('showCommands', () => {
  let commandListString ='';
  for (var cmd in commands){
    commandListString += cmd + ' --> ' + commands[cmd] + "\r\n";
  }
  channel.emit('broadcast', '', commandListString+"\r\n\r\n");
});

//----signup procedure--------------------------------------------------------//
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

    const sqlUserInsert = `INSERT INTO users(username, password, admin)
                           VALUES(?, ?, ?)`;

    const userQueryPromise = new Promise ( (resolve, reject) => {
        chatsrv_db.get(sqlUserQuery, [username], (err, row) => {
          if (err) reject(err.message);
          resolve(row);
        });
    });

    userQueryPromise.then(
                      (row) =>{
                        if (row ===  undefined){
                          //store in data base username and password
                          chatsrv_db.run(sqlUserInsert, [username, password, 0], (err) => {
                            if (err) return console.log(err.message);
                            console.log(`User ${username} created.`);
                          });
                        }
                        else {
                          console.log(`User already exists with the username ${username}`);
                        }
                    })
                    .catch(
                      (reason) => {
                        console.error(reason);
                    });
  }
  else if (arr.length == 2) {
    channel.emit('broadcast', '', 'Please also enter password. \r\n');
  }
  else {
    channel.emit('broadcast', '', 'Please enter username. \r\n');
  }
});

//----login procedure---------------------------------------------------------//
channel.on('login', (commandData) => {
  //process commandData commandData string
  const arr = commandData.split(" ");
  if (arr.length >2){
    const username = arr[1];
    const password = arr[2];
    //check if username exists
    const sqlUserQuery = `SELECT username u, password p
                          FROM users
                          WHERE username  = ?`;

    const userQueryPromise = new Promise ( (resolve, reject) => {
        chatsrv_db.get(sqlUserQuery, [username], (err, row) => {
          if (err) reject(err.message);
          resolve(row);
        });
    });

    userQueryPromise.then(
                      (row) =>{
                        if (row ===  undefined) {

                          channel.emit('broadcast', '', 'Welcome ${username}. \r\n');
                        }
                        else {
                          console.log(`${username} does not exist.`);
                        }
                    })
                    .catch(
                      (reason) => {
                        console.error(reason);
                    });
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


//set max number of listeners
channel.setMaxListeners(50);

const server = net.createServer( (client) => {
  const id = `${client.remoteAddress}:${client.remotePort}`;
  console.log(`Client with id ${id} connected.`);
  channel.emit('join', id, client);

  client.on('data', data => {
      data = data.toString();
      //---process the string here and remove /n
      //WINDOWS CASE CR LF
      let lastChars = data.substr(data.length - 2);
      if (lastChars === '\r\n')
          data = data.slice(0, -2);

      //UNIX case LF
      let lastChar = data.substr(data.length - 1);
      if (lastChar === '\n')
          data = data.slice(0, -1);

      if ( data.length === 0 )
        return;

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
        channel.emit ('messageToUser', id, 'userPrompt');
      }
  });

  client.on('close', () => {
    channel.emit('leave', id);
  });
});
//'192.168.1.5'
server.listen(8888, '192.168.1.5');

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
    }
    console.log('Closed cmdline database connection.');
    for (var i in channel.clients) {
      channel.clients[i].destroy();
    }
  });
});
