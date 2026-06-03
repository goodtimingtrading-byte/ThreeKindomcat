const WebSocket = require('ws');

// 確保 Render 平台能抓到正確的啟動 Port
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`⚔️ 三國貓武將伺服器已啟動於 Port: ${PORT}...`);

let players = [];
let gameState = {
    round: 1,
    p1: { id: null, char: null, hp: 100, mp: 0, moves: null, skillActive: false },
    p2: { id: null, char: null, hp: 100, mp: 0, moves: null, skillActive: false }
};

const catsData = {
    "lubu": { name: "呂布貓", len: 85, mus: 100, int: 26 },
    "kuanyu": { name: "關羽貓", len: 93, mus: 97, int: 75 },
    "changfei": { name: "張飛貓", len: 83, mus: 98, int: 33 },
    "zhangyun": { name: "趙雲貓", len: 91, mus: 96, int: 76 },
    "tsaotsao": { name: "曹操貓", len: 98, mus: 72, int: 92 },
    "lubei": { name: "劉備貓", len: 80, mus: 73, int: 78 },
    "kongmin": { name: "諸葛亮貓", len: 93, mus: 38, int: 100 },
    "choyu": { name: "周瑜貓", len: 95, mus: 71, int: 96 },
    "simayi": { name: "司馬懿貓", len: 97, mus: 63, int: 97 },
    "suntsu": { name: "孫策貓", len: 92, mus: 92, int: 70 }
};

wss.on('connection', (ws) => {
    players = players.filter(p => p.readyState === WebSocket.OPEN);
    if (players.length >= 2) {
        ws.close();
        return;
    }
    players.push(ws);
    const pRole = players.length === 1 ? 'p1' : 'p2';
    gameState[pRole].id = pRole;
    ws.send(JSON.stringify({ type: 'INIT_ROLE', role: pRole }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'SELECT_LOCK') {
                gameState[data.role].char = data.charId;
                if (gameState.p1.char && gameState.p2.char) {
                    players.forEach(p => p.send(JSON.stringify({ type: 'START_GAME', gameState })));
                }
            }
            if (data.type === 'SUBMIT_MOVES') {
                gameState[data.role].moves = data.moves;
                gameState[data.role].skillActive = data.skillActive;
                if (gameState.p1.moves && gameState.p2.moves) {
                    // 這裡執行你的結算邏輯 settleRound()
                    // (為了節省空間，請確保你完整的結算函數在這裡下方)
                }
            }
        } catch (e) {}
    });
});
