const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

const io = new Server(server);

app.use(express.static('public'));

let waitingPlayer = null;

io.on('connection', (socket) => {

  console.log('Player connected:', socket.id);

  if (waitingPlayer) {

    const room = waitingPlayer.id + '#' + socket.id;

    socket.join(room);
    waitingPlayer.join(room);

    io.to(room).emit('startGame', {
      room
    });

    waitingPlayer = null;
  }
  else {
    waitingPlayer = socket;
    socket.emit('waiting');
  }

  socket.on('move', ({ room, move }) => {

    const game = io.sockets.adapter.rooms.get(room);

    if (!game.moves)
      game.moves = {};

    game.moves[socket.id] = move;

    if (Object.keys(game.moves).length === 2) {

      const players =
        Object.keys(game.moves);

      const move1 =
        game.moves[players[0]];

      const move2 =
        game.moves[players[1]];

      let result = '';

      if (move1 === move2)
        result = 'Tie';
      else if (
        (move1 === 'rock' && move2 === 'scissors') ||
        (move1 === 'paper' && move2 === 'rock') ||
        (move1 === 'scissors' && move2 === 'paper')
      )
        result = 'Player 1 wins';
      else
        result = 'Player 2 wins';

      io.to(room).emit('result', {
        move1,
        move2,
        result
      });

      game.moves = {};
    }
  });

  socket.on('disconnect', () => {

    if (waitingPlayer === socket)
      waitingPlayer = null;

    console.log('Disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});