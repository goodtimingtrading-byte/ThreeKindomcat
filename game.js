// --- 核心變數 ---
const URL = "./my_model/";
let model, webcam, labelContainer, maxPredictions;
let socket = io(); // 建立 Socket.io 連線
let myUsername = "";
let myCharacter = "";

// --- 場景切換與初始化 ---
async function enterLobby() {
    myUsername = document.getElementById('username').value || "無名貓";
    document.getElementById('scene-start').classList.remove('active');
    document.getElementById('scene-lobby').classList.add('active');
    
    // 通知後端有人進大廳
    socket.emit('joinLobby', myUsername);
}

async function startBattle(charName) {
    myCharacter = charName;
    document.getElementById('scene-lobby').classList.remove('active');
    document.getElementById('scene-battle').classList.add('active');
    
    // 初始化 AI 鏡頭
    await initAI();
}

// --- AI 模型控制 ---
async function initAI() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    
    webcam = new tmImage.Webcam(200, 200, true);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

// --- 戰鬥邏輯與傳輸 ---
let playerHands = []; 
async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let best = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);

    // AI 辨識後自動填入戰鬥列表
    if (best.probability > 0.95 && playerHands.length < 3) {
        let turn = playerHands.length + 1;
        playerHands.push(best.className);
        document.getElementById(`hand-${turn}`).innerText = best.className;
        
        // 偵測完成 3 手後，發送給伺服器
        if (playerHands.length === 3) {
            socket.emit('submitHands', { hands: playerHands, character: myCharacter });
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }
}

// --- 伺服器對接邏輯 ---
socket.on('battleResult', (data) => {
    alert("戰鬥結束: " + data.message);
    // 這裡可以處理血量扣除的動畫
});