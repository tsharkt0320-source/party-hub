// minigames.js

// 돌리기/굴리기를 다시 시작하면 이전 예약이 뒤늦게 결과를 덮어쓰는 것을 막는다.
// (마피아 사냥꾼 · 라이어 투표 · 퀴즈 제한시간에서 같은 문제가 있었다)
window._miniRound = 0;

function newMiniRound() {
    window._miniRound = (window._miniRound || 0) + 1;
    if (window._miniTimer) { clearTimeout(window._miniTimer); window._miniTimer = null; }
    return window._miniRound;
}
window.newMiniRound = newMiniRound;

window.updateMinigames = function(data) {
    const content = document.getElementById('minigames-content');
    if (!content) return;

    window._missileData = data;

    // 미사일 피하기를 플레이하는 중에는 화면을 통째로 다시 그리면 캔버스가 사라진다.
    // 기록판만 갱신하고 나머지는 손대지 않는다.
    if (window._missileRunning) {
        if (data.minigameState !== 'missile' || data.phase !== 'playing') {
            window.stopMissileGame(false); // 방장이 게임을 바꿈 → 기록 없이 중단
        } else {
            renderMissileBoard(data);
            return;
        }
    }

    // 1. 대기실 (미니게임 선택 창)
    if (!data.minigameState || data.minigameState === 'menu') {
        if (window.isHost) {
            content.innerHTML = `
                <div class="card" style="text-align:left;">
                    <h3 style="margin-bottom:15px; color:var(--primary);">🎮 복불복 미니게임 선택</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <button class="btn secondary" onclick="startMinigame('ladder')">🪜 사다리타기</button>
                        <button class="btn secondary" onclick="startMinigame('lots')">🎫 제비뽑기</button>
                        <button class="btn secondary" onclick="startMinigame('roulette')">🎡 원판돌리기</button>
                        <button class="btn secondary" onclick="startMinigame('dice')">🎲 주사위</button>
                        <button class="btn secondary" onclick="startMinigame('arrow')">🎯 화살표돌리기</button>
                        <button class="btn secondary" onclick="startMinigame('draw')">🎁 당첨자추첨</button>
                        <button class="btn secondary" style="grid-column:1 / -1; background:#7c2d12;" onclick="startMinigame('missile')">🚀 미사일 피하기 (기록 대결)</button>
                        <button class="btn secondary" style="grid-column:1 / -1; background:#4f46e5; border-color:#6366f1;" onclick="window.open('zombie.html', '_blank')">🧟 네온 좀비 서바이버 (싱글플레이)</button>
                    </div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div style="text-align:center; margin-top:30px;">
                    <h3 style="color:#fbbf24;">⏳ 방장이 미니게임을 고르고 있습니다...</h3>
                    <p style="color:#94a3b8; margin-top:10px;">(사다리타기, 룰렛 등)</p>
                    <button class="btn secondary" style="width:100%; margin-top:20px; background:#4f46e5; border-color:#6366f1;" onclick="window.open('zombie.html', '_blank')">🧟 네온 좀비 서바이버 (싱글플레이)</button>
                </div>
            `;
        }
        return;
    }

    // 2. 개별 미니게임 화면
    const gameHtml = renderSpecificMinigame(data);
    
    // 호스트용 뒤로가기 (메뉴로)
    let backBtn = '';
    if (window.isHost) {
        backBtn = `<button class="btn danger" style="width:100%; margin-top:20px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { minigameState: 'menu' })">미니게임 메뉴로 돌아가기</button>`;
    }

    content.innerHTML = gameHtml + backBtn;
    syncDiceFlicker(data);
};

// 주사위가 구르는 1.8초 동안 눈금이 계속 바뀌어야 '굴러가는' 느낌이 난다.
// Firebase 스냅샷은 그 사이에 오지 않으므로 화면 쪽에서 직접 돌린다.
function syncDiceFlicker(data) {
    const rolling = data.minigameState === 'dice' && data.isRolling;
    if (window._diceFlicker) { clearInterval(window._diceFlicker); window._diceFlicker = null; }
    if (!rolling) return;
    window._diceFlicker = setInterval(() => {
        const faces = document.querySelectorAll('.dice-face');
        if (!faces.length) { clearInterval(window._diceFlicker); window._diceFlicker = null; return; }
        faces.forEach(f => { f.innerText = 1 + Math.floor(Math.random() * 6); });
    }, 90);
}

window.startMinigame = function(type) {
    if (!window.isHost) return;
    newMiniRound(); // 다른 게임으로 넘어가면 이전 예약은 버린다
    const pKeys = Object.keys(window.players);
    let initialData = {
        minigameState: type,
        phase: 'setup', // setup -> playing -> result
        participants: pKeys, // default participants
    };

    // 각 게임별 초기화
    if (type === 'ladder') {
        initialData.items = Array(pKeys.length).fill('').map((_, i) => i === 0 ? '당첨' : '꽝');
    } else if (type === 'lots' || type === 'arrow') {
        initialData.items = pKeys.map(id => window.players[id].name);
    } else if (type === 'roulette') {
        initialData.items = pKeys.map(id => window.players[id].name);
    } else if (type === 'dice') {
        initialData.diceCount = 1;
    } else if (type === 'draw') {
        initialData.drawCount = 1;
    } else if (type === 'missile') {
        initialData.missileLevel = 'normal';
        initialData.missileScores = null; // 새 판이므로 기록 초기화
    }

    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), initialData);
};

function renderSpecificMinigame(data) {
    let html = '';
    const type = data.minigameState;

    if (type === 'ladder') {
        html += renderLadder(data);
    } else if (type === 'lots') {
        html += renderLots(data);
    } else if (type === 'roulette') {
        html += renderRoulette(data);
    } else if (type === 'dice') {
        html += renderDice(data);
    } else if (type === 'arrow') {
        html += renderArrow(data);
    } else if (type === 'draw') {
        html += renderDraw(data);
    } else if (type === 'missile') {
        html += renderMissile(data);
    }

    return html;
}

// --- 🪜 사다리타기 (Ladder) ---
function renderLadder(data) {
    let html = `<div class="card" style="text-align:center; overflow-x:auto;">
                    <h3 style="color:#f59e0b; margin-bottom:15px;">🪜 사다리타기</h3>`;
                    
    const pKeys = data.participants || Object.keys(window.players);
    const numCols = pKeys.length;
    
    if (data.phase === 'setup') {
        html += `<p style="margin-bottom:10px; color:#cbd5e1;">사다리 하단의 결과를 설정하세요.</p>
                 <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:15px;">`;
        data.items.forEach((item, idx) => {
            html += `<div style="display:flex; gap:5px;">
                        <span style="padding:8px; background:#1e293b; border-radius:6px; min-width:80px;">${window.players[pKeys[idx]]?.name || '참가자'}</span>
                        <input type="text" class="input-group input" value="${item}" style="flex:1; padding:8px;" ${!window.isHost ? 'disabled' : ''} onchange="window.updateMinigameItem('ladder', ${idx}, this.value)">
                     </div>`;
        });
        html += `</div>`;
        if (window.isHost) {
            html += `<div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button class="btn primary" style="width:100%;" onclick="window.startLadder()">사다리 생성!</button>
                     </div>`;
        }
    } else {
        // SVG Ladder Render
        const width = Math.max(300, numCols * 80);
        const height = 300;
        const colWidth = width / numCols;
        
        html += `<div style="position:relative; width:${width}px; height:${height + 100}px; margin:0 auto;">`;
        
        // 상단 참가자 이름
        pKeys.forEach((pId, idx) => {
            html += `<div style="position:absolute; top:0; left:${(idx + 0.5) * colWidth}px; transform:translateX(-50%); background:#3b82f6; padding:4px 8px; border-radius:4px; color:white; font-size:0.85rem; white-space:nowrap;">
                        ${window.players[pId]?.name}
                     </div>`;
        });
        
        // 사다리 SVG
        html += `<svg width="${width}" height="${height}" style="position:absolute; top:40px; left:0; background:rgba(255,255,255,0.02); border-radius:8px;">`;
        
        // 세로줄
        for(let i=0; i<numCols; i++) {
            const x = (i + 0.5) * colWidth;
            html += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#475569" stroke-width="4" />`;
        }
        
        // 가로줄
        if (data.hLines) {
            const rowHeight = height / 10;
            data.hLines.forEach(line => {
                const x1 = (line.col + 0.5) * colWidth;
                const x2 = (line.col + 1.5) * colWidth;
                const y = line.row * rowHeight;
                html += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#475569" stroke-width="4" />`;
            });
        }
        
        // 결과 경로 (결과 공개 시)
        if (data.phase === 'result' && data.paths) {
            const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
            data.paths.forEach((path, idx) => {
                const pts = path.map(pt => [(pt.col + 0.5) * colWidth, pt.row * (height / 10)]);
                let d = `M ${pts[0][0]} ${pts[0][1]}`;
                let len = 0;
                for (let i = 1; i < pts.length; i++) {
                    d += ` L ${pts[i][0]} ${pts[i][1]}`;
                    len += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
                }
                len = Math.ceil(len) + 12;
                // 한 명씩 차례로 내려가야 눈으로 따라갈 수 있다
                // var() 는 SVG dash 속성 보간에서 동작하지 않으므로 값을 그대로 써넣는다
                html += `<path d="${d}" fill="none" stroke="${colors[idx % colors.length]}"
                               stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"
                               style="stroke-dasharray:${len}; stroke-dashoffset:${len}; animation: ladderDraw 2.2s linear ${(idx * 0.45).toFixed(2)}s forwards;" />`;
            });
        }
        
        html += `</svg>`;
        
        // 하단 결과 항목
        data.items.forEach((item, idx) => {
            const isWin = String(item).indexOf('당첨') !== -1;
            const popped = data.phase === 'result';
            const delay = (data.paths ? data.paths.length * 0.45 : 0) + 2.2;
            html += `<div class="${popped ? 'ladder-result' : ''}"
                          style="position:absolute; bottom:0; left: ${(idx + 0.5) * colWidth}px; transform:translateX(-50%);
                                 background:${isWin ? '#b45309' : '#1e293b'}; border:1px solid ${isWin ? '#f59e0b' : '#475569'};
                                 padding:4px 8px; border-radius:4px; color:${isWin ? '#fef3c7' : '#cbd5e1'};
                                 font-size:0.85rem; white-space:nowrap; ${popped ? `animation-delay:${delay.toFixed(2)}s;` : ''}">
                        ${item}
                     </div>`;
        });
        
        html += `</div>`; // SVG container end

        if (window.isHost) {
            if (data.phase === 'playing') {
                html += `<button class="btn primary" style="width:100%; margin-top:20px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'result' })">결과 공개!</button>`;
            } else if (data.phase === 'result') {
                html += `<button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', hLines: null, paths: null })">다시 설정하기</button>`;
            }
        }
    }
    
    html += `</div>`;
    return html;
}

window.startLadder = function() {
    if (!window.isHost) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    
    window.firebaseGet(roomRef).then(snapshot => {
        const data = snapshot.val();
        const pKeys = data.participants;
        const numCols = pKeys.length;
        
        // 랜덤 가로줄 생성 (최대 10줄, 인접한 줄 방지)
        let hLines = [];
        for(let row=1; row<10; row++) {
            let col = Math.floor(Math.random() * (numCols - 1));
            // 이전 가로줄과 겹치지 않게 간단히 조정
            if (hLines.length > 0 && hLines[hLines.length-1].row === row && hLines[hLines.length-1].col === col) {
                continue;
            }
            // 일정 확률로 그리기
            if (Math.random() > 0.3) {
                hLines.push({row: row, col: col});
            }
        }
        
        // 결과 추적 경로 미리 계산
        let paths = [];
        for (let i=0; i<numCols; i++) {
            let path = [{row: 0, col: i}];
            let currentCol = i;
            
            for (let row=1; row<=10; row++) {
                // 현재 행(row)에 가로줄이 있는지 확인
                let lineAtLeft = hLines.find(l => l.row === row && l.col === currentCol - 1);
                let lineAtRight = hLines.find(l => l.row === row && l.col === currentCol);
                
                if (lineAtLeft || lineAtRight) {
                    path.push({row: row, col: currentCol}); // 교차로 직전
                    if (lineAtLeft) currentCol--;
                    else if (lineAtRight) currentCol++;
                    path.push({row: row, col: currentCol}); // 이동 후
                }
            }
            path.push({row: 10, col: currentCol}); // 바닥 도착
            paths.push(path);
        }
        
        window.firebaseUpdate(roomRef, {
            phase: 'playing',
            hLines: hLines,
            paths: paths
        });
    });
};

// --- 🎫 제비뽑기 (Lots) ---
function renderLots(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#10b981; margin-bottom:15px;">🎫 제비뽑기</h3>`;
                    
    if (data.phase === 'setup') {
        html += `<p style="margin-bottom:10px; color:#cbd5e1;">제비의 내용을 설정하세요.</p>
                 <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:15px;">`;
        data.items.forEach((item, idx) => {
            html += `<div style="display:flex; gap:5px;">
                        <input type="text" class="input-group input" value="${item}" style="flex:1; padding:8px;" ${!window.isHost ? 'disabled' : ''} onchange="window.updateMinigameItem('lots', ${idx}, this.value)">
                        ${window.isHost ? `<button class="btn danger" style="padding:8px;" onclick="window.removeMinigameItem('lots', ${idx})">X</button>` : ''}
                     </div>`;
        });
        html += `</div>`;
        if (window.isHost) {
            html += `<div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button class="btn secondary" style="flex:1;" onclick="window.addMinigameItem('lots')">+ 제비 추가</button>
                        <button class="btn primary" style="flex:2;" onclick="window.startLotsGame()">제비 섞고 시작!</button>
                     </div>`;
        }
    } else {
        html += `<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-bottom:20px;">`;
        data.shuffledItems.forEach((item, idx) => {
            const isRevealed = data.revealed && data.revealed[idx];
            
            html += `<div style="width:80px; height:100px; perspective:1000px; cursor:pointer;" onclick="window.revealLot(${idx})">
                        <div style="width:100%; height:100%; position:relative; transition: transform 0.6s; transform-style: preserve-3d; transform: ${isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)'};">
                            <div style="position:absolute; width:100%; height:100%; backface-visibility:hidden; background:#3b82f6; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                                ?
                            </div>
                            <div style="position:absolute; width:100%; height:100%; backface-visibility:hidden; background:white; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#1e293b; font-size:1.2rem; font-weight:bold; transform: rotateY(180deg); box-shadow:0 4px 6px rgba(0,0,0,0.3); padding:5px; text-align:center; word-break:keep-all;">
                                ${item}
                            </div>
                        </div>
                     </div>`;
        });
        html += `</div>`;
        
        if (window.isHost) {
            html += `<button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', revealed: null, shuffledItems: null })">다시 설정하기</button>`;
        }
    }
    
    html += `</div>`;
    return html;
}

window.startLotsGame = function() {
    if (!window.isHost) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseGet(roomRef).then(snapshot => {
        const data = snapshot.val();
        let shuffled = [...data.items].sort(() => Math.random() - 0.5);
        window.firebaseUpdate(roomRef, {
            phase: 'playing',
            shuffledItems: shuffled,
            revealed: {}
        });
    });
};

window.revealLot = function(idx) {
    if (!window.myRoom) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseUpdate(window.firebaseChild(roomRef, 'revealed'), {
        [idx]: true
    });
};

// --- 🎡 원판돌리기 (Roulette) ---
function renderRoulette(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#fbbf24; margin-bottom:15px;">🎡 원판돌리기</h3>`;
                    
    if (data.phase === 'setup') {
        html += `<p style="margin-bottom:10px; color:#cbd5e1;">원판에 들어갈 항목을 설정하세요.</p>
                 <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:15px;" id="roulette-items">`;
        data.items.forEach((item, idx) => {
            html += `<div style="display:flex; gap:5px;">
                        <input type="text" class="input-group input roulette-item-input" value="${item}" data-idx="${idx}" style="flex:1; padding:8px;" ${!window.isHost ? 'disabled' : ''} onchange="window.updateMinigameItem('roulette', ${idx}, this.value)">
                        ${window.isHost ? `<button class="btn danger" style="padding:8px;" onclick="window.removeMinigameItem('roulette', ${idx})">X</button>` : ''}
                     </div>`;
        });
        html += `</div>`;
        if (window.isHost) {
            html += `<div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button class="btn secondary" style="flex:1;" onclick="window.addMinigameItem('roulette')">+ 항목 추가</button>
                        <button class="btn primary" style="flex:2;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'playing' })">원판 완성!</button>
                     </div>`;
        }
    } else {
        // Playing & Result Phase
        const numItems = data.items.length;
        const sliceAngle = 360 / numItems;
        let conicStops = [];
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
        
        data.items.forEach((item, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;
            const color = colors[i % colors.length];
            conicStops.push(`${color} ${startAngle}deg ${endAngle}deg`);
        });

        const bg = `conic-gradient(${conicStops.join(', ')})`;
        const rotation = data.spinDegrees || 0;
        const transition = data.isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';

        html += `<div style="position:relative; width:280px; height:280px; margin:20px auto; border-radius:50%; border:4px solid #fff; overflow:hidden;">
                    <div id="roulette-wheel" style="width:100%; height:100%; border-radius:50%; background: ${bg}; transform: rotate(${rotation}deg); transition: ${transition}; position:relative;">`;
        
        // 텍스트 배치
        data.items.forEach((item, i) => {
            const angle = (i * sliceAngle) + (sliceAngle / 2);
            html += `<div style="position:absolute; top:50%; left:50%; width:50%; height:20px; margin-top:-10px; transform-origin:left center; transform: rotate(${angle}deg);">
                        <span style="position:absolute; right:10px; color:white; font-weight:bold; font-size:1rem; text-shadow:1px 1px 2px rgba(0,0,0,0.8);">${item}</span>
                     </div>`;
        });
        
        html += `   </div>
                    <div style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:15px solid transparent; border-right:15px solid transparent; border-top:30px solid #fbbf24; z-index:10; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></div>
                 </div>`;
                 
        if (data.phase === 'result' && data.winner) {
            html += `<div class="winner-pop" style="font-size:1.7rem; font-weight:900; margin-top:20px; color:#10b981; text-shadow:0 0 24px rgba(16,185,129,0.6);">
                        🎉 당첨: ${data.winner} 🎉
                     </div>`;
        }

        if (window.isHost) {
            if (!data.isSpinning) {
                html += `<button class="btn primary" style="width:100%; padding:15px; font-size:1.2rem; margin-top:20px;" onclick="window.spinRoulette()">돌리기!</button>`;
            }
            if (data.phase === 'result') {
                 html += `<button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', spinDegrees: 0, winner: null })">다시 설정하기</button>`;
            }
        } else if (data.isSpinning) {
            html += `<div style="margin-top:20px; color:#fbbf24;">룰렛이 돌아가고 있습니다...</div>`;
        }
    }
    
    html += `</div>`;
    return html;
}

window.spinRoulette = function() {
    if (!window.isHost) return;
    const round = newMiniRound();
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    
    window.firebaseGet(roomRef).then(snapshot => {
        const data = snapshot.val();
        const numItems = data.items.length;
        const sliceAngle = 360 / numItems;
        
        // 10바퀴(3600도) 이상 + 랜덤 각도
        const randomTarget = Math.floor(Math.random() * 360);
        const totalRotation = (data.spinDegrees || 0) + 3600 + randomTarget;
        
        // 위쪽 포인터가 가리키는 인덱스 계산
        // 회전이 끝난 후, 포인터(0도, 최상단)에 위치하는 조각 계산.
        // 현재 각도에서 실제 휠이 돌아간 각도 = totalRotation % 360
        const actualRot = totalRotation % 360; 
        // 바늘은 270도 위치(-90도)에 있다고 볼 때 역산
        const pointerAngle = (360 - actualRot + 270) % 360; 
        const winningIdx = Math.floor(pointerAngle / sliceAngle);
        const winner = data.items[winningIdx];

        window.firebaseUpdate(roomRef, {
            phase: 'playing',
            isSpinning: true,
            spinDegrees: totalRotation,
            winner: null
        });

        // 4초 후 결과 발표
        window._miniTimer = setTimeout(() => {
            if (window._miniRound !== round) return; // 이미 다시 돌렸으면 무시
            window.firebaseUpdate(roomRef, {
                isSpinning: false,
                phase: 'result',
                winner: winner
            });
        }, 4000);
    });
};

// Generic Item Management for Minigames
window.updateMinigameItem = function(game, idx, val) {
    if (!window.isHost) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseGet(roomRef).then(snapshot => {
        let items = snapshot.val().items || [];
        items[idx] = val;
        window.firebaseUpdate(roomRef, { items: items });
    });
};

window.addMinigameItem = function(game) {
    if (!window.isHost) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseGet(roomRef).then(snapshot => {
        let items = snapshot.val().items || [];
        items.push('항목 ' + (items.length + 1));
        window.firebaseUpdate(roomRef, { items: items });
    });
};

window.removeMinigameItem = function(game, idx) {
    if (!window.isHost) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseGet(roomRef).then(snapshot => {
        let items = snapshot.val().items || [];
        if (items.length > 2) {
            items.splice(idx, 1);
            window.firebaseUpdate(roomRef, { items: items });
        } else {
            alert("최소 2개 이상의 항목이 필요합니다.");
        }
    });
};
// --- 🎲 주사위 굴리기 (Dice) ---
function renderDice(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#ef4444; margin-bottom:15px;">🎲 주사위 굴리기</h3>`;
                    
    if (data.phase === 'setup') {
        const dCount = data.diceCount || 1;
        html += `<p style="margin-bottom:15px; color:#cbd5e1;">주사위 개수를 설정하세요.</p>
                 <div style="display:flex; justify-content:center; gap:20px; margin-bottom:20px;">
                    <label style="cursor:pointer; font-size:1.2rem;">
                        <input type="radio" name="dice-cnt" value="1" ${dCount===1?'checked':''} ${!window.isHost?'disabled':''} onchange="window.updateDiceCount(1)"> 1개
                    </label>
                    <label style="cursor:pointer; font-size:1.2rem;">
                        <input type="radio" name="dice-cnt" value="2" ${dCount===2?'checked':''} ${!window.isHost?'disabled':''} onchange="window.updateDiceCount(2)"> 2개
                    </label>
                 </div>`;
        if (window.isHost) {
            html += `<button class="btn primary" style="width:100%;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'playing' })">시작!</button>`;
        }
    } else {
        const dCount = data.diceCount || 1;
        const results = data.diceResults || [1, 1];
        
        html += `<div style="display:flex; justify-content:center; gap:20px; margin:30px 0; min-height:130px; align-items:center;">`;
        for (let i = 0; i < dCount; i++) {
            const rolling = !!data.isRolling;
            const val = rolling ? (1 + Math.floor(Math.random() * 6)) : results[i];
            html += `<div class="dice-face ${rolling ? 'dice-rolling' : 'dice-settled'}"
                          style="width:100px; height:100px; background:white; border-radius:18px;
                                 display:flex; align-items:center; justify-content:center;
                                 font-size:4rem; font-weight:900; color:#1e293b;
                                 box-shadow:inset 0 0 12px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.35);
                                 animation-delay:${(i * 0.12).toFixed(2)}s;">
                        ${val}
                     </div>`;
        }
        html += `</div>`;
        
        if (data.phase === 'result' && !data.isRolling) {
            const sum = results.slice(0, dCount).reduce((a,b)=>a+b, 0);
            html += `<div style="font-size:2rem; font-weight:bold; margin-bottom:20px; color:#fbbf24;">총합: ${sum}</div>`;
        }

        if (window.isHost) {
            if (!data.isRolling) {
                html += `<button class="btn primary" style="width:100%; padding:15px; font-size:1.2rem;" onclick="window.rollDice()">굴리기!</button>`;
            }
            if (data.phase === 'result') {
                 html += `<button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', diceResults: null })">다시 설정하기</button>`;
            }
        } else if (data.isRolling) {
            html += `<div style="color:#ef4444; margin-top:10px;">주사위 굴리는 중...</div>`;
        }
    }
    
    html += `</div>`;
    return html;
}

window.updateDiceCount = function(cnt) {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { diceCount: cnt });
};

window.rollDice = function() {
    if (!window.isHost) return;
    const round = newMiniRound();
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    
    window.firebaseUpdate(roomRef, {
        phase: 'playing',
        isRolling: true,
        diceResults: null
    });
    
    window._miniTimer = setTimeout(() => {
        if (window._miniRound !== round) return; // 이미 다시 굴렸으면 무시
        window.firebaseGet(roomRef).then(snapshot => {
            const data = snapshot.val();
            const dCount = data.diceCount || 1;
            let results = [];
            for(let i=0; i<dCount; i++) {
                results.push(Math.floor(Math.random() * 6) + 1);
            }
            window.firebaseUpdate(roomRef, {
                isRolling: false,
                phase: 'result',
                diceResults: results
            });
        });
    }, 2100); // 구르는 모션(1.8초)이 끝난 뒤 결과가 뜨도록
};

// --- 🎯 화살표 돌리기 (Arrow) ---
function renderArrow(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#8b5cf6; margin-bottom:15px;">🎯 화살표 돌리기</h3>`;
                    
    if (data.phase === 'setup') {
        html += `<p style="margin-bottom:10px; color:#cbd5e1;">참여할 사람을 설정하세요.</p>
                 <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:15px;">`;
        data.items.forEach((item, idx) => {
            html += `<div style="display:flex; gap:5px;">
                        <input type="text" class="input-group input" value="${item}" style="flex:1; padding:8px;" ${!window.isHost ? 'disabled' : ''} onchange="window.updateMinigameItem('arrow', ${idx}, this.value)">
                        ${window.isHost ? `<button class="btn danger" style="padding:8px;" onclick="window.removeMinigameItem('arrow', ${idx})">X</button>` : ''}
                     </div>`;
        });
        html += `</div>`;
        if (window.isHost) {
            html += `<div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button class="btn secondary" style="flex:1;" onclick="window.addMinigameItem('arrow')">+ 인원 추가</button>
                        <button class="btn primary" style="flex:2;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'playing' })">시작!</button>
                     </div>`;
        }
    } else {
        const numItems = data.items.length;
        const sliceAngle = 360 / numItems;
        const rotation = data.spinDegrees || 0;
        const transition = data.isSpinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';

        html += `<div style="position:relative; width:300px; height:300px; margin:20px auto; border-radius:50%; background:rgba(255,255,255,0.05); border:2px dashed #475569;">`;
        
        // 이름 배치
        data.items.forEach((item, i) => {
            // 화살표가 가리키는 곳에 맞추기 위해 약간의 수학 필요
            const angle = i * sliceAngle - 90; // -90 to start from top
            html += `<div style="position:absolute; top:50%; left:50%; width:140px; height:20px; margin-top:-10px; transform-origin:left center; transform: rotate(${angle}deg);">
                        <span style="position:absolute; right:0; color:#cbd5e1; font-weight:bold; padding:2px 8px; background:#1e293b; border-radius:10px; border:1px solid #334155;">${item}</span>
                     </div>`;
        });
        
        // 회전하는 화살표
        html += `   <div style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:flex; align-items:center; justify-content:center; transform: rotate(${rotation}deg); transition: ${transition};">
                        <div style="width:0; height:0; border-left:20px solid transparent; border-right:20px solid transparent; border-bottom:120px solid #ef4444; margin-bottom:120px; filter:drop-shadow(0 4px 4px rgba(0,0,0,0.5));"></div>
                        <div style="position:absolute; width:40px; height:40px; background:#ef4444; border-radius:50%; box-shadow:inset 0 -5px 10px rgba(0,0,0,0.3);"></div>
                    </div>
                 </div>`;
                 
        if (data.phase === 'result' && data.winner) {
            html += `<div class="winner-pop" style="font-size:1.7rem; font-weight:900; margin-top:20px; color:#10b981; text-shadow:0 0 24px rgba(16,185,129,0.6);">
                        👉 지목된 사람: ${data.winner} 👈
                     </div>`;
        }

        if (window.isHost) {
            if (!data.isSpinning) {
                html += `<button class="btn primary" style="width:100%; padding:15px; font-size:1.2rem; margin-top:20px;" onclick="window.spinArrow()">돌리기!</button>`;
            }
            if (data.phase === 'result') {
                 html += `<button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', spinDegrees: 0, winner: null })">다시 설정하기</button>`;
            }
        } else if (data.isSpinning) {
            html += `<div style="margin-top:20px; color:#ef4444;">화살표가 돌아가고 있습니다...</div>`;
        }
    }
    
    html += `</div>`;
    return html;
}

window.spinArrow = function() {
    if (!window.isHost) return;
    const round = newMiniRound();
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    
    window.firebaseGet(roomRef).then(snapshot => {
        const data = snapshot.val();
        const numItems = data.items.length;
        const sliceAngle = 360 / numItems;
        
        const randomTarget = Math.floor(Math.random() * 360);
        const totalRotation = (data.spinDegrees || 0) + 3600 + randomTarget;
        
        const actualRot = totalRotation % 360; 
        const winningIdx = Math.floor(actualRot / sliceAngle);
        const winner = data.items[winningIdx];

        window.firebaseUpdate(roomRef, {
            phase: 'playing',
            isSpinning: true,
            spinDegrees: totalRotation,
            winner: null
        });

        window._miniTimer = setTimeout(() => {
            if (window._miniRound !== round) return; // 이미 다시 돌렸으면 무시
            window.firebaseUpdate(roomRef, {
                isSpinning: false,
                phase: 'result',
                winner: winner
            });
        }, 4000);
    });
};

// --- 🎁 당첨자 추첨 (Draw) ---
function renderDraw(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#ec4899; margin-bottom:15px;">🎁 당첨자 추첨</h3>`;
                    
    const pKeys = Object.keys(window.players);
    const maxDraw = pKeys.length;
    
    if (data.phase === 'setup') {
        const dCount = data.drawCount || 1;
        html += `<p style="margin-bottom:15px; color:#cbd5e1;">몇 명을 추첨할까요?</p>
                 <div style="display:flex; justify-content:center; align-items:center; gap:15px; margin-bottom:20px;">
                    <button class="btn secondary" ${!window.isHost ? 'disabled' : ''} onclick="window.updateDrawCount(-1)">-</button>
                    <span style="font-size:2rem; font-weight:bold; color:#fbbf24;">${dCount}명</span>
                    <button class="btn secondary" ${!window.isHost ? 'disabled' : ''} onclick="window.updateDrawCount(1)">+</button>
                 </div>
                 <p style="font-size:0.8rem; color:#64748b; margin-bottom:20px;">총 인원: ${maxDraw}명</p>`;
                 
        if (window.isHost) {
            html += `<button class="btn primary" style="width:100%;" onclick="window.startDraw()">추첨 시작!</button>`;
        }
    } else {
        html += `<div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-bottom:20px;">`;
        pKeys.forEach(pId => {
            const isWinner = data.winners && data.winners.includes(pId);
            const opacity = (data.phase === 'result' && !isWinner) ? 0.3 : 1;
            const bg = (data.phase === 'result' && isWinner) ? '#10b981' : '#1e293b';
            const scale = (data.phase === 'result' && isWinner) ? 'scale(1.1)' : 'scale(1)';
            const anim = (data.isDrawing) ? 'animation: blink 0.2s infinite alternate;' : '';
            
            html += `<div style="padding:10px 15px; background:${bg}; border-radius:8px; border:2px solid #334155; opacity:${opacity}; transform:${scale}; transition:all 0.3s; ${anim}">
                        ${window.players[pId].name}
                     </div>`;
        });
        html += `</div>`;
        
        if (data.phase === 'result' && data.winners) {
            html += `<div style="font-size:1.5rem; font-weight:bold; margin-top:20px; color:#10b981; animation:bounce 1s infinite;">
                        축하합니다! 🎉
                     </div>`;
        }

        if (window.isHost) {
            if (data.phase === 'result') {
                 html += `<button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', winners: null })">다시 설정하기</button>`;
            }
        } else if (data.isDrawing) {
            html += `<div style="color:#ec4899; margin-top:10px;">당첨자 추첨 중... 두구두구두구</div>`;
        }
    }
    
    html += `</div>`;
    return html;
}

window.updateDrawCount = function(delta) {
    if (!window.isHost) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseGet(roomRef).then(snapshot => {
        const data = snapshot.val();
        let cnt = (data.drawCount || 1) + delta;
        const max = Object.keys(window.players).length;
        if (cnt < 1) cnt = 1;
        if (cnt > max) cnt = max;
        window.firebaseUpdate(roomRef, { drawCount: cnt });
    });
};

window.startDraw = function() {
    if (!window.isHost) return;
    const round = newMiniRound();
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    
    window.firebaseUpdate(roomRef, {
        phase: 'playing',
        isDrawing: true,
        winners: null
    });
    
    window._miniTimer = setTimeout(() => {
        if (window._miniRound !== round) return; // 이미 다시 뽑았으면 무시
        window.firebaseGet(roomRef).then(snapshot => {
            const data = snapshot.val();
            const dCount = data.drawCount || 1;
            const pKeys = Object.keys(window.players);
            const shuffled = pKeys.sort(() => Math.random() - 0.5);
            const winners = shuffled.slice(0, dCount);
            
            window.firebaseUpdate(roomRef, {
                isDrawing: false,
                phase: 'result',
                winners: winners
            });
        });
    }, 3000);
};

// --- 🚀 미사일 피하기 (Missile) ---
// 각자 자기 폰에서 한 판씩 플레이하고, 버틴 시간을 공용 기록판에 남긴다.

const MISSILE_LEVELS = {
    easy:   { label: '쉬움',   spawnMs: 900, speed: 1.7, ramp: 0.000055 },
    normal: { label: '보통',   spawnMs: 650, speed: 2.3, ramp: 0.000100 },
    hard:   { label: '어려움', spawnMs: 430, speed: 3.1, ramp: 0.000165 }
};

function msToSec(ms) {
    return (ms / 1000).toFixed(2);
}

function mgEsc(s) {
    return (window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
}

// 기록판 HTML (오래 버틴 순)
function missileBoardHtml(data) {
    const scores = data.missileScores || {};
    const rows = Object.keys(scores).map(id => Object.assign({ id: id }, scores[id]))
                       .sort((a, b) => (b.ms || 0) - (a.ms || 0));
    const notYet = Object.keys(window.players || {}).filter(id => !scores[id]);

    let html = '<div class="card" style="margin-top:15px; text-align:left;">' +
               '<h3 style="color:#fbbf24; margin-bottom:12px; text-align:center;">🏆 생존 기록</h3>';

    if (rows.length === 0) {
        html += '<p style="color:#94a3b8; text-align:center; font-size:0.9rem;">아직 아무도 도전하지 않았습니다.</p>';
    } else {
        const medals = ['🥇', '🥈', '🥉'];
        rows.forEach((r, i) => {
            const isMe = r.id === window.myPlayerId;
            const rank = medals[i] || ((i + 1) + '위');
            html += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; margin-bottom:6px; border-radius:8px;' +
                    ' background:' + (isMe ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)') + ';' +
                    ' border:1px solid ' + (isMe ? '#fbbf24' : 'transparent') + ';">' +
                        '<span style="font-size:0.95rem;">' +
                            '<b style="display:inline-block; min-width:2.2em;">' + rank + '</b> ' +
                            mgEsc(r.name) + (isMe ? ' <span style="color:#fbbf24;">(나)</span>' : '') +
                        '</span>' +
                        '<span style="font-weight:bold; color:#4ade80; font-size:1.05rem;">' + msToSec(r.ms) + '초</span>' +
                    '</div>';
        });
    }

    if (notYet.length > 0) {
        const names = notYet.map(id => mgEsc((window.players[id] || {}).name || '?')).join(', ');
        html += '<p style="color:#94a3b8; font-size:0.8rem; margin-top:10px; text-align:center;">아직 안 한 사람: ' + names + '</p>';
    }

    html += '</div>';
    return html;
}

// 플레이 중에는 기록판만 갈아끼운다 (캔버스 보존)
function renderMissileBoard(data) {
    const holder = document.getElementById('missile-board');
    if (holder) holder.innerHTML = missileBoardHtml(data);
}

function renderMissile(data) {
    const level = MISSILE_LEVELS[data.missileLevel] ? data.missileLevel : 'normal';
    const scores = data.missileScores || {};
    const myScore = scores[window.myPlayerId];

    let html = '<div class="card" style="text-align:center;">' +
               '<h3 style="color:#f97316; margin-bottom:12px;">🚀 미사일 피하기</h3>';

    if (data.phase === 'setup') {
        html += '<p style="color:#cbd5e1; margin-bottom:15px; font-size:0.9rem;">' +
                '떨어지는 미사일을 피해 최대한 오래 버티세요.<br>각자 한 판씩 플레이합니다.</p>' +
                '<div style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">';
        Object.keys(MISSILE_LEVELS).forEach(key => {
            const on = key === level;
            html += '<button class="btn" ' + (window.isHost ? '' : 'disabled') +
                    ' style="flex:1; padding:12px; font-size:0.95rem; opacity:' + (window.isHost ? 1 : 0.6) + ';' +
                    ' background:' + (on ? '#f97316' : '#374151') + '; color:white;"' +
                    ' onclick="window.setMissileLevel(\'' + key + '\')">' + MISSILE_LEVELS[key].label + '</button>';
        });
        html += '</div>';

        if (window.isHost) {
            html += '<button class="btn primary" style="width:100%; padding:15px; font-size:1.1rem;"' +
                    ' onclick="window.firebaseUpdate(window.firebaseRef(window.db, \'rooms/\' + window.myRoom), { phase: \'playing\' })">' +
                    '게임 시작!</button>';
        } else {
            html += '<p style="color:#94a3b8;">방장이 난이도를 고르는 중...</p>';
        }
        html += '</div>';
        return html;
    }

    // phase === 'playing' : 각자 자기 차례를 직접 시작
    html += '<p style="color:#94a3b8; font-size:0.85rem; margin-bottom:12px;">난이도: ' +
            '<b style="color:#f97316;">' + MISSILE_LEVELS[level].label + '</b>' +
            ' · 손가락(또는 마우스)을 좌우로 움직여 피하세요</p>';

    if (myScore) {
        html += '<div style="margin-bottom:12px; padding:12px; border-radius:10px; background:rgba(74,222,128,0.12); border:1px solid #4ade80;">' +
                '<span style="color:#4ade80;">내 기록 <b style="font-size:1.3rem;">' + msToSec(myScore.ms) + '초</b> ' +
                '<span style="color:#94a3b8; font-size:0.8rem;">(' + (myScore.tries || 1) + '번 도전)</span></span></div>';
    }

    html += '<div id="missile-stage" style="position:relative; display:inline-block; width:100%; max-width:400px;">' +
                '<canvas id="missile-canvas" style="width:100%; display:block; border-radius:12px; background:#0b1120;' +
                ' border:2px solid #334155; touch-action:none;"></canvas>' +
            '</div>' +
            '<div style="display:flex; justify-content:center; margin-top:15px; touch-action:none; user-select:none;">' +
                '<div id="joystick-base" style="position:relative; width:120px; height:120px; border-radius:50%; background:rgba(255,255,255,0.08); border:2px solid #475569;">' +
                    '<div id="joystick-knob" style="position:absolute; top:35px; left:35px; width:50px; height:50px; border-radius:50%; background:#38bdf8; box-shadow:0 0 10px rgba(56,189,248,0.5); pointer-events:none;"></div>' +
                '</div>' +
            '</div>' +
            '<button class="btn primary" style="width:100%; padding:15px; font-size:1.15rem; margin-top:15px; background:#f97316;"' +
            ' onclick="window.startMissileRound()">' + (myScore ? '🔁 다시 도전하기' : '▶ 내 차례 시작하기') + '</button>';

    if (window.isHost) {
        html += '<button class="btn secondary" style="width:100%; margin-top:8px; background:#4b5563;"' +
                ' onclick="window.resetMissileScores()">기록 초기화</button>';
    }

    html += '</div>';
    html += '<div id="missile-board">' + missileBoardHtml(data) + '</div>';
    return html;
}

window.setMissileLevel = function(key) {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { missileLevel: key });
};

window.resetMissileScores = function() {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { missileScores: null });
};

// ---- 게임 루프 ----
window._missileRunning = false;

window.startMissileRound = function() {
    const canvas = document.getElementById('missile-canvas');
    if (!canvas || window._missileRunning) return;

    const data = window._missileData || {};
    const cfg = MISSILE_LEVELS[data.missileLevel] || MISSILE_LEVELS.normal;

    // 캔버스 해상도를 화면 밀도에 맞춘다 (모바일에서 선명하게)
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 360;
    const cssH = Math.round(cssW * 1.25);
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = cssW, H = cssH;
    const ship = { x: W / 2, y: H / 2, r: 11, speed: 250 };
    let shipAngle = -Math.PI / 2;
    let missiles = [];
    let lastFrame = performance.now();
    let elapsed = 0;          
    let nextSpawn = 0;        
    let running = true;
    window._missileRunning = true;

    // ---- 조이스틱 & 키보드 입력 ----
    let joyActive = false;
    let joyVector = { x: 0, y: 0 };
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    let onJoyMoveFn, onJoyEndFn;
    
    if (base && knob) {
        let baseCenter = { x: 0, y: 0 };
        const baseRadius = 60;
        const knobRadius = 25;
        
        function updateJoy(cx, cy) {
            let dx = cx - baseCenter.x;
            let dy = cy - baseCenter.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let maxDist = baseRadius - knobRadius;
            
            if (dist > maxDist) {
                dx = (dx/dist) * maxDist;
                dy = (dy/dist) * maxDist;
            }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            joyVector.x = dx / maxDist;
            joyVector.y = dy / maxDist;
        }
        
        function onJoyStart(e) {
            if (!running) return;
            if (e.type === 'touchstart') e.preventDefault(); // 화면 스크롤 방지
            joyActive = true;
            const rect = base.getBoundingClientRect();
            baseCenter = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
            let cx = e.touches ? e.touches[0].clientX : e.clientX;
            let cy = e.touches ? e.touches[0].clientY : e.clientY;
            updateJoy(cx, cy);
        }
        
        onJoyMoveFn = function(e) {
            if (!joyActive || !running) return;
            if (e.type === 'touchmove') e.preventDefault();
            let cx = e.touches ? e.touches[0].clientX : e.clientX;
            let cy = e.touches ? e.touches[0].clientY : e.clientY;
            updateJoy(cx, cy);
        };
        
        onJoyEndFn = function(e) {
            if (!joyActive) return;
            joyActive = false;
            joyVector = { x: 0, y: 0 };
            knob.style.transform = `translate(0px, 0px)`;
        };
        
        base.addEventListener('touchstart', onJoyStart, {passive: false});
        base.addEventListener('mousedown', onJoyStart);
        window.addEventListener('touchmove', onJoyMoveFn, {passive: false});
        window.addEventListener('mousemove', onJoyMoveFn);
        window.addEventListener('touchend', onJoyEndFn);
        window.addEventListener('mouseup', onJoyEndFn);
    }

    let keys = {};
    function onKey(e) {
        if (!running) return;
        keys[e.code] = e.type === 'keydown';
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    function cleanup() {
        if (base) {
            window.removeEventListener('touchmove', onJoyMoveFn);
            window.removeEventListener('mousemove', onJoyMoveFn);
            window.removeEventListener('touchend', onJoyEndFn);
            window.removeEventListener('mouseup', onJoyEndFn);
        }
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
    }
    window._missileCleanup = cleanup;

    // ---- 그리기 ----
    function drawShip() {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(shipAngle + Math.PI/2);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -ship.r);
        ctx.lineTo(ship.r * 0.9, ship.r);
        ctx.lineTo(0, ship.r * 0.5);
        ctx.lineTo(-ship.r * 0.9, ship.r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawMissile(m) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle - Math.PI/2);
        // 불꽃 (위쪽)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-m.w / 2, -m.h / 2);
        ctx.lineTo(m.w / 2, -m.h / 2);
        ctx.lineTo(0, -m.h / 2 - 9);
        ctx.closePath();
        ctx.fill();
        // 몸통
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-m.w / 2, -m.h / 2, m.w, m.h * 0.75);
        // 탄두 (아래쪽)
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.moveTo(-m.w / 2, m.h * 0.25);
        ctx.lineTo(m.w / 2, m.h * 0.25);
        ctx.lineTo(0, m.h / 2 + 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawHud(elapsed) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(msToSec(elapsed) + '초', W / 2, 38);
    }

    function gameOver(elapsed) {
        running = false;
        window._missileRunning = false;
        cleanup();

        ctx.fillStyle = 'rgba(239,68,68,0.35)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('💥 격추!', W / 2, H / 2 - 14);
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(msToSec(elapsed) + '초', W / 2, H / 2 + 34);

        submitMissileScore(elapsed);
    }

    function loop(now) {
        if (!running) return;
        // dt를 제한해 두면 (1) 미사일 순간이동을 막고
        // (2) 앱을 내렸다 올려도 그 시간이 기록에 더해지지 않는다 = 백그라운드 치트 방지
        const dt = Math.min(now - lastFrame, 50);
        lastFrame = now;
        elapsed += dt;
        const mult = 1 + elapsed * cfg.ramp;

        // 우주선 이동 처리
        let kx = 0, ky = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) kx -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) kx += 1;
        if (keys['ArrowUp'] || keys['KeyW']) ky -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) ky += 1;
        
        let vx = joyActive ? joyVector.x : kx;
        let vy = joyActive ? joyVector.y : ky;
        
        if (!joyActive && (vx !== 0 || vy !== 0)) {
            let len = Math.sqrt(vx*vx + vy*vy);
            vx /= len; vy /= len;
        }
        
        if (vx !== 0 || vy !== 0) shipAngle = Math.atan2(vy, vx);
        
        ship.x += vx * ship.speed * (dt / 1000);
        ship.y += vy * ship.speed * (dt / 1000);
        ship.x = Math.max(ship.r, Math.min(W - ship.r, ship.x));
        ship.y = Math.max(ship.r, Math.min(H - ship.r, ship.y));

        // 생성
        if (elapsed >= nextSpawn) {
            const w = 12 + Math.random() * 10;
            const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
            let mx, my;
            
            // 중앙 근처를 목표로 하되 약간의 오차 적용
            let targetX = W/2 + (Math.random()-0.5)*120;
            let targetY = H/2 + (Math.random()-0.5)*120;

            if (side === 0) { mx = Math.random()*W; my = -30; }
            else if (side === 1) { mx = W+30; my = Math.random()*H; }
            else if (side === 2) { mx = Math.random()*W; my = H+30; }
            else { mx = -30; my = Math.random()*H; }
            
            let angle = Math.atan2(targetY - my, targetX - mx);
            let speed = cfg.speed * mult * (0.85 + Math.random() * 0.4) * 80;
            
            missiles.push({
                x: mx, y: my, w: w, h: 26,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                angle: angle
            });
            nextSpawn = elapsed + Math.max(130, cfg.spawnMs / mult) * (0.7 + Math.random() * 0.6);
        }

        // 이동 + 충돌
        for (let i = missiles.length - 1; i >= 0; i--) {
            const m = missiles[i];
            m.x += m.vx * (dt / 1000);
            m.y += m.vy * (dt / 1000);
            
            // 화면 밖으로 완전히 나가면 삭제
            if (m.x < -100 || m.x > W+100 || m.y < -100 || m.y > H+100) { 
                missiles.splice(i, 1); 
                continue; 
            }

            // 원(우주선) vs 점(미사일 중심) 충돌 — 모바일 난이도 고려 살짝 후하게
            const hr = ship.r * 0.6;
            const dx = ship.x - m.x, dy = ship.y - m.y;
            if (dx * dx + dy * dy < hr * hr) {
                ctx.clearRect(0, 0, W, H);
                missiles.forEach(drawMissile);
                drawShip();
                gameOver(elapsed);
                return;
            }
        }

        // 렌더
        ctx.clearRect(0, 0, W, H);
        missiles.forEach(drawMissile);
        drawShip();
        drawHud(elapsed);

        requestAnimationFrame(loop);
    }

    // 3-2-1 카운트다운 후 시작
    let count = 3;
    (function countdown() {
        if (!window._missileRunning) return; // 중간에 취소된 경우
        ctx.clearRect(0, 0, W, H);
        drawShip();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(count > 0 ? String(count) : 'GO!', W / 2, H / 2);
        if (count-- > 0) {
            setTimeout(countdown, 700);
        } else {
            lastFrame = performance.now();
            elapsed = 0;
            nextSpawn = 400;
            requestAnimationFrame(loop);
        }
    })();
};

// 방장이 게임을 바꾸는 등 중간에 끊길 때
window.stopMissileGame = function() {
    window._missileRunning = false;
    if (window._missileCleanup) { window._missileCleanup(); window._missileCleanup = null; }
};

function submitMissileScore(elapsedMs) {
    if (!window.myRoom || !window.db) return;
    const ms = Math.round(elapsedMs);
    const allScores = (window._missileData && window._missileData.missileScores) || {};
    const prev = allScores[window.myPlayerId];
    const best = (prev && prev.ms > ms) ? prev.ms : ms;
    const tries = ((prev && prev.tries) || 0) + 1;

    window.firebaseUpdate(
        window.firebaseRef(window.db, 'rooms/' + window.myRoom + '/missileScores/' + window.myPlayerId),
        {
            name: (window.players[window.myPlayerId] || {}).name || '?',
            ms: best,
            last: ms,
            tries: tries
        }
    );
}
