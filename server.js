const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let players = [];

wss.on('connection', (ws) => {
    if (players.length < 2) {
        players.push(ws);
        console.log("玩家加入，目前人數:", players.length);
        ws.send(JSON.stringify({ type: 'status', msg: '等待對手加入...' }));
    } else {
        ws.close(); // 滿人拒絕
    }

    ws.on('message', (message) => {
        // 廣播所有訊息給雙方
        players.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        players = players.filter(p => p !== ws);
    });
});
