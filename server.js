const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, '/')));

let rooms = { 'room1': { hands: {}, hp: { 'p1': 100, 'p2': 100 } } };

io.on('connection', (socket) => {
    socket.on('joinRoom', (room) => socket.join(room));
    socket.on('submitHands', ({ roomId, hands }) => {
        rooms[roomId].hands[socket.id] = hands[0];
        if (Object.keys(rooms[roomId].hands).length === 2) {
            const ids = Object.keys(rooms[roomId].hands);
            const result = { winner: 'Draw', newHp: rooms[roomId].hp };
            io.to(roomId).emit('battleResult', result);
            rooms[roomId].hands = {};
        }
    });
});

server.listen(process.env.PORT || 3000);
