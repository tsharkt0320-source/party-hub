// record.js — 🏆 기록 게임
// 여럿이 동시에 하는 게임이 아니라, 각자 한 판씩 하고 기록으로 겨루는 게임들.
// 원래 복불복 미니게임 안에 섞여 있던 것을 따로 떼어냈다.

window.updateRecord = function(data) {
    const content = document.getElementById('record-content');
    if (!content) return;

    window._recData = data;

    // 미사일을 플레이하는 중에 화면을 통째로 다시 그리면 캔버스가 사라진다.
    // 기록판만 갈아끼우고 나머지는 손대지 않는다.
    if (window._missileRunning) {
        if (data.recordState !== 'missile') {
            window.stopMissileGame(false); // 방장이 게임을 바꿈 → 기록 없이 중단
        } else {
            renderMissileBoard(data);
            return;
        }
    }

    // 1. 게임 고르기
    if (!data.recordState || data.recordState === 'menu') {
        if (window.isHost) {
            content.innerHTML =
                '<div class="card" style="text-align:left;">' +
                    '<h3 style="margin-bottom:6px; color:var(--primary);">🏆 기록 게임 선택</h3>' +
                    '<p style="color:#94a3b8; font-size:0.85rem; margin-bottom:14px;">각자 한 판씩 플레이하고 기록으로 순위를 겨룹니다.</p>' +
                    '<div style="display:flex; flex-direction:column; gap:10px;">' +
                        '<button class="btn secondary" style="background:#7c2d12; text-align:left;" onclick="window.startRecordGame(\'missile\')">🚀 미사일 피하기<br><span style="font-size:0.78rem; color:#fca5a5; font-weight:normal;">오래 버틴 순서</span></button>' +
                        '<button class="btn secondary" style="background:#4f46e5; text-align:left;" onclick="window.startRecordGame(\'zombie\')">🧟 네온 좀비 서바이버<br><span style="font-size:0.78rem; color:#c7d2fe; font-weight:normal;">점수가 높은 순서</span></button>' +
                    '</div>' +
                '</div>';
        } else {
            content.innerHTML =
                '<div style="text-align:center; margin-top:30px;">' +
                    '<h3 style="color:#fbbf24;">⏳ 방장이 기록 게임을 고르고 있습니다...</h3>' +
                    '<p style="color:#94a3b8; margin-top:10px;">(미사일 피하기, 좀비 서바이버)</p>' +
                '</div>';
        }
        return;
    }

    // 2. 개별 게임 화면
    let html = '';
    if (data.recordState === 'missile') html = renderMissile(data);
    else if (data.recordState === 'zombie') html = renderZombie(data);

    if (window.isHost) {
        html += '<button class="btn danger" style="width:100%; margin-top:20px;"' +
                ' onclick="window.firebaseUpdate(window.firebaseRef(window.db, \'rooms/\' + window.myRoom), { recordState: \'menu\' })">' +
                '기록 게임 목록으로</button>';
    }
    content.innerHTML = html;
};

window.startRecordGame = function(type) {
    if (!window.isHost) return;
    const init = { recordState: type };
    if (type === 'missile') {
        init.recPhase = 'setup';
        init.missileLevel = 'normal';
        init.missileScores = null; // 새 판이므로 기록 초기화
    } else if (type === 'zombie') {
        init.recPhase = 'playing';
        init.zombieScores = null;
    }
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), init);
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

function recEsc(s) {
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
                            recEsc(r.name) + (isMe ? ' <span style="color:#fbbf24;">(나)</span>' : '') +
                        '</span>' +
                        '<span style="font-weight:bold; color:#4ade80; font-size:1.05rem;">' + msToSec(r.ms) + '초</span>' +
                    '</div>';
        });
    }

    if (notYet.length > 0) {
        const names = notYet.map(id => recEsc((window.players[id] || {}).name || '?')).join(', ');
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

    if (data.recPhase !== 'playing') {
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
                    ' onclick="window.firebaseUpdate(window.firebaseRef(window.db, \'rooms/\' + window.myRoom), { recPhase: \'playing\' })">' +
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

    const data = window._recData || {};
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
    const allScores = (window._recData && window._recData.missileScores) || {};
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


// --- 🧟 네온 좀비 서바이버 (Zombie) ---
// 게임 본체는 zombie.html 이 통째로 담당한다. 여기서는 앱 안에 띄우고
// 끝났을 때 점수를 받아 공용 기록판에 올리는 일만 한다.

function zombieBoardHtml(data) {
    const scores = data.zombieScores || {};
    const rows = Object.keys(scores).map(id => Object.assign({ id: id }, scores[id]))
                       .sort((a, b) => (b.score || 0) - (a.score || 0));
    const notYet = Object.keys(window.players || {}).filter(id => !scores[id]);

    let html = '<div class="card" style="margin-top:15px; text-align:left;">' +
               '<h3 style="color:#a78bfa; margin-bottom:12px; text-align:center;">🏆 최고 점수</h3>';

    if (rows.length === 0) {
        html += '<p style="color:#94a3b8; text-align:center; font-size:0.9rem;">아직 아무도 도전하지 않았습니다.</p>';
    } else {
        const medals = ['🥇', '🥈', '🥉'];
        rows.forEach((r, i) => {
            const isMe = r.id === window.myPlayerId;
            const rank = medals[i] || ((i + 1) + '위');
            html += '<div style="display:flex; align-items:center; justify-content:space-between; padding:10px 12px; margin-bottom:6px; border-radius:8px;' +
                    ' background:' + (isMe ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.05)') + ';' +
                    ' border:1px solid ' + (isMe ? '#a78bfa' : 'transparent') + ';">' +
                        '<span style="font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
                            '<b style="display:inline-block; min-width:2.2em;">' + rank + '</b> ' +
                            recEsc(r.name) + (isMe ? ' <span style="color:#a78bfa;">(나)</span>' : '') +
                        '</span>' +
                        '<span style="text-align:right; flex-shrink:0; margin-left:8px;">' +
                            '<b style="color:#c4b5fd; font-size:1.05rem;">' + (r.score || 0).toLocaleString() + '</b>' +
                            '<span style="color:#94a3b8; font-size:0.78rem;"> · Wave ' + (r.wave || 1) + '</span>' +
                        '</span>' +
                    '</div>';
        });
    }

    if (notYet.length > 0) {
        const names = notYet.map(id => recEsc((window.players[id] || {}).name || '?')).join(', ');
        html += '<p style="color:#94a3b8; font-size:0.8rem; margin-top:10px; text-align:center;">아직 안 한 사람: ' + names + '</p>';
    }
    html += '</div>';
    return html;
}

function renderZombieBoard(data) {
    const holder = document.getElementById('zombie-board');
    if (holder) holder.innerHTML = zombieBoardHtml(data);
}

function renderZombie(data) {
    const my = (data.zombieScores || {})[window.myPlayerId];
    let html = '<div class="card" style="text-align:center;">' +
               '<h3 style="color:#a78bfa; margin-bottom:10px;">🧟 네온 좀비 서바이버</h3>' +
               '<p style="color:#cbd5e1; font-size:0.9rem; margin-bottom:14px;">' +
               '몰려오는 좀비를 피해 최대한 오래 버티세요.<br>각자 플레이하고 최고 점수로 겨룹니다.</p>';

    if (my) {
        html += '<div style="margin-bottom:12px; padding:12px; border-radius:10px; background:rgba(167,139,250,0.12); border:1px solid #a78bfa;">' +
                '<span style="color:#c4b5fd;">내 최고 점수 <b style="font-size:1.3rem;">' + (my.score || 0).toLocaleString() + '</b>' +
                ' <span style="color:#94a3b8; font-size:0.8rem;">(Wave ' + (my.wave || 1) + ' · ' + (my.tries || 1) + '번 도전)</span></span></div>';
    }

    html += '<button class="btn primary" style="width:100%; padding:16px; font-size:1.15rem; background:#7c3aed;"' +
            ' onclick="window.openZombie()">' + (my ? '🔁 다시 도전하기' : '▶ 시작하기') + '</button>';

    if (window.isHost) {
        html += '<button class="btn secondary" style="width:100%; margin-top:8px; background:#4b5563;" onclick="window.resetZombieScores()">기록 초기화</button>';
    }
    html += '</div>';
    html += '<div id="zombie-board">' + zombieBoardHtml(data) + '</div>';
    return html;
}

window.resetZombieScores = function() {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { zombieScores: null });
};

// 앱 안에서 바로 열기 (새 창을 띄우지 않는다)
window.openZombie = function() {
    if (document.getElementById('zombie-wrap')) return;
    const wrap = document.createElement('div');
    wrap.id = 'zombie-wrap';
    wrap.style.cssText = 'position:fixed; inset:0; z-index:9998; background:#000;';
    wrap.innerHTML =
        '<iframe src="zombie.html" style="width:100%; height:100%; border:0; display:block;"></iframe>' +
        '<button onclick="window.closeZombie()" style="position:absolute; top:calc(env(safe-area-inset-top, 0px) + 10px); right:10px; z-index:9999;' +
        ' padding:8px 14px; border-radius:999px; border:1px solid rgba(255,255,255,0.35);' +
        ' background:rgba(0,0,0,0.55); color:#fff; font-size:0.85rem; font-weight:bold;">✕ 나가기</button>';
    document.body.appendChild(wrap);
};

window.closeZombie = function() {
    const w = document.getElementById('zombie-wrap');
    if (w) w.remove();
};

// 게임이 끝나면 zombie.html 이 점수를 보내온다
window.addEventListener('message', function(e) {
    if (e.origin !== window.location.origin) return; // 다른 곳에서 온 메시지는 무시
    const d = e.data;
    if (!d || d.type !== 'zombie_score') return;
    submitZombieScore(Number(d.score) || 0, Number(d.wave) || 1);
});

function submitZombieScore(score, wave) {
    if (!window.myRoom || !window.db || !window.myPlayerId) return;
    const all = (window._recData && window._recData.zombieScores) || {};
    const prev = all[window.myPlayerId];
    const best = (prev && (prev.score || 0) > score) ? prev : { score: score, wave: wave };
    const tries = ((prev && prev.tries) || 0) + 1;

    window.firebaseUpdate(
        window.firebaseRef(window.db, 'rooms/' + window.myRoom + '/zombieScores/' + window.myPlayerId),
        {
            name: (window.players[window.myPlayerId] || {}).name || '?',
            score: best.score,
            wave: best.wave,
            last: score,
            tries: tries
        }
    );
}
