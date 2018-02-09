const events = require('events');
const net = require('net');

const channel = new events.EventEmitter();
channel.clients = {};
channel.subscriptions = {};

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
  if (channel.listenerCount('broadcast') !=0 ){
    for (var id in channel.subscriptions){
      channel.on('broadcast', channel.subscriptions[id]);
    }
    channel.emit('broadcast', '', 'The server has started.\r\n');
  }
});

//---authenticate as admin---//


//Admin command: create new private room //


//Admin command: create new


//Show welcome message with number of listeners
channel.on('join', function(id, client) {
  const welcome = `Welcome!\r\nGuests online: ${this.listeners('broadcast').length}
                  `;
  client.write(`${welcome}\r\n`);
});

//set max number of listeners
channel.setMaxListeners(50);

const server = net.createServer(client => {
  const id = `${client.remoteAddress}:${client.remotePort}`;
  channel.emit('join', id, client);

  client.on('data', data => {
      data = data.toString();
      if (data.startsWith('/shutdown')){
         channel.emit('shutdown');
      }
      else if (data.startsWith('/start')){
         channel.emit('start');
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
