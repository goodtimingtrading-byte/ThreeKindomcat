const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 託管根目錄下的所有靜態檔案
app.use(express.static(path.join(__dirname, '/')));

// 遊戲狀態儲存
let rooms = {
    'room1': { hands: {}, hp: { 'p1': 100, 'p2': 100 } }
};

io.on('connection', (socket) => {
    console.log(`玩家已連線: ${socket.id}`);

    // 接收出牌資料
    socket.on('submitHands', ({ roomId, hands }) => {
        if (!rooms[roomId]) return;
        
        // 將玩家的出牌儲存到後端，不直接廣播給對方
        rooms[roomId].hands[socket.id] = hands;

        // 當兩人都出完牌，進行結算
        if (Object.keys(rooms[roomId].hands).length === 2) {
            const result = calculateBattle(rooms[roomId].hands, rooms[roomId].hp);
            io.to(roomId).emit('battleResult', result);
            
            // 清空出牌紀錄，準備下一回合
            rooms[roomId].hands = {};
            rooms[roomId].hp = result.newHp;
        }
    });

    socket.on('disconnect', () => {
        console.log(`玩家離線: ${socket.id}`);
    });
});

// 後端戰鬥引擎：保證計算公平，防止前端作弊
function calculateBattle(handsMap, hpMap) {
    const ids = Object.keys(handsMap);
    const p1Move = handsMap[ids[0]][0];
    const p2Move = handsMap[ids[1]][0];
    
    let winner = 'Draw';
    let p1Hp = hpMap['p1'];
    let p2Hp = hpMap['p2'];

    // 剪刀石頭布勝負邏輯
    if ((p1Move === 'Rock' && p2Move === 'Scissor') || 
        (p1Move === 'Scissor' && p2Move === 'Paper') || 
        (p1Move === 'Paper' && p2Move === 'Rock')) {
        winner = ids[0];
        p2Hp -= 10; // 輸家扣血
    } else if (p1Move !== p2Move) {
        winner = ids[1];
        p1Hp -= 10;
    }

    return { 
        winner, 
        newHp: { 'p1': p1Hp, 'p2': p2Hp },
        p1Move, 
        p2Move 
    };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行於 Port: ${PORT}`);
});
