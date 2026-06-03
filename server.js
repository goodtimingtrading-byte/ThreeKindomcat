const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '/')));

let rooms = { 'lobby': { players: {} } };

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        rooms[roomId].players[socket.id] = { id: socket.id };
        io.to(roomId).emit('updateRoom', { players: Object.keys(rooms[roomId].players) });
    });

    socket.on('submitHands', ({ roomId, hands }) => {
        if (!rooms[roomId]) rooms[roomId] = { hands: {}, hp: { p1: 100, p2: 100 } };
        rooms[roomId].hands[socket.id] = hands[0];
        if (Object.keys(rooms[roomId].hands).length === 2) {
            // 簡易勝負邏輯處理
            io.to(roomId).emit('battleResult', { status: '回合結束' });
            rooms[roomId].hands = {};
        }
    });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running...'));
