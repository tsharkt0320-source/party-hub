// buzzer.js — 🚨 부저만 사용
// 퀴즈 안의 한 모드였던 것을 독립 게임으로 꺼냈다.
// 점수는 퀴즈와 같은 칸(globalScores / teamBonus)을 쓰므로 두 게임을 오가도 이어진다.

window._bzRound = 0;

// 리셋을 연달아 누르면 이전 카운트다운이 뒤늦게 '시작'을 써버릴 수 있다.
// 라운드 번호를 확인해서 지난 예약은 버린다. (마피아·라이어·퀴즈와 같은 방식)
function bzNewRound() {
    window._bzRound = (window._bzRound || 0) + 1;
    if (window._bzIv) { clearInterval(window._bzIv); window._bzIv = null; }
    return window._bzRound;
}

function bzEsc(s) {
    return (window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
}

function bzRoomRef() {
    return window.firebaseRef(window.db, 'rooms/' + window.myRoom);
}

// 들어온 순서대로 (자리가 매번 바뀌면 누가 눌렀는지 찾기 어렵다)
function bzPlayerIds() {
    const p = window.players || {};
    return Object.keys(p).sort((a, b) =>
        ((p[a] || {}).joinedAt || 0) - ((p[b] || {}).joinedAt || 0) || (a < b ? -1 : 1)
    );
}

// 팀 점수 = 팀원 개인 점수 합 + 방장이 직접 올린 보정치
function bzTeamTotals(data) {
    const scores = data.globalScores || {};
    const teams = data.globalTeams || {};
    const bonus = data.teamBonus || {};
    let a = Number(bonus.A) || 0;
    let b = Number(bonus.B) || 0;
    Object.keys(scores).forEach(pid => {
        if ((teams[pid] || 'A') === 'A') a += (scores[pid] || 0);
        else b += (scores[pid] || 0);
    });
    return { a: a, b: b };
}
window.bzTeamTotals = bzTeamTotals;

function bzAdjHtml(target) {
    return '<div class="bz-adj">' +
           '<button onclick="window.bzScore(\'' + target + '\', -1)">−</button>' +
           '<button onclick="window.bzScore(\'' + target + '\', 1)">＋</button>' +
           '</div>';
}

window.updateBuzzer = function(data) {
    const el = document.getElementById('buzzer-content');
    if (!el) return;

    const mode = (data.bz_mode === 'solo') ? 'solo' : 'team';
    const winner = data.bz_winner || null;
    const cd = data.bz_countdown || 0;
    const active = !!data.bz_active;
    const host = !!window.isHost;
    const ids = bzPlayerIds();
    let html = '';

    // --- 팀전 / 개인전 ---
    if (host) {
        html += '<div class="bz-modes">' +
                '<button class="bz-mode' + (mode === 'team' ? ' on' : '') + '" onclick="window.bzSetMode(\'team\')">👥 팀전</button>' +
                '<button class="bz-mode' + (mode === 'solo' ? ' on' : '') + '" onclick="window.bzSetMode(\'solo\')">🙋 개인전</button>' +
                '</div>';
    }

    if (mode === 'team') {
        // --- 팀 점수 ---
        const t = bzTeamTotals(data);
        const box = (key, name, score, color, bg) =>
            '<div class="bz-team" style="background:' + bg + '; border:1px solid ' + color + ';">' +
                '<div class="bz-tname" style="color:' + color + ';">' + bzEsc(name) + '</div>' +
                '<div class="bz-tscore" style="color:' + color + ';">' + score + '</div>' +
                (host ? bzAdjHtml(key) : '') +
            '</div>';
        html += '<div class="bz-teams">' +
                box('A', data.teamAName || 'A팀', t.a, '#60a5fa', 'rgba(59,130,246,0.18)') +
                box('B', data.teamBName || 'B팀', t.b, '#f87171', 'rgba(239,68,68,0.18)') +
                '</div>';

        // --- 참여자 부저 (이름 앞에 램프) ---
        html += '<div class="bz-chips">';
        ids.forEach(id => {
            const hit = (winner === id);
            const teamColor = ((data.globalTeams || {})[id] || 'A') === 'A' ? '#60a5fa' : '#f87171';
            html += '<div class="bz-chip' + (hit ? ' hit' : '') + '">' +
                        '<span class="bz-lamp' + (hit ? ' on' : '') + '"></span>' +
                        '<span style="color:' + teamColor + '; font-size:0.7rem;">●</span>' +
                        bzEsc((window.players[id] || {}).name || '?') +
                        (id === window.myPlayerId ? '<b style="color:#fbbf24;"> (나)</b>' : '') +
                    '</div>';
        });
        html += '</div>';
    } else {
        // --- 개인 점수 + 부저를 한 줄에 ---
        const scores = data.globalScores || {};
        html += '<div class="bz-rows">';
        ids.forEach(id => {
            const hit = (winner === id);
            html += '<div class="bz-row' + (hit ? ' hit' : '') + '">' +
                        '<span class="bz-lamp' + (hit ? ' on' : '') + '"></span>' +
                        '<span class="bz-nm">' + bzEsc((window.players[id] || {}).name || '?') +
                            (id === window.myPlayerId ? '<b style="color:#fbbf24;"> (나)</b>' : '') +
                        '</span>' +
                        '<span class="bz-sc">' + (scores[id] || 0) + '</span>' +
                        (host ? bzAdjHtml(id) : '') +
                    '</div>';
        });
        html += '</div>';
    }

    // --- 부저 무대 ---
    if (cd > 0) {
        html += '<div class="bz-stage bz-wait">' +
                    '<div class="bz-cd">' + cd + '</div>' +
                    '<div style="color:#94a3b8; font-size:0.85rem;">부저 준비...</div>' +
                '</div>';
    } else if (winner) {
        html += '<div class="bz-stage bz-hit">' +
                    '<div style="font-size:2rem; line-height:1;">🚨</div>' +
                    '<div class="bz-wname">' + bzEsc((window.players[winner] || {}).name || '누군가') + '</div>' +
                    '<div style="color:#fecaca; font-size:0.95rem;">눌렀습니다!</div>' +
                '</div>';
    } else if (active) {
        html += '<button class="bz-press" onclick="window.bzPress()">🚨</button>';
    } else {
        html += '<button class="bz-press" disabled>대기 중</button>';
    }

    // --- 방장 조작 ---
    if (host) {
        html += '<button class="btn primary bz-reset" onclick="window.bzReset()">🔄 부저 리셋</button>';
        html += '<details class="host-tools" style="margin-top:8px;">' +
                    '<summary>🧹 점수 초기화</summary>' +
                    '<div class="tool-body">' +
                        '<button class="btn secondary" onclick="window.bzResetScores()">모든 점수를 0으로</button>' +
                    '</div>' +
                '</details>';
    }

    el.innerHTML = html;
};

// === 조작 ===

window.bzSetMode = function(mode) {
    if (!window.isHost) return;
    window.firebaseUpdate(bzRoomRef(), { bz_mode: (mode === 'solo' ? 'solo' : 'team') });
};

window.bzPress = function() {
    const d = window._lastRoomData || {};
    if (!d.bz_active || d.bz_winner) return; // 이미 늦었다
    window.firebaseUpdate(bzRoomRef(), {
        bz_winner: window.myPlayerId,
        bz_active: false
    });
};

window.bzReset = function() {
    if (!window.isHost) return;
    const round = bzNewRound();
    const roomRef = bzRoomRef();
    window.firebaseUpdate(roomRef, { bz_countdown: 3, bz_active: false, bz_winner: null });

    window._bzIv = setInterval(() => {
        if (window._bzRound !== round) { clearInterval(window._bzIv); return; }
        const c = ((window._lastRoomData || {}).bz_countdown || 0) - 1;
        if (c <= 0) {
            clearInterval(window._bzIv); window._bzIv = null;
            window.firebaseUpdate(roomRef, { bz_countdown: 0, bz_active: true });
        } else {
            window.firebaseUpdate(roomRef, { bz_countdown: c });
        }
    }, 1000);
};

window.bzScore = function(target, delta) {
    if (!window.isHost) return;
    const d = window._lastRoomData || {};
    const base = 'rooms/' + window.myRoom;
    const patch = {};
    if (target === 'A' || target === 'B') {
        patch[target] = (Number((d.teamBonus || {})[target]) || 0) + delta;
        window.firebaseUpdate(window.firebaseRef(window.db, base + '/teamBonus'), patch);
    } else {
        patch[target] = ((d.globalScores || {})[target] || 0) + delta;
        window.firebaseUpdate(window.firebaseRef(window.db, base + '/globalScores'), patch);
    }
};

window.bzResetScores = function() {
    if (!window.isHost) return;
    window.firebaseUpdate(bzRoomRef(), { globalScores: null, individualScores: null, teamBonus: null });
};
