const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('submitHands', (data) => {
        let roomId = 'room1'; // 簡化版房間邏輯
        if(!rooms[roomId]) rooms[roomId] = { players: {} };
        rooms[roomId].players[socket.id] = data;
        
        if (Object.keys(rooms[roomId].players).length === 2) {
            io.to(roomId).emit('battleResult', { message: "對戰結算完畢！" });
            rooms[roomId].players = {};
        }
    });
});
server.listen(process.env.PORT || 3000);
