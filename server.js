const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

console.log("伺服器已啟動");

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        // 廣播給所有連線者
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
            }
        });
    });
});
