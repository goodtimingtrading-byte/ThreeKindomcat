const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let players = [];
wss.on('connection', (ws) => {
    if (players.length < 2) {
        players.push(ws);
        console.log("玩家連線，人數:", players.length);
    }
    ws.on('close', () => { players = players.filter(p => p !== ws); });
});
