const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 設定靜態檔案，確保 index.html 能正確讀取
app.use(express.static(path.join(__dirname, '/')));

let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = { players: {}, hands: {}, hp: {} };
        rooms[roomId].hp[socket.id] = 100;
    });

    socket.on('submitHands', ({ roomId, hands }) => {
        if (!rooms[roomId]) return;
        rooms[roomId].hands[socket.id] = hands;

        if (Object.keys(rooms[roomId].hands).length === 2) {
            const result = calculateBattle(rooms[roomId].hands, rooms[roomId].hp);
            io.to(roomId).emit('battleResult', result);
            rooms[roomId].hands = {};
            rooms[roomId].hp = result.newHp;
        }
    });
});

function calculateBattle(handsMap, hpMap) {
    const ids = Object.keys(handsMap);
    const p1 = handsMap[ids[0]], p2 = handsMap[ids[1]];
    let p1Wins = 0, p2Wins = 0;

    for (let i = 0; i < 3; i++) {
        if (p1[i] === p2[i]) continue;
        if ((p1[i] === 'Rock' && p2[i] === 'Scissor') || 
            (p1[i] === 'Scissor' && p2[i] === 'Paper') || 
            (p1[i] === 'Paper' && p2[i] === 'Rock')) p1Wins++;
        else p2Wins++;
    }

    if (p1Wins > p2Wins) hpMap[ids[1]] -= 10;
    else if (p2Wins > p1Wins) hpMap[ids[0]] -= 10;

    return { winner: p1Wins > p2Wins ? ids[0] : (p2Wins > p1Wins ? ids[1] : 'Draw'), newHp: hpMap, p1Wins, p2Wins };
}

server.listen(process.env.PORT || 3000, () => console.log('Server running...'));
