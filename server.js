const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

// 儲存房間與玩家資訊
let rooms = {}; 

io.on('connection', (socket) => {
    console.log(`玩家連線: ${socket.id}`);

    // 加入房間
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {}, hands: {}, hp: { [socket.id]: 100 } };
        } else {
            rooms[roomId].hp[socket.id] = 100;
        }
        
        const players = Object.keys(rooms[roomId].hp);
        io.to(roomId).emit('updateRoom', { players });
    });

    // 接收出牌
    socket.on('submitHands', ({ roomId, hands }) => {
        if (!rooms[roomId]) return;
        rooms[roomId].hands[socket.id] = hands;

        if (Object.keys(rooms[roomId].hands).length === 2) {
            const result = calculateBattle(rooms[roomId].hands, rooms[roomId].hp);
            io.to(roomId).emit('battleResult', result);
            rooms[roomId].hands = {}; // 重置
            rooms[roomId].hp = result.newHp; // 更新血量
        }
    });

    socket.on('disconnect', () => {
        console.log(`玩家離線: ${socket.id}`);
        // 實際開發可加入房間清理邏輯
    });
});

// 戰鬥邏輯引擎
function calculateBattle(handsMap, hpMap) {
    const ids = Object.keys(handsMap);
    const p1 = handsMap[ids[0]], p2 = handsMap[ids[1]];
    let p1Wins = 0, p2Wins = 0;

    for (let i = 0; i < 3; i++) {
        if (p1[i] === p2[i]) continue;
        if ((p1[i] === 'Rock' && p2[i] === 'Scissor') || 
            (p1[i] === 'Scissor' && p2[i] === 'Paper') || 
            (p1[i] === 'Paper' && p2[i] === 'Rock')) {
            p1Wins++;
        } else {
            p2Wins++;
        }
    }

    // 傷害計算：輸的一方扣 10%
    if (p1Wins > p2Wins) hpMap[ids[1]] -= 10;
    else if (p2Wins > p1Wins) hpMap[ids[0]] -= 10;

    return { 
        winner: p1Wins > p2Wins ? ids[0] : (p2Wins > p1Wins ? ids[1] : 'Draw'),
        newHp: hpMap,
        p1Wins, p2Wins
    };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`伺服器運行中: Port ${PORT}`));
