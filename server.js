// server.js (後端 WebSocket 裁判邏輯)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

console.log("⚔️ 三國貓武將連線對戰伺服器已啟動，監聽 Port 3000...");

let players = []; // 儲存連線的兩個玩家 [1P, 2P]
let gameState = {
    round: 1,
    p1: { id: null, char: null, hp: 100, mp: 0, moves: null, skillActive: false },
    p2: { id: null, char: null, hp: 100, mp: 0, moves: null, skillActive: false }
};

// 10 大貓武將官方數值庫
const catsData = {
    "lubu": { name: "呂布貓", len: 85, mus: 100, int: 26, pol: 13, cha: 40 },
    "kuanyu": { name: "關羽貓", len: 93, mus: 97, int: 75, pol: 62, cha: 93 },
    "changfei": { name: "張飛貓", len: 83, mus: 98, int: 33, pol: 18, cha: 45 },
    "zhangyun": { name: "趙雲貓", len: 91, mus: 96, int: 76, pol: 65, cha: 95 },
    "tsaotsao": { name: "曹操貓", len: 98, mus: 72, int: 92, pol: 94, cha: 91 },
    "lubei": { name: "劉備貓", len: 80, mus: 73, int: 78, pol: 80, cha: 99 },
    "kongmin": { name: "諸葛亮貓", len: 93, mus: 38, int: 100, pol: 96, cha: 92 },
    "choyu": { name: "周瑜貓", len: 95, mus: 71, int: 96, pol: 86, cha: 96 },
    "simayi": { name: "司馬懿貓", len: 97, mus: 63, int: 97, pol: 93, cha: 70 },
    "suntsu": { name: "孫策貓", len: 92, mus: 92, int: 70, pol: 53, cha: 92 }
};

wss.on('connection', (ws) => {
    // 限制伺服器只能有 2 個人連線
    if (players.length >= 2) {
        ws.send(JSON.stringify({ type: 'SYSTEM', msg: '伺服器已滿' }));
        ws.close();
        return;
    }

    players.push(ws);
    const pRole = players.length === 1 ? 'p1' : 'p2';
    gameState[pRole].id = pRole;

    // 告知玩家他是 1P 還是 2P
    ws.send(JSON.stringify({ type: 'INIT_ROLE', role: pRole }));
    console.log(`玩家連入，指派為: ${pRole}`);

    // 當兩人都連進來，通知前端可以開始選角
    if (players.length === 2) {
        broadcast({ type: 'SYSTEM_READY', msg: '雙方已就位，請選擇貓武將！' });
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // 處理 1: 即時選角同步 (Hover / Lock)
        if (data.type === 'SELECT_HOVER' || data.type === 'SELECT_LOCK') {
            if (data.type === 'SELECT_LOCK') {
                gameState[data.role].char = data.charId;
            }
            broadcast(data); // 廣播給對方看見移動與選定

            // 雙方都鎖定武將後，正式開啟戰鬥回合
            if (gameState.p1.char && gameState.p2.char) {
                broadcast({ type: 'START_GAME', gameState });
            }
        }

        // 處理 2: 玩家提交 3 枚棋子
        if (data.type === 'SUBMIT_MOVES') {
            gameState[data.role].moves = data.moves; // 格式如 ['stone', 'scissors', 'paper']
            gameState[data.role].skillActive = data.skillActive; // 是否啟動大招

            // 檢查雙方是否都出牌了（盲選完成）
            if (gameState.p1.moves && gameState.p2.moves) {
                settleRound();
            } else {
                // 只有一方出牌，通知另一方「對手已鎖定」
                const opponent = data.role === 'p1' ? players[1] : players[0];
                if (opponent) opponent.send(JSON.stringify({ type: 'OPPONENT_LOCKED' }));
            }
        }
    });

    ws.on('close', () => {
        players = players.filter(p => p !== ws);
        resetGame();
        console.log("玩家斷線，遊戲重設。");
    });
});

// 廣播給全場 2 人的小工具
function broadcast(data) {
    players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify(data));
        }
    });
}

// 核心戰鬥演算法：計算剪刀石頭布與五圍加權
function settleRound() {
    const c1 = catsData[gameState.p1.char];
    const c2 = catsData[gameState.p2.char];
    
    let p1Wins = 0, p2Wins = 0;
    const clashResults = [];

    // 1. 三棋依序交鋒比試
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

    // 2. 判定這回合誰贏
    let roundWinner = '平手';
    if (p1Wins > p2Wins) roundWinner = 'p1';
    if (p2Wins > p1Wins) roundWinner = 'p2';

    // 3. 傷害與減傷公式動態結算
    let dmgToP1 = 0;
    let dmgToP2 = 0;

    if (roundWinner === 'p1') {
        // 1P 贏，2P 扣血
        let baseDmg = 10;
        let musBonus = c1.mus > c2.mus ? Math.floor((c1.mus - c2.mus) / 5) : 0; // 武力每高5多扣1%
        let lenDefense = c2.len > c1.len ? (c2.len - c1.len) : 0; // 統帥高1點少扣1%
        
        dmgToP2 = Math.max(1, baseDmg + musBonus - lenDefense); // 保底扣1%
        gameState.p2.hp = Math.max(0, gameState.p2.hp - dmgToP2);
    } else if (roundWinner === 'p2') {
        // 2P 贏，1P 扣血
        let baseDmg = 10;
        let musBonus = c2.mus > c1.mus ? Math.floor((c2.mus - c1.mus) / 5) : 0;
        let lenDefense = c1.len > c2.len ? (c1.len - c2.len) : 0;
        
        dmgToP1 = Math.max(1, baseDmg + musBonus - lenDefense);
        gameState.p1.hp = Math.max(0, gameState.p1.hp - dmgToP1);
    }

    // 4. 能量值與智力加成計算
    let p1MpGain = 15 + (c1.int > c2.int ? (c1.int - c2.int) * 5 : 0);
    let p2MpGain = 15 + (c2.int > c1.int ? (c2.int - c1.int) * 5 : 0);

    gameState.p1.mp = Math.min(100, gameState.p1.mp + p1MpGain);
    gameState.p2.mp = Math.min(100, gameState.p2.mp + p2MpGain);

    // 5. 特殊技能簡單判定 (此處先實作劉備回血與通用加成，為擴充預留空間)
    if (gameState.p1.skillActive && gameState.p1.char === 'lubei') { gameState.p1.hp = Math.min(100, gameState.p1.hp + 20); gameState.p1.mp = 0; }
    if (gameState.p2.skillActive && gameState.p2.char === 'lubei') { gameState.p2.hp = Math.min(100, gameState.p2.hp + 20); gameState.p2.mp = 0; }

    // 傳送這回合的詳細戰報給雙方
    broadcast({
        type: 'ROUND_RESULT',
        winner: roundWinner,
        clashResults: clashResults,
        p1Moves: gameState.p1.moves, // 盲選結束，向雙方公開底牌
        p2Moves: gameState.p2.moves,
        dmgToP1,
        dmgToP2,
        gameState: gameState
    });

    // 清空出牌狀態，回合數推進
    gameState.p1.moves = null;
    gameState.p2.moves = null;
    gameState.p1.skillActive = false;
    gameState.p2.skillActive = false;
    gameState.round++;

    // 判定有沒有人血條空了，或是打滿10回合
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
