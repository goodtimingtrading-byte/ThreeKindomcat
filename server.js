// server.js (防幽靈連線、穩定雙人配對完全體)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

console.log("⚔️ 三國貓武將連線對戰伺服器已啟動...");

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
    // 1. 強力清理不屬於 OPEN 狀態的幽靈連線
    players = players.filter(p => p.readyState === WebSocket.OPEN);

    // 2. 如果真的滿 2 人了，拒絕後續多餘連線
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: 'SYSTEM', msg: '房間已滿（2人正在對戰中），請稍後...' }));
        ws.close();
        return;
    }

    players.push(ws);
    
    // 3. 根據當前陣列長度動態指派 1P 或 2P
    const pRole = players.length === 1 ? 'p1' : 'p2';
    gameState[pRole].id = pRole;

    ws.send(JSON.stringify({ type: 'INIT_ROLE', role: pRole }));
    console.log(`[玩家登入] 指派角色: ${pRole} | 目前房間人數: ${players.length}/2`);

    // 4. 當兩人都連進來時，才發送 READY 通知，否則維持等待
    if (players.length === 2) {
        broadcast({ type: 'SYSTEM_READY', msg: '雙方玩家已就位，大戰正式開始！' });
    } else {
        ws.send(JSON.stringify({ type: 'SYSTEM', msg: '正在等待 2P 玩家加入戰局...' }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG' }));
                return;
            }

            if (data.type === 'SELECT_HOVER' || data.type === 'SELECT_LOCK') {
                if (data.type === 'SELECT_LOCK') {
                    gameState[data.role].char = data.charId;
                }
                broadcast(data);

                if (gameState.p1.char && gameState.p2.char) {
                    broadcast({ type: 'START_GAME', gameState });
                }
            }

            if (data.type === 'SUBMIT_MOVES') {
                gameState[data.role].moves = data.moves;
                gameState[data.role].skillActive = data.skillActive;

                if (gameState.p1.moves && gameState.p2.moves) {
                    settleRound();
                } else {
                    const opponent = data.role === 'p1' ? players[1] : players[0];
                    if (opponent && opponent.readyState === WebSocket.OPEN) {
                        opponent.send(JSON.stringify({ type: 'OPPONENT_LOCKED' }));
                    }
                }
            }
        } catch (e) {
            console.error("處理訊息異常:", e);
        }
    });

    ws.on('close', () => {
        // 玩家斷線時，將其移出名單
        players = players.filter(p => p !== ws);
        console.log(`[玩家斷線] 房間剩餘人數: ${players.length}/2`);
        
        if (players.length === 0) {
            resetGame();
        } else {
            // 如果還留著一個人，將留著的人強制降格回 1P，並重設戰局等待對手
            resetGame();
            const remainingPlayer = players[0];
            if (remainingPlayer && remainingPlayer.readyState === WebSocket.OPEN) {
                remainingPlayer.send(JSON.stringify({ type: 'INIT_ROLE', role: 'p1' }));
                remainingPlayer.send(JSON.stringify({ type: 'SYSTEM', msg: '對手已離開，正在重新等待 2P 加入...' }));
            }
        }
    });
});

function broadcast(data) {
    players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify(data));
        }
    });
}

function settleRound() {
    const c1 = catsData[gameState.p1.char];
    const c2 = catsData[gameState.p2.char];
    
    let p1Wins = 0, p2Wins = 0;
    const clashResults = [];

    for (let i = 0; i < 3; i++) {
        const m1 = gameState.p1.moves[i];
        const m2 = gameState.p2.moves[i];
        if (m1 === m2) {
            clashResults.push('和');
        } else if ((m1==='stone' && m2==='scissors') || (m1==='scissors' && m2==='paper') || (m1==='paper' && m2==='stone')) {
            p1Wins++;
            clashResults.push('1P勝');
        } else {
            p2Wins++;
            clashResults.push('2P勝');
        }
    }

    let roundWinner = '平手';
    if (p1Wins > p2Wins) roundWinner = 'p1';
    if (p2Wins > p1Wins) roundWinner = 'p2';

    let dmgToP1 = 0;
    let dmgToP2 = 0;

    let p1Skill = gameState.p1.skillActive ? gameState.p1.char : null;
    let p2Skill = gameState.p2.skillActive ? gameState.p2.char : null;
    if (p1Skill) gameState.p1.mp = 0;
    if (p2Skill) gameState.p2.mp = 0;

    if (p1Skill === 'lubei') { gameState.p1.hp = Math.min(100, gameState.p1.hp + 20); }
    if (p2Skill === 'lubei') { gameState.p2.hp = Math.min(100, gameState.p2.hp + 20); }

    if (roundWinner === 'p1') {
        let baseDmg = 10;
        let musBonus = c1.mus > c2.mus ? Math.floor((c1.mus - c2.mus) / 5) : 0;
        let lenDefense = c2.len > c1.len ? (c2.len - c1.len) : 0;

        if (p1Skill === 'kuanyu') { lenDefense = 0; }

        dmgToP2 = baseDmg + musBonus - lenDefense;

        if (p1Skill === 'changfei') { dmgToP2 = baseDmg + (musBonus * 2) - lenDefense; }
        if (p1Skill === 'suntsu') { dmgToP2 = dmgToP2 * 2; }

        dmgToP2 = Math.max(1, dmgToP2);

        if (p2Skill === 'zhangyun') { dmgToP2 = 1; }
        if (p2Skill === 'tsaotsao') { dmgToP2 = 0; roundWinner = '平手(奸雄化解)'; }

        gameState.p2.hp = Math.max(0, gameState.p2.hp - dmgToP2);

        if (p1Skill === 'simayi') { gameState.p1.hp = Math.min(100, gameState.p1.hp + Math.floor(dmgToP2 * 0.5)); }

    } else if (roundWinner === 'p2') {
        let baseDmg = 10;
        let musBonus = c2.mus > c1.mus ? Math.floor((c2.mus - c1.mus) / 5) : 0;
        let lenDefense = c1.len > c2.len ? (c1.len - c2.len) : 0;

        if (p2Skill === 'kuanyu') { lenDefense = 0; }

        dmgToP1 = baseDmg + musBonus - lenDefense;

        if (p2Skill === 'changfei') { dmgToP1 = baseDmg + (musBonus * 2) - lenDefense; }
        if (p2Skill === 'suntsu') { dmgToP1 = dmgToP1 * 2; }

        dmgToP1 = Math.max(1, dmgToP1);

        if (p1Skill === 'zhangyun') { dmgToP1 = 1; }
        if (p1Skill === 'tsaotsao') { dmgToP1 = 0; roundWinner = '平手(奸雄化解)'; }

        gameState.p1.hp = Math.max(0, gameState.p1.hp - dmgToP1);

        if (p2Skill === 'simayi') { gameState.p2.hp = Math.min(100, gameState.p2.hp + Math.floor(dmgToP1 * 0.5)); }
    }

    if (p1Skill === 'choyu') { gameState.p2.hp = Math.max(0, gameState.p2.hp - 10); dmgToP2 += 10; }
    if (p2Skill === 'choyu') { gameState.p1.hp = Math.max(0, gameState.p1.hp - 10); dmgToP1 += 10; }

    let p1MpGain = 15 + (c1.int > c2.int ? (c1.int - c2.int) * 5 : 0);
    let p2MpGain = 15 + (c2.int > c1.int ? (c2.int - c1.int) * 5 : 0);

    if (p1Skill === 'kongmin') { p1MpGain = p1MpGain * 2; }
    if (p2Skill === 'kongmin') { p2MpGain = p2MpGain * 2; }

    gameState.p1.mp = Math.min(100, gameState.p1.mp + p1MpGain);
    gameState.p2.mp = Math.min(100, gameState.p2.mp + p2MpGain);

    broadcast({
        type: 'ROUND_RESULT',
        winner: roundWinner,
        clashResults: clashResults,
        p1Moves: gameState.p1.moves,
        p2Moves: gameState.p2.moves,
        dmgToP1,
        dmgToP2,
        gameState: gameState
    });

    gameState.p1.moves = null;
    gameState.p2.moves = null;
    gameState.p1.skillActive = false;
    gameState.p2.skillActive = false;
    gameState.round++;

    if (gameState.p1.hp <= 0 || gameState.p2.hp <= 0 || gameState.round > 10) {
        let finalWinner = "平手！";
        if (gameState.p1.hp > gameState.p2.hp) finalWinner = `${catsData[gameState.p1.char].name}獲勝！`;
        if (gameState.p2.hp > gameState.p1.hp) finalWinner = `${catsData[gameState.p2.char].name}獲勝！`;
        broadcast({ type: 'GAME_OVER', winnerText: finalWinner });
        resetGame();
    }
}

function resetGame() {
    gameState = {
        round: 1,
        p1: { id: null, char: null, hp: 100, mp: 0, moves: null, skillActive: false },
        p2: { id: null, char: null, hp: 100, mp: 0, moves: null, skillActive: false }
    };
}
