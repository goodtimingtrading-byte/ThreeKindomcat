// server.js (優化配對與防斷線版本)
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
    // 清理已經斷開但殘留的無效連線，確保騰出空位給 2P 連入
    players = players.filter(p => p.readyState === WebSocket.OPEN);

    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: 'SYSTEM', msg: '伺服器房間已滿，請稍後再試' }));
        ws.close();
        return;
    }

    players.push(ws);
    const pRole = players.length === 1 ? 'p1' : 'p2';
    gameState[pRole].id = pRole;

    ws.send(JSON.stringify({ type: 'INIT_ROLE', role: pRole }));
    console.log(`[連線成功] 玩家加入並指派為: ${pRole} (當前連線數: ${players.length})`);

    // 只要有兩個人在線，不管是不是剛重新整理，立刻通知雙方可以開始選角
    if (players.length === 2) {
        broadcast({ type: 'SYSTEM_READY', msg: '雙方玩家已連線，大戰即將開始！' });
    } else {
        ws.send(JSON.stringify({ type: 'SYSTEM', msg: '正在等待對手加入...' }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // 心跳包回應，防止 Render 免費伺服器自動斷線
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
            console.error("解析訊息失敗", e);
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p !== ws);
        console.log(`[玩家斷線] 剩餘玩家數: ${players.length}`);
        if (players.length === 0) {
            resetGame();
        } else {
            // 如果其中一方斷開，通知剩下的人重新等待
            broadcast({ type: 'SYSTEM', msg: '對手離開了戰局，等待新玩家...' });
            resetGame();
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

    if (roundWinner === 'p1') {
        let baseDmg = 10;
        let musBonus = c1.mus > c2.mus ? Math.floor((c1.mus - c2.mus) / 5) : 0;
        let lenDefense = c2.len > c1.len ? (c2.len - c1.len) : 0;
        dmgToP2 = Math.max(1, baseDmg + musBonus - lenDefense);
        gameState.p2.hp = Math.max(0, gameState.p2.hp - dmgToP2);
    } else if (roundWinner === 'p2') {
        let baseDmg = 10;
        let musBonus = c2.mus > c1.mus ? Math.floor((c2.mus - c1.mus) / 5) : 0;
        let lenDefense = c1.len > c2.len ? (c1.len - c2.len) : 0;
        dmgToP1 = Math.max(1, baseDmg + musBonus - lenDefense);
        gameState.p1.hp = Math.max(0, gameState.p1.hp - dmgToP1);
    }

    let p1MpGain = 15 + (c1.int > c2.int ? (c1.int - c2.int) * 5 : 0);
    let p2MpGain = 15 + (c2.int > c1.int ? (c2.int - c1.int) * 5 : 0);

    gameState.p1.mp = Math.min(100, gameState.p1.mp + p1MpGain);
    gameState.p2.mp = Math.min(100, gameState.p2.mp + p2MpGain);

    if (gameState.p1.skillActive && gameState.p1.char === 'lubei') { gameState.p1.hp = Math.min(100, gameState.p1.hp + 20); gameState.p1.mp = 0; }
    if (gameState.p2.skillActive && gameState.p2.char === 'lubei') { gameState.p2.hp = Math.min(100, gameState.p2.hp + 20); gameState.p2.mp = 0; }

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
