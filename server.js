const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log("收到訊息:", message.toString());
        // 原封不動轉發給所有人
        wss.clients.forEach(client => {
            if (client.readyState === 1) client.send(message.toString());
        });
    });
});
