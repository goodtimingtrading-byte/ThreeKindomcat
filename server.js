<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <style>
        body { margin: 0; background: #000; color: #fff; overflow: hidden; font-family: sans-serif; }
        #bg-video { position: fixed; width: 100vw; height: 100vh; object-fit: cover; z-index: 0; }
        #ui { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; padding-top: 50px; }
        .grid { display: grid; grid-template-columns: repeat(5, 120px); gap: 10px; }
        .item { width: 120px; height: 120px; border: 2px solid #555; cursor: pointer; background: #222; }
        .item img { width: 100%; height: 100%; object-fit: cover; }
        .hidden { display: none !important; }
    </style>
</head>
<body>
    <video id="bg-video" loop playsinline autoplay muted>
        <source src="https://github.com/goodtimingtrading-byte/ThreeKindomcat/raw/main/Threekindom%20cat%20opening.mp4" type="video/mp4">
    </video>
    <div id="ui">
        <button id="start" style="padding:20px;">進入遊戲</button>
        <div id="select" class="hidden" style="text-align:center;">
            <div id="grid" class="grid"></div>
            <p id="status">等待對手加入...</p>
            <button id="lock">確認鎖定武將</button>
        </div>
        <div id="battle" class="hidden">
            <h1 style="color:red;">戰鬥畫面已啟動！</h1>
        </div>
    </div>

    <script>
        const ws = new WebSocket("wss://threekindomcat.onrender.com");
        const cats = ["LuBu", "KuanYu", "ChangFei", "ZhangYun", "TsaoTsao", "LiuBe", "KongMin", "ChoYou", "SiMaYi", "SunTsu"];

        document.getElementById('start').onclick = function() {
            document.getElementById('bg-video').muted = false;
            this.style.display = 'none';
            document.getElementById('select').classList.remove('hidden');
        };

        cats.forEach(n => {
            const div = document.createElement('div');
            div.className = 'item';
            div.innerHTML = `<img src="https://raw.githubusercontent.com/goodtimingtrading-byte/ThreeKindomcat/main/${n}.png">`;
            div.onclick = () => {
                document.querySelectorAll('.item').forEach(i => i.style.borderColor = '#555');
                div.style.borderColor = '#d4af37';
                window.selectedCat = n;
            };
            document.getElementById('grid').appendChild(div);
        });

        document.getElementById('lock').onclick = () => {
            ws.send(JSON.stringify({ type: 'lock', char: window.selectedCat }));
            document.getElementById('status').innerText = "已鎖定！等待對手...";
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if(data.type === 'START_GAME') {
                document.getElementById('select').classList.add('hidden');
                document.getElementById('battle').classList.remove('hidden');
            }
        };
    </script>
</body>
</html>
