const WebSocket = require('ws');

// 1. 確保使用 Render 提供的 Port，避免部署失敗
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

console.log(`⚔️ 三國貓武將伺服器已啟動於 Port: ${PORT}`);

let players = []; 

// 2. 遊戲狀態管理
let gameState = {
    round: 1,
    p1: { id: null, char: null, moves: null },
    p2: { id: null, char: null, moves: null }
};

wss.on('connection', (ws) => {
    // 3. 過濾掉斷線的玩家，只保留活躍連線
    players = players.filter(p => p.readyState === WebSocket.OPEN);

    if (players.length >= 2) {
        ws.close();
        return;
    }

    players.push(ws);
    const pRole = players.length === 1 ? 'p1' : 'p2';
    
    // 通知前端其身分
    ws.send(JSON.stringify({ type: 'INIT_ROLE', role: pRole }));
    console.log(`[系統] 玩家加入，角色: ${pRole}，當前人數: ${players.length}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // 選角鎖定邏輯
            if (data.type === 'SELECT_LOCK') {
                gameState[data.role].char = data.charId;
                console.log(`[系統] ${data.role} 鎖定角色: ${data.charId}`);
                
                // 檢查是否雙方皆已選定
                if (gameState.p1.char && gameState.p2.char) {
                    players.forEach(p => p.send(JSON.stringify({ type: 'START_GAME', gameState })));
                }
            }
        } catch (e) {
            console.error("解析訊息錯誤:", e);
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p !== ws);
        console.log(`[系統] 玩家斷線，剩餘人數: ${players.length}`);
        // 若有人斷線，重置遊戲狀態
        gameState = {
            round: 1,
            p1: { id: null, char: null, moves: null },
            p2: { id: null, char: null, moves: null }
        };
    });
});
