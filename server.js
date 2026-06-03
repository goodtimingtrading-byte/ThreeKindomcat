const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`⚔️ 伺服器已啟動於 Port: ${PORT}`);

let players = [];

wss.on('connection', (ws) => {
    if (players.length < 2) {
        players.push(ws);
        console.log("玩家加入，人數:", players.length);
    }

    ws.on('message', (message) => {
        // 廣播給所有連線者
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        players = players.filter(p => p !== ws);
    });
});
