const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 房間狀態紀錄
const rooms = {}; 

io.on('connection', (socket) => {
    console.log(`玩家連線: ${socket.id}`);

    // 玩家加入房間
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = { players: [], hands: {}, turnCount: 0 };
        
        if (rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.emit('status', '等待對手...');
        }
        
        if (rooms[roomId].players.length === 2) {
            io.to(roomId).emit('gameStart', { message: '對戰開始！請出牌' });
        }
    });

    // 接收出牌 (三個棋子的陣列)
    socket.on('submitHands', ({ roomId, hands }) => {
        rooms[roomId].hands[socket.id] = hands;

        // 如果雙方都出好了，進行結算
        if (Object.keys(rooms[roomId].hands).length === 2) {
            const results = calculateBattle(rooms[roomId]);
            io.to(roomId).emit('battleResult', results);
            
            // 重置本回合紀錄，準備下一回合
            rooms[roomId].hands = {};
        }
    });
});

// 勝負結算核心函數 (引入您的規則)
function calculateBattle(roomState) {
    // 這裡放入您的勝負判斷邏輯：剪刀石頭布比對、武力/智力加成計算
    // 記得加入您設計的技能效果 (曹操、諸葛亮等)
    return { winner: '...', damage: '...' };
}

server.listen(3000, () => console.log('伺服器啟動於 port 3000'));
