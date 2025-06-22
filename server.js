const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { nanoid } = require('nanoid'); // for generating room codes

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {}; // { roomCode: { name: string, history: [], users: Set<socket.id> } }

io.on('connection', socket => {
  // create a room
  socket.on('create room', ({ roomName }) => {
    const code = nanoid(6); // short unique code
    rooms[code] = {
      name: roomName || code,
      history: [],
      users: new Set()
    };
    socket.emit('room created', { code, roomName: rooms[code].name });
  });

  // join an existing room
  socket.on('join room', ({ code, username }, cb) => {
    const room = rooms[code];
    if (!room) return cb({ error: 'Room not found' });

    // store user info on socket
    socket.username = username;
    socket.roomCode = code;

    // add to room's user set
    room.users.add(socket.id);

    // subscribe socket.io room
    socket.join(code);

    // send existing history to newcomer
    socket.emit('history', room.history);

    // notify others someone joined
    socket.to(code).emit('user joined', { username });

    cb({ success: true, roomName: room.name });
  });

  // broadcast chat messages within room
  socket.on('chat message', (text) => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;

    const msg = {
      from: socket.username,
      text,
      time: new Date().toISOString()
    };

    // store & cap history
    const room = rooms[code];
    room.history.push(msg);
    if (room.history.length > 200) room.history.shift();

    io.to(code).emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      rooms[code].users.delete(socket.id);
      socket.to(code).emit('user left', { username: socket.username });
      // if room empty, clean up
      if (rooms[code].users.size === 0) {
        delete rooms[code];
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
