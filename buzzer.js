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

// ===== 아래 두 개는 '단체 게임 모음집'의 부저에서도 같이 쓴다 =====

// 팀 상자 + 그 안의 사람들 + 이름 앞 부저 램프
// opts: { winner, showScore, showAdjust, activeTeam, describers, note }
window.bzTeamBoxesHtml = function(data, opts) {
    opts = opts || {};
    const winner = opts.winner || null;
    const describers = opts.describers || {};
    const teams = data.globalTeams || {};
    const members = { A: [], B: [] };
    bzPlayerIds().forEach(id => { members[teams[id] === 'B' ? 'B' : 'A'].push(id); });
    const t = bzTeamTotals(data);

    const memberHtml = (id) => {
        const hit = (winner === id);
        const isDesc = !!describers[id];
        return '<div class="bz-mem-row' + (hit ? ' hit' : '') + '">' +
                   '<span class="bz-lamp' + (hit ? ' on' : '') + '"></span>' +
                   '<span class="bz-nm">' + bzEsc((window.players[id] || {}).name || '?') +
                       (id === window.myPlayerId ? '<b style="color:#facc15;"> (나)</b>' : '') +
                   '</span>' +
                   (isDesc ? '<span class="bz-desc-badge">🎭</span>' : '') +
               '</div>';
    };

    const box = (key, name, score, color, bg) => {
        const dim = opts.activeTeam && opts.activeTeam !== key;
        return '<div class="bz-team' + (dim ? ' dim' : '') + '"' +
                   ' style="background:' + bg + '; border:1.5px solid ' + color + ';">' +
                   '<div class="bz-tname" style="color:' + color + ';">' + bzEsc(name) +
                       (opts.activeTeam === key ? ' <span style="color:#facc15;">▶</span>' : '') +
                   '</div>' +
                   (opts.showScore ? '<div class="bz-tscore" style="color:' + color + ';">' + score + '</div>' : '') +
                   (opts.showAdjust ? bzAdjHtml(key) : '') +
                   '<div class="bz-mem">' +
                       (members[key].length
                           ? members[key].map(memberHtml).join('')
                           : '<div class="bz-mem-empty">비어 있음</div>') +
                   '</div>' +
               '</div>';
    };

    return '<div class="bz-teams">' +
               box('A', data.teamAName || 'A팀', t.a, '#60a5fa', 'rgba(59,130,246,0.16)') +
               box('B', data.teamBName || 'B팀', t.b, '#f87171', 'rgba(239,68,68,0.16)') +
           '</div>';
};

// 부저를 누르는 자리 (카운트다운 → 버튼 → 누른 사람 표시)
// o: { openAt, winner, canPress, note, pressFn }
//
// 카운트다운은 서버에서 숫자를 받아 그리지 않는다. 그러면 방장 화면이
// 먼저 바뀌어 방장만 먼저 누를 수 있게 된다. '언제 열린다'는 시각만
// 공유하고, 남은 시간은 각 기기가 스스로 계산한다.
function bzStageInner(o) {
    const left = o.openAt ? Math.max(0, o.openAt - window.serverNow()) : 0;
    if (!o.winner && left > 0) {
        return '<div class="bz-stage bz-wait">' +
                   '<div class="bz-cd">' + Math.ceil(left / 1000) + '</div>' +
                   '<div style="color:#94a3b8; font-size:0.85rem;">부저 준비...</div>' +
               '</div>';
    }
    if (o.winner) {
        return '<div class="bz-stage bz-hit">' +
                   '<div style="font-size:2rem; line-height:1;">🚨</div>' +
                   '<div class="bz-wname">' + bzEsc((window.players[o.winner] || {}).name || '누군가') + '</div>' +
                   '<div style="color:#fde68a; font-size:0.95rem;">눌렀습니다!</div>' +
               '</div>';
    }
    if (o.canPress) {
        return '<button class="bz-press" onclick="' + (o.pressFn || 'window.bzPress()') + '">🚨</button>';
    }
    return '<button class="bz-press" disabled>' + bzEsc(o.note || '대기 중') + '</button>';
}

// 지금 무엇을 그려야 하는지 나타내는 짧은 값.
// 이게 바뀔 때만 화면을 갈아끼워 누르는 순간에 버튼이 사라지지 않게 한다.
function bzStageKey(o) {
    const left = o.openAt ? Math.max(0, o.openAt - window.serverNow()) : 0;
    if (!o.winner && left > 0) return 'cd' + Math.ceil(left / 1000);
    if (o.winner) return 'w' + o.winner;
    return o.canPress ? 'press' : 'note';
}

window.bzStageHtml = function(o) {
    window._bzStageOpts = o;
    window._bzStageKey = bzStageKey(o);
    if (!window._bzStageIv) {
        window._bzStageIv = setInterval(() => {
            const slot = document.getElementById('bz-stage-slot');
            const opts = window._bzStageOpts;
            if (!slot || !opts) return;
            const k = bzStageKey(opts);
            if (k === window._bzStageKey) return;
            window._bzStageKey = k;
            slot.innerHTML = bzStageInner(opts);
            // 40ms 간격. 이 간격이 곧 기기 간 오차의 상한이 된다.
        }, 40);
    }
    return '<div id="bz-stage-slot">' + bzStageInner(o) + '</div>';
};

window.updateBuzzer = function(data) {
    const el = document.getElementById('buzzer-content');
    if (!el) return;

    const mode = (data.bz_mode === 'solo') ? 'solo' : 'team';
    const winner = data.bz_winner || null;
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
        html += window.bzTeamBoxesHtml(data, {
            winner: winner,
            showScore: true,
            showAdjust: host
        });
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
    html += window.bzStageHtml({
        openAt: data.bz_openAt || 0,
        winner: winner,
        canPress: true,
        pressFn: 'window.bzPress()'
    });

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
    if (d.bz_winner) return;                                   // 이미 늦었다
    if (!d.bz_openAt || window.serverNow() < d.bz_openAt) return;  // 아직 안 열렸다
    bzClaim(window.myPlayerId);
};

// 두 사람이 동시에 눌러도 서버에 먼저 닿은 한 명만 이긴다.
// 그냥 쓰면 나중에 도착한 쪽이 앞사람을 덮어써서 오히려 느린 사람이 이긴다.
function bzClaim(id) {
    window.firebaseRunTransaction(
        window.firebaseRef(window.db, 'rooms/' + window.myRoom + '/bz_winner'),
        (cur) => (cur === null ? id : undefined)     // 이미 있으면 포기
    );
}

window.bzReset = function() {
    if (!window.isHost) return;
    bzNewRound();
    // 1초마다 숫자를 서버에 써서 알리던 것을 없앴다.
    // 열리는 시각 하나만 정해 두면 모두가 같은 순간에 열린다.
    window.firebaseUpdate(bzRoomRef(), {
        bz_openAt: window.serverNow() + 3000,
        bz_winner: null,
        bz_countdown: 0, bz_active: false   // 옛 값 정리
    });
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
