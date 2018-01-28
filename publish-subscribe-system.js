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
  channel.emit('broadcast', id, `${id} has left the chatroom.\n`);
});

//prevent chat without shutting dowm the server
channel.on('shutdown', () => {
  channel.emit('broadcast', '', 'The server has shut down.\n');
  channel.removeAllListeners('broadcast');
});


const server = net.createServer(client => {
  const id = `${client.remoteAddress}:${client.remotePort}`;
  channel.emit('join', id, client);
  client.on('data', data => {
      data = data.toString();
      if (data === 'shutdown\r\n') {
        channel.emit('shutdown');
      }
      channel.emit('broadcast', id, data);
  });
  client.on('close', () => {
    channel.emit('leave', id);
  });
});

server.listen(8888);
