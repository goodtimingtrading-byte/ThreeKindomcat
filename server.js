const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 設定靜態檔案資料夾 (告訴伺服器去哪找你的 index.html 和 my_model)
app.use(express.static(path.join(__dirname, '.')));

// 儲存房間狀態
const rooms = {};

io.on('connection', (socket) => {
    console.log(`玩家連線: ${socket.id}`);

    // 加入房間
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [], hands: {} };
        }

        if (rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.emit('status', `已加入房間 ${roomId}，等待對手...`);
        } else {
            socket.emit('status', '房間已滿');
        }
    });

    // 接收玩家出牌
    socket.on('submitHands', ({ roomId, hands }) => {
        if (!rooms[roomId]) return;
        
        rooms[roomId].hands[socket.id] = hands;
        console.log(`玩家 ${socket.id} 在房間 ${roomId} 完成出牌`);

        // 當兩個人都出完牌
        if (Object.keys(rooms[roomId].hands).length === 2) {
            const result = calculateBattle(rooms[roomId].hands);
            io.to(roomId).emit('battleResult', result);
            
            // 重置本回合紀錄
            rooms[roomId].hands = {};
        }
    });

    socket.on('disconnect', () => {
        console.log('玩家離線');
    });
});

// 勝負判斷邏輯 (可隨時在此擴充角色技能)
function calculateBattle(handsMap) {
    // 這裡實作你的三局兩勝判斷 logic
    // 範例：回傳一個模擬結果
    return {
        message: "結算完畢",
        details: "詳細勝負數據..."
    };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運作於 port ${PORT}`);
});
