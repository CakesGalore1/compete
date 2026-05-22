const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {

  console.log('Connected:', socket.id);

  socket.on('createRoom', () => {

    const roomCode =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    rooms[roomCode] = {
      players: [socket.id],
      moves: {}
    };

    socket.join(roomCode);

    socket.emit('roomCreated', roomCode);

    console.log('Room created:', roomCode);
  });

  socket.on('joinRoom', (roomCode) => {

    roomCode = roomCode.toUpperCase();

    const room = rooms[roomCode];

    if (!room) {
      socket.emit('errorMessage',
        'Room does not exist');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('errorMessage',
        'Room is full');
      return;
    }

    room.players.push(socket.id);

    socket.join(roomCode);

    io.to(roomCode).emit('startGame', roomCode);

    console.log(socket.id,
      'joined',
      roomCode);
  });

  socket.on('move', ({ roomCode, move }) => {

    const room = rooms[roomCode];

    if (!room)
      return;

    room.moves[socket.id] = move;

    if (Object.keys(room.moves).length === 2) {

      const players =
        room.players;

      const move1 =
        room.moves[players[0]];

      const move2 =
        room.moves[players[1]];

      let result = '';

      if (move1 === move2)
        result = 'Tie';
      else if (
        (move1 === 'rock' &&
          move2 === 'scissors') ||
        (move1 === 'paper' &&
          move2 === 'rock') ||
        (move1 === 'scissors' &&
          move2 === 'paper')
      )
        result = 'Player 1 wins';
      else
        result = 'Player 2 wins';

      io.to(roomCode).emit('result', {
        move1,
        move2,
        result
      });

      room.moves = {};
    }
  });

  socket.on('disconnect', () => {

    for (const roomCode in rooms) {

      const room = rooms[roomCode];

      room.players =
        room.players.filter(
          id => id !== socket.id
        );

      delete room.moves[socket.id];

      if (room.players.length === 0) {
        delete rooms[roomCode];
      }
    }

    console.log('Disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on 3000');
});