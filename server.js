const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let players = [];
console.log(`⚔️ 伺服器已啟動於 Port: ${PORT}`);

wss.on('connection', (ws) => {
    if (players.length < 2) {
        players.push(ws);
        console.log("玩家加入，目前人數:", players.length);
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // 當收到鎖定指令，廣播給所有人準備進入戰鬥
        if (data.type === 'lock') {
            console.log("收到鎖定訊號，廣播 START_GAME");
            players.forEach(p => p.send(JSON.stringify({ type: 'START_GAME' })));
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p !== ws);
    });
});
