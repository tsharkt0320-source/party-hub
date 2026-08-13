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

function mgEsc(s) {
    return (window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
}

// 항목 칸에 글씨를 치는 동안에도 다른 사람 소식이 오면 화면이 통째로 다시 그려진다.
// 그때 방금 친 글씨가 사라지지 않도록, 저장되기 전 값을 여기에 들고 있는다.
window._mgDraft = {};
const mgDraftTimer = {};

window.mgItemInput = function(idx, val) {
    if (!window.isHost) return;
    window._mgDraft[idx] = val;
    clearTimeout(mgDraftTimer[idx]);
    mgDraftTimer[idx] = setTimeout(() => {
        window.updateMinigameItem(null, idx, val);
    }, 350);
};

// 화면에 보여줄 값 — 아직 저장 전이면 방금 친 글씨를 그대로 보여준다
function mgItemValue(items, idx) {
    const saved = items[idx] == null ? '' : items[idx];
    const draft = window._mgDraft[idx];
    if (draft === undefined) return saved;
    if (draft === saved) { delete window._mgDraft[idx]; return saved; }
    return draft;
}

// 항목 칸 하나를 그린다 (사다리·제비·원판·화살표가 같이 쓴다)
function mgItemInputHtml(items, idx, opts) {
    opts = opts || {};
    return '<div style="display:flex; gap:6px; align-items:center;">' +
               (opts.label ? '<span style="color:#64748b; font-size:0.8rem; min-width:2.6em;">' + opts.label + '</span>' : '') +
               '<input type="text" class="input-group input mg-item-input" data-mg-idx="' + idx + '"' +
                   ' value="' + mgEsc(mgItemValue(items, idx)) + '" style="flex:1; padding:9px; font-size:1rem;"' +
                   (window.isHost ? '' : ' disabled') +
                   ' oninput="window.mgItemInput(' + idx + ', this.value)">' +
               (window.isHost && opts.removable
                   ? '<button class="btn danger" style="width:auto; padding:9px 12px;" onclick="window.removeMinigameItem(null, ' + idx + ')">X</button>'
                   : '') +
           '</div>';
}

// 사람마다 색을 하나씩 (제비 주인 표시 · 사다리 경로에 같이 쓴다)
const MG_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// 짧은 알림 (선점 실패 등)
window.mgToast = function(msg) {
    let el = document.getElementById('mg-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mg-toast';
        document.body.appendChild(el);
    }
    el.innerText = msg;
    el.classList.remove('show');
    void el.offsetWidth; // 애니메이션 다시 태우기
    el.classList.add('show');
    clearTimeout(window._mgToastTimer);
    window._mgToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
};

// 선착순 자리 선점.
// 두 명이 같은 순간에 눌러도 서버에서 한 번만 성공한다 (먼저 도착한 쪽이 임자).
function mgClaimSlot(field, idx, onFail) {
    const owners = (window._lastRoomData || {})[field] || {};
    if (owners[idx]) { onFail((owners[idx].name || '누군가') + '님이 이미 가져갔습니다'); return; }
    // 1인 1개
    const mine = Object.keys(owners).find(k => owners[k] && owners[k].id === window.myPlayerId);
    if (mine !== undefined) { onFail('이미 하나 고르셨습니다'); return; }

    const me = {
        id: window.myPlayerId,
        name: (window.players[window.myPlayerId] || {}).name || '?'
    };
    const ref = window.firebaseRef(window.db, 'rooms/' + window.myRoom + '/' + field + '/' + idx);

    if (!window.firebaseRunTransaction) { // 예전 버전을 열어둔 경우 대비
        window.firebaseUpdate(ref, me);
        return;
    }
    window.firebaseRunTransaction(ref, (cur) => (cur === null ? me : undefined))
        .then(res => {
            if (!res.committed) {
                const who = res.snapshot && res.snapshot.val();
                onFail(((who && who.name) || '다른 분') + '님이 한발 빨랐습니다');
            }
        })
        .catch(() => onFail('잠시 후 다시 눌러주세요'));
}

// 다시 그리기 전후로 커서 위치를 기억했다가 되돌려 놓는다
function mgSaveFocus() {
    const el = document.activeElement;
    if (!el || !el.classList || !el.classList.contains('mg-item-input')) return null;
    return { idx: el.getAttribute('data-mg-idx'), start: el.selectionStart, end: el.selectionEnd };
}

function mgRestoreFocus(f) {
    if (!f) return;
    const el = document.querySelector('.mg-item-input[data-mg-idx="' + f.idx + '"]');
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(f.start, f.end); } catch (e) { /* 무시 */ }
}

window.updateMinigames = function(data) {
    const content = document.getElementById('minigames-content');
    if (!content) return;

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
                    </div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div style="text-align:center; margin-top:30px;">
                    <h3 style="color:#fbbf24;">⏳ 방장이 미니게임을 고르고 있습니다...</h3>
                    <p style="color:#94a3b8; margin-top:10px;">(사다리타기, 룰렛 등)</p>

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

    const focus = mgSaveFocus();
    content.innerHTML = gameHtml + backBtn;
    mgRestoreFocus(focus);
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
        initialData.hLines = null;
        initialData.paths = null;
        initialData.ladderOwners = null;
        initialData.ladderShown = null;
        initialData.ladderLast = null;
    } else if (type === 'lots' || type === 'arrow') {
        initialData.items = pKeys.map(id => window.players[id].name);
        initialData.isShuffling = null;
        initialData.shuffledItems = null;
        initialData.lotOwners = null;
    } else if (type === 'roulette') {
        initialData.items = pKeys.map(id => window.players[id].name);
    } else if (type === 'dice') {
        initialData.diceCount = 1;
    } else if (type === 'draw') {
        initialData.drawCount = 1;
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
    }

    return html;
}

// --- 🪜 사다리타기 (Ladder) ---
// 화면 폭에 맞춰 늘어나도록 SVG 안의 좌표계를 고정해 두고 width:100% 로 그린다.
// (예전에는 사람 수만큼 픽셀 폭이 늘어나 가로 스크롤이 생겼다)
const LADDER_VB_W = 1000;
const LADDER_VB_H = 640;
const LADDER_ROWS = 16;      // 가로줄이 놓일 수 있는 층 수 — 많을수록 복잡해진다
const LADDER_DRAW_MS = 2200;

function renderLadder(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#f59e0b; margin-bottom:15px;">🪜 사다리타기</h3>`;

    const items = data.items || [];
    const numCols = items.length;

    if (data.phase === 'setup') {
        html += `<p style="margin-bottom:12px; color:#cbd5e1; font-size:0.9rem;">
                    사다리 <b>아래에 놓일 결과</b>를 먼저 정하세요. <span style="color:#64748b;">(${numCols}칸)</span>
                 </p>
                 <div style="display:flex; flex-direction:column; gap:7px; margin-bottom:15px;">`;
        items.forEach((item, idx) => {
            html += mgItemInputHtml(data.items, idx, { label: (idx + 1) + '번' });
        });
        html += `</div>`;
        if (window.isHost) {
            html += `<button class="btn primary" style="width:100%;" onclick="window.startLadder()">🪜 사다리 생성!</button>`;
        } else {
            html += `<p style="color:#94a3b8; font-size:0.9rem;">방장이 결과를 정하는 중...</p>`;
        }
        html += `</div>`;
        return html;
    }

    // ===== 사다리 화면 =====
    const owners = data.ladderOwners || {};
    const takenCount = Object.keys(owners).length;
    const allTaken = takenCount >= numCols;
    const isResult = data.phase === 'result';
    const myCol = Object.keys(owners).find(k => owners[k] && owners[k].id === window.myPlayerId);
    const iHaveSlot = myCol !== undefined;
    const shown = data.ladderShown || {};
    const colW = LADDER_VB_W / numCols;
    const rowH = LADDER_VB_H / LADDER_ROWS;

    // 안내문
    if (!allTaken) {
        html += `<p style="color:#fbbf24; font-size:0.9rem; margin-bottom:10px;">
                    사다리 위쪽 빈칸을 눌러 자리를 잡으세요 <span style="color:#94a3b8;">(${takenCount}/${numCols}명)</span>
                 </p>`;
    } else if (!isResult) {
        html += `<p style="color:#94a3b8; font-size:0.9rem; margin-bottom:10px;">이름을 누르면 그 사람 길만 따라 내려갑니다</p>`;
    } else {
        html += `<p style="color:#4ade80; font-size:0.9rem; margin-bottom:10px;">결과 공개!</p>`;
    }

    html += `<div class="ladder-wrap">`;

    // --- 위쪽: 자리 ---
    html += `<div class="ladder-row">`;
    for (let i = 0; i < numCols; i++) {
        const o = owners[i];
        const color = MG_COLORS[i % MG_COLORS.length];
        if (o) {
            const isMine = o.id === window.myPlayerId;
            const clickable = allTaken && !isResult;
            html += `<div class="ladder-cell"><div class="ladder-name${isMine ? ' mine' : ''}${clickable ? ' clickable' : ''}"
                          style="background:${color};" ${clickable ? `onclick="window.showLadderPath(${i})"` : ''}>
                        ${mgEsc(o.name)}
                     </div></div>`;
        } else {
            html += `<div class="ladder-cell"><div class="ladder-slot${iHaveSlot ? ' dim' : ''}"
                          ${iHaveSlot ? '' : `onclick="window.claimLadderSlot(${i})"`}>+</div></div>`;
        }
    }
    html += `</div>`;

    // --- 사다리 ---
    html += `<svg class="ladder-svg" viewBox="0 0 ${LADDER_VB_W} ${LADDER_VB_H}" preserveAspectRatio="none">`;
    for (let i = 0; i < numCols; i++) {
        const x = (i + 0.5) * colW;
        html += `<line x1="${x}" y1="0" x2="${x}" y2="${LADDER_VB_H}" stroke="#475569" stroke-width="7" />`;
    }
    (data.hLines || []).forEach(line => {
        const x1 = (line.col + 0.5) * colW;
        const x2 = (line.col + 1.5) * colW;
        const y = line.row * rowH;
        html += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#475569" stroke-width="7" />`;
    });

    // --- 경로 ---
    // 결과 공개면 전부 한 번에, 아니면 눌러서 공개된 것만.
    // 이미 나와 있던 길은 다시 그리지 않는다 (화면이 갱신될 때마다 다시 그려지는 것 방지)
    (data.paths || []).forEach((path, idx) => {
        const reveal = isResult || shown[idx];
        if (!reveal || !owners[idx]) return;

        const pts = path.map(pt => [(pt.col + 0.5) * colW, pt.row * rowH]);
        let d = `M ${pts[0][0]} ${pts[0][1]}`;
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
            d += ` L ${pts[i][0]} ${pts[i][1]}`;
            len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        }
        len = Math.ceil(len) + 12;

        // 방금 누른 것 · 결과 공개는 애니메이션, 이미 나와 있던 길은 그대로 표시
        const animate = isResult || data.ladderLast === idx;
        // var() 는 SVG dash 속성 보간에서 동작하지 않으므로 값을 그대로 써넣는다
        const style = animate
            ? `stroke-dasharray:${len}; stroke-dashoffset:${len}; animation: ladderDraw ${LADDER_DRAW_MS}ms linear forwards;`
            : '';
        html += `<path d="${d}" fill="none" stroke="${MG_COLORS[idx % MG_COLORS.length]}"
                       stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"
                       style="${style}" />`;
    });
    html += `</svg>`;

    // --- 아래쪽: 결과 ---
    html += `<div class="ladder-row">`;
    items.forEach((item, idx) => {
        const isWin = String(item).indexOf('당첨') !== -1;
        // 그 칸에 도착한 사람 (경로가 공개된 경우에만)
        let arrived = null;
        (data.paths || []).forEach((p, i) => {
            if ((isResult || shown[i]) && owners[i] && p[p.length - 1].col === idx) arrived = owners[i];
        });
        const popped = isResult;
        html += `<div class="ladder-cell">
                    <div class="ladder-goal${isWin ? ' win' : ''}${popped ? ' ladder-result' : ''}"
                         ${popped ? `style="animation-delay:${(LADDER_DRAW_MS / 1000).toFixed(2)}s;"` : ''}>
                        ${mgEsc(item)}
                    </div>
                    <div class="ladder-arrived">${arrived ? mgEsc(arrived.name) : ''}</div>
                 </div>`;
    });
    html += `</div>`;
    html += `</div>`; // ladder-wrap

    if (window.isHost) {
        if (!isResult) {
            html += `<div class="btn-row" style="margin-top:16px;">
                        <button class="btn primary wide" ${allTaken ? '' : 'disabled style="opacity:0.5;"'}
                                onclick="window.revealLadderAll()">${allTaken ? '📢 결과 공개!' : '자리가 다 차야 공개됩니다'}</button>
                        <button class="btn secondary" onclick="window.resetLadder()">처음부터</button>
                     </div>`;
        } else {
            html += `<button class="btn secondary" style="width:100%; margin-top:12px;" onclick="window.resetLadder()">처음부터</button>`;
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
        const numCols = (data.items || []).length;
        if (numCols < 2) { window.mgToast('결과가 2개 이상 필요합니다'); return; }

        // 가로줄 — 층마다 여러 개를 놓되 서로 붙지 않게 (붙으면 길이 꼬인다)
        const hLines = [];
        for (let row = 1; row < LADDER_ROWS; row++) {
            let col = 0;
            while (col < numCols - 1) {
                if (Math.random() < 0.45) { hLines.push({ row: row, col: col }); col += 2; }
                else col += 1;
            }
        }

        // 각 칸에서 출발했을 때 어디로 도착하는지 미리 계산
        const paths = [];
        for (let i = 0; i < numCols; i++) {
            const path = [{ row: 0, col: i }];
            let cur = i;
            for (let row = 1; row < LADDER_ROWS; row++) {
                const left = hLines.find(l => l.row === row && l.col === cur - 1);
                const right = hLines.find(l => l.row === row && l.col === cur);
                if (left || right) {
                    path.push({ row: row, col: cur });
                    cur = left ? cur - 1 : cur + 1;
                    path.push({ row: row, col: cur });
                }
            }
            path.push({ row: LADDER_ROWS, col: cur });
            paths.push(path);
        }

        window.firebaseUpdate(roomRef, {
            phase: 'playing',
            hLines: hLines,
            paths: paths,
            ladderOwners: null,
            ladderShown: null,
            ladderLast: null
        });
    });
};

// 위쪽 자리 선점 (선착순 · 1인 1칸)
window.claimLadderSlot = function(col) {
    if (!window.myRoom) return;
    mgClaimSlot('ladderOwners', col, window.mgToast);
};

// 이름을 누르면 그 사람 길만 내려간다
window.showLadderPath = function(col) {
    const d = window._lastRoomData || {};
    if (d.phase === 'result') return;
    if ((d.ladderShown || {})[col]) return; // 이미 나와 있음
    const owners = d.ladderOwners || {};
    if (Object.keys(owners).length < (d.items || []).length) return; // 자리가 다 차야
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        ['ladderShown/' + col]: true,
        ladderLast: col
    });
};

window.revealLadderAll = function() {
    if (!window.isHost) return;
    const d = window._lastRoomData || {};
    if (Object.keys(d.ladderOwners || {}).length < (d.items || []).length) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        phase: 'result',
        ladderLast: null
    });
};

window.resetLadder = function() {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        phase: 'setup', hLines: null, paths: null,
        ladderOwners: null, ladderShown: null, ladderLast: null
    });
};

// --- 🎫 제비뽑기 (Lots) ---
function renderLots(data) {
    let html = `<div class="card" style="text-align:center;">
                    <h3 style="color:#10b981; margin-bottom:15px;">🎫 제비뽑기</h3>`;
                    
    if (data.phase === 'setup') {
        html += `<p style="margin-bottom:12px; color:#cbd5e1; font-size:0.9rem;">제비의 내용을 설정하세요. <span style="color:#64748b;">(${data.items.length}장)</span></p>
                 <div style="display:flex; flex-direction:column; gap:7px; margin-bottom:15px;">`;
        data.items.forEach((item, idx) => {
            html += mgItemInputHtml(data.items, idx, { label: (idx + 1) + '번', removable: true });
        });
        html += `</div>`;
        if (window.isHost) {
            html += `<div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button class="btn secondary" style="flex:1;" onclick="window.addMinigameItem('lots')">+ 제비 추가</button>
                        <button class="btn primary" style="flex:2;" onclick="window.startLotsGame()">제비 섞고 시작!</button>
                     </div>`;
        }
    } else {
        const shuffling = !!data.isShuffling;
        const owners = data.lotOwners || {};
        const ownedCount = Object.keys(owners).length;
        // 섞기가 막 끝난 순간에만 한 번 튕겨준다 (한 장이라도 뽑으면 더는 튕기지 않는다)
        const justSettled = !shuffling && ownedCount === 0;

        const myIdx = Object.keys(owners).find(k => owners[k] && owners[k].id === window.myPlayerId);
        const iHaveOne = myIdx !== undefined;

        if (iHaveOne) {
            html += `<div style="margin-bottom:12px; padding:10px; border-radius:10px; background:rgba(16,185,129,0.15); border:1px solid #10b981;">
                        <span style="color:#6ee7b7; font-size:0.9rem;">내 제비</span>
                        <div style="color:#fff; font-size:1.3rem; font-weight:900;">${mgEsc(data.shuffledItems[myIdx])}</div>
                     </div>`;
        }

        html += `<p style="color:${shuffling ? '#fbbf24' : '#94a3b8'}; font-size:0.9rem; margin-bottom:14px; min-height:1.3em;">
                    ${shuffling ? '🎫 제비를 섞는 중...'
                                : (iHaveOne ? `${ownedCount}/${data.shuffledItems.length}장 뽑힘`
                                            : '카드를 하나 골라 누르세요 (한 사람당 한 장)')}
                 </p>`;

        html += `<div class="lots-board${shuffling ? ' shuffling' : ''}${justSettled ? ' settled' : ''}">`;
        data.shuffledItems.forEach((item, idx) => {
            const owner = owners[idx];
            const taken = !shuffling && !!owner;
            const isMine = taken && owner.id === window.myPlayerId;
            const dim = !shuffling && !taken && iHaveOne;
            html += `<div class="lot-card${taken ? ' taken' : ''}${isMine ? ' mine' : ''}${dim ? ' dim' : ''}"
                          style="animation-delay:${(idx % 6) * 0.07}s;"
                          ${shuffling || taken || iHaveOne ? '' : `onclick="window.revealLot(${idx})"`}>
                        <div class="lot-inner" style="transform: ${taken ? 'rotateY(180deg)' : 'rotateY(0deg)'};">
                            <div class="lot-face lot-back">?</div>
                            <div class="lot-face lot-front">
                                <span class="lot-item">${mgEsc(item)}</span>
                                <span class="lot-owner">${taken ? '🧑 ' + mgEsc(owner.name) : ''}</span>
                            </div>
                        </div>
                     </div>`;
        });
        html += `</div>`;

        if (window.isHost && !shuffling) {
            html += `<div class="btn-row" style="margin-top:14px;">
                        <button class="btn primary wide" onclick="window.startLotsGame()">🔀 다시 섞기</button>
                        <button class="btn secondary" onclick="window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { phase: 'setup', lotOwners: null, shuffledItems: null, isShuffling: null })">내용 수정</button>
                     </div>`;
        }
    }
    
    html += `</div>`;
    return html;
}

const LOTS_SHUFFLE_MS = 1800;

window.startLotsGame = function() {
    if (!window.isHost) return;
    const round = newMiniRound();
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseGet(roomRef).then(snapshot => {
        const data = snapshot.val();
        // 제대로 된 섞기 (sort(() => Math.random() - 0.5) 는 자리마다 확률이 다르다)
        const shuffled = [...data.items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }
        window.firebaseUpdate(roomRef, {
            phase: 'playing',
            shuffledItems: shuffled,
            lotOwners: null,
            isShuffling: true
        });

        // 섞이는 모습을 보여준 뒤 뽑을 수 있게 연다
        window._miniTimer = setTimeout(() => {
            if (window._miniRound !== round) return; // 그 사이 다시 섞었으면 무시
            window.firebaseUpdate(roomRef, { isShuffling: false });
        }, LOTS_SHUFFLE_MS);
    });
};

window.revealLot = function(idx) {
    if (!window.myRoom) return;
    if (window._lastRoomData && window._lastRoomData.isShuffling) return; // 섞는 중에는 못 연다
    mgClaimSlot('lotOwners', idx, window.mgToast);
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
                        ${mgItemInputHtml(data.items, idx, { label: (idx + 1) + '칸', removable: true })}
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
                        ${mgItemInputHtml(data.items, idx, { label: (idx + 1) + '번', removable: true })}
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
