// app.js

// Global State
let myRoom = null;
let myPlayerId = null;
let myUid = null;        // 익명 로그인이 발급한 출입증 ID (게임용 playerId와는 별개)
let myNickname = '';
let isHost = false;
let players = {};
let gameState = null; // "lobby", "mafia", "liar", "quiz"

// DOM Elements
const screens = {
    home: document.getElementById('screen-home'),
    create: document.getElementById('screen-create'),
    join: document.getElementById('screen-join'),
    lobby: document.getElementById('screen-lobby'),
    mafia: document.getElementById('screen-mafia'),
    liar: document.getElementById('screen-liar'),
    quiz: document.getElementById('screen-quiz'),
    minigames: document.getElementById('screen-minigames'),
    buzzer: document.getElementById('screen-buzzer')
};

const navCreate = document.getElementById('nav-create');
const navJoin = document.getElementById('nav-join');
const navBacks = document.querySelectorAll('.nav-back');

const createNickname = document.getElementById('create-nickname');
const joinNickname = document.getElementById('join-nickname');
const joinRoomCode = document.getElementById('join-roomcode');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const createError = document.getElementById('create-error');
const joinError = document.getElementById('join-error');
const lobbyRoomCodeDisplay = document.querySelector('#lobby-room-code-display span');
const playerList = document.getElementById('player-list');
const playerCount = document.getElementById('player-count');
const gameButtons = document.querySelectorAll('.game-btn');
const backButtons = document.querySelectorAll('.back-to-lobby');

// Helper: Show Screen
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Generate random 4 digit room code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 이미 쓰이고 있는 코드는 피해서 생성 (초대 링크가 엉뚱한 방으로 가는 것 방지)
async function generateUniqueRoomCode() {
    for (let i = 0; i < 10; i++) {
        const code = generateRoomCode();
        const snap = await window.firebaseGet(window.firebaseRef(window.db, 'rooms/' + code));
        if (!snap.exists()) return code;
    }
    return null;
}

// 닉네임 등 사용자 입력을 innerHTML에 넣기 전 이스케이프
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}
window.escapeHtml = escapeHtml;

// ===== 초대 링크 =====
function getInviteUrl(code) {
    return `${location.origin}${location.pathname}?room=${code}`;
}

function showInviteToast(msg) {
    const el = document.getElementById('invite-toast');
    if (!el) return;
    el.innerText = msg;
    el.style.display = 'block';
    clearTimeout(window._inviteToastTimer);
    window._inviteToastTimer = setTimeout(() => { el.style.display = 'none'; }, 2500);
}

window.copyInvite = async function() {
    if (!myRoom) return;
    const url = getInviteUrl(myRoom);
    try {
        await navigator.clipboard.writeText(url);
        showInviteToast('✅ 초대 링크를 복사했습니다!');
    } catch (e) {
        // clipboard API를 못 쓰는 환경 대비
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showInviteToast('✅ 초대 링크를 복사했습니다!');
        } catch (e2) {
            showInviteToast('복사에 실패했어요. 위 주소를 길게 눌러 복사해 주세요.');
        }
        document.body.removeChild(ta);
    }
};

window.shareInvite = async function() {
    if (!myRoom) return;
    const url = getInviteUrl(myRoom);
    if (navigator.share) {
        try {
            await navigator.share({
                title: '파티 허브',
                text: `🎉 파티 허브 ${myRoom}번 방에 들어와! 링크 누르면 바로 입장돼.`,
                url: url
            });
            return;
        } catch (e) {
            if (e && e.name === 'AbortError') return; // 사용자가 공유창을 닫은 경우
        }
    }
    // 공유 API가 없으면 복사로 대체 (PC 브라우저 등)
    window.copyInvite();
};

// QR 라이브러리는 버튼을 눌렀을 때만 불러온다
let qrLibPromise = null;
function loadQrLib() {
    if (window.qrcode) return Promise.resolve();
    if (qrLibPromise) return qrLibPromise;
    qrLibPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
    return qrLibPromise;
}

window.toggleQr = function() {
    const area = document.getElementById('qr-area');
    if (!area || !myRoom) return;
    if (area.dataset.open === '1') {
        area.dataset.open = '0';
        area.innerHTML = '';
        return;
    }
    area.dataset.open = '1';
    area.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">QR 생성 중...</p>';
    loadQrLib().then(() => {
        const qr = window.qrcode(0, 'M');
        qr.addData(getInviteUrl(myRoom));
        qr.make();
        area.innerHTML = `<div style="background:white; padding:12px; border-radius:12px; display:inline-block; line-height:0;">
                            ${qr.createSvgTag({ cellSize: 5, margin: 0 })}
                          </div>
                          <p style="color:#94a3b8; font-size:0.8rem; margin-top:8px;">카메라로 찍으면 바로 입장돼요</p>`;
    }).catch(() => {
        area.innerHTML = '<p style="color:#f87171; font-size:0.85rem;">QR을 만들지 못했어요. 링크 복사를 이용해 주세요.</p>';
    });
};

function renderInviteBox(code) {
    const urlEl = document.getElementById('invite-url');
    if (urlEl) urlEl.innerText = getInviteUrl(code);
    const area = document.getElementById('qr-area');
    if (area) { area.dataset.open = '0'; area.innerHTML = ''; }
}

// Navigation
navCreate.addEventListener('click', () => showScreen('create'));
navJoin.addEventListener('click', () => showScreen('join'));
navBacks.forEach(btn => btn.addEventListener('click', () => {
    showScreen('home');
    createError.innerText = '';
    joinError.innerText = '';
    // 초대 링크로 들어온 상태를 초기화
    const banner = document.getElementById('invite-banner');
    if (banner) banner.style.display = 'none';
    joinRoomCode.readOnly = false;
    joinRoomCode.style.opacity = '1';
    history.replaceState(null, null, location.origin + location.pathname);
}));

// ===== 홈 화면 앱(PWA) =====
// 서비스 워커는 캐시를 하지 않는다. 설치 가능 조건을 만족시키는 용도일 뿐이다.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => { /* http 등에서는 무시 */ });
    });
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

let deferredInstall = null;

// 안드로이드 · 크롬: 설치 가능해지면 이 이벤트가 온다
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    const box = document.getElementById('install-box');
    if (box && !isStandalone()) box.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
    const box = document.getElementById('install-box');
    if (box) box.style.display = 'none';
    deferredInstall = null;
});

// 아이폰 사파리는 위 이벤트가 없어서 직접 안내해야 한다
function setupInstallUi() {
    const box = document.getElementById('install-box');
    const btn = document.getElementById('btn-install');
    const hint = document.getElementById('install-hint');
    if (!box || !btn || !hint) return;
    if (isStandalone()) return; // 이미 앱으로 실행 중

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;

    if (isIOS) {
        box.style.display = 'block';
        btn.onclick = () => {
            hint.innerHTML = '아이폰에서는 아래 순서로 추가합니다.<br><br>' +
                             '1. 사파리 아래쪽 <b>공유 버튼</b>(⬆️) 누르기<br>' +
                             '2. 목록에서 <b>홈 화면에 추가</b> 선택<br>' +
                             '3. 오른쪽 위 <b>추가</b> 누르기';
            hint.style.display = 'block';
        };
        return;
    }

    btn.onclick = async () => {
        if (!deferredInstall) {
            hint.innerHTML = '브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 ' +
                             '<b>홈 화면에 추가</b>를 선택해 주세요.';
            hint.style.display = 'block';
            return;
        }
        deferredInstall.prompt();
        try { await deferredInstall.userChoice; } catch (e) {}
        deferredInstall = null;
    };
}
setupInstallUi();

// ===== 세션 기억 (폰이 꺼지거나 새로고침돼도 같은 사람으로 복귀) =====
// playerId를 그대로 되살려야 미사일 기록 · 퀴즈 점수 · 팀 배정이 다시 본인에게 붙는다.
const SESSION_KEY = 'partyhub_session';
const SESSION_TTL = 6 * 60 * 60 * 1000; // 6시간

function saveSession() {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            room: myRoom, playerId: myPlayerId, nickname: myNickname, ts: Date.now()
        }));
    } catch (e) { /* 시크릿 모드 등 */ }
}

function loadSession() {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (!s || !s.room || !s.playerId) return null;
        if (Date.now() - (s.ts || 0) > SESSION_TTL) { clearSession(); return null; }
        return s;
    } catch (e) { return null; }
}

function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

// 스스로 나가는 경우 — 자동 복귀가 되면 안 되므로 세션을 지운다
async function leaveRoomCleanly() {
    clearSession();
    if (myRoom && myPlayerId && window.db) {
        const pRef = window.firebaseRef(window.db, 'rooms/' + myRoom + '/players/' + myPlayerId);
        try { await window.firebaseOnDisconnect(pRef).cancel(); } catch (e) {}
        try { await window.firebaseRemove(pRef); } catch (e) {}
    }
    window.location.href = location.origin + location.pathname;
}

document.querySelectorAll('.leave-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("정말 방에서 나가시겠습니까?\n(방은 그대로 남고 기록도 보존됩니다)")) {
            leaveRoomCleanly();
        }
    });
});

// Firebase Check
function checkFirebase(errorEl) {
    if (!window.db) {
        errorEl.innerText = "Firebase 설정이 필요합니다.";
        return false;
    }
    return true;
}

// Create Room
btnCreateRoom.addEventListener('click', async () => {
    if (!checkFirebase(createError)) return;
    const nickname = createNickname.value.trim();
    if (!nickname) { createError.innerText = "닉네임을 입력해주세요."; return; }
    
    btnCreateRoom.disabled = true;
    createError.innerText = '';
    myRoom = await generateUniqueRoomCode();
    btnCreateRoom.disabled = false;
    if (!myRoom) { createError.innerText = "방 코드를 만들지 못했습니다. 다시 시도해 주세요."; return; }

    myPlayerId = "host_" + Date.now();
    isHost = true;
    document.body.classList.add('is-host');
    
    window.myRoom = myRoom;
    window.myPlayerId = myPlayerId;
    window.isHost = isHost;
    
    const roomRef = window.firebaseRef(window.db, 'rooms/' + myRoom);

    await window.firebaseSet(roomRef, {
        state: 'lobby',
        hostId: myPlayerId,
        hostUid: myUid,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        players: {
            [myPlayerId]: { name: nickname, isHost: true, joinedAt: Date.now(), uid: myUid }
        }
    });

    joinRoomLogic(myRoom, nickname);
    sweepOldRooms(); // 방을 새로 만들 때 버려진 옛 방을 함께 정리 (기다리지 않음)
});

// Join Room
btnJoinRoom.addEventListener('click', async () => {
    if (!checkFirebase(joinError)) return;
    const nickname = joinNickname.value.trim();
    const code = joinRoomCode.value.trim();
    
    if (!nickname) { joinError.innerText = "닉네임을 입력해주세요."; return; }
    if (!code || code.length !== 4) { joinError.innerText = "올바른 4자리 방 코드를 입력해주세요."; return; }

    const roomRef = window.firebaseRef(window.db, 'rooms/' + code);
    const snapshot = await window.firebaseGet(roomRef);
    
    if (snapshot.exists()) {
        // 같은 닉네임이 있으면 투표 · 팀 · 기록에서 누가 누군지 구분할 수 없게 된다
        const takenNames = Object.values(snapshot.val().players || {}).map(p => (p.name || '').trim());
        if (takenNames.includes(nickname)) {
            joinError.innerText = `"${nickname}" 닉네임은 이미 사용 중입니다. 다른 닉네임을 입력해 주세요.`;
            return;
        }

        myRoom = code;
        myPlayerId = "guest_" + Date.now();
        isHost = false;
        document.body.classList.remove('is-host');
        
        window.myRoom = myRoom;
        window.myPlayerId = myPlayerId;
        window.isHost = isHost;
        
        await window.firebaseUpdate(window.firebaseChild(roomRef, 'players'), {
            [myPlayerId]: { name: nickname, isHost: false, joinedAt: Date.now(), uid: myUid }
        });
        await window.firebaseUpdate(roomRef, { lastActiveAt: Date.now() });

        joinRoomLogic(myRoom, nickname);
    } else {
        joinError.innerText = "존재하지 않는 방입니다.";
    }
});

// ===== 비밀 정보 구독 =====
// 마피아 직업 · 라이어 제시어는 더 이상 방 노드에 들어있지 않다.
// 방장은 secret 전체를, 나머지는 자기 봉투(private/내uid)만 받는다. 규칙으로 강제된다.
let secretUnsub = null;

function rerenderActiveGame() {
    const data = window._lastRoomData;
    if (!data) return;
    if (gameState === 'mafia' && typeof window.updateMafia === 'function') window.updateMafia(data);
    if (gameState === 'liar' && typeof window.updateLiar === 'function') window.updateLiar(data);
}

function subscribeMyPrivate(code) {
    if (!myUid) return; // 출입증이 없으면 예전처럼 공개 데이터로 동작 (하위 호환)
    window.firebaseOnValue(
        window.firebaseRef(window.db, 'privates/' + code + '/' + myUid),
        (snap) => { window._myPrivate = snap.val() || {}; rerenderActiveGame(); },
        () => { window._myPrivate = {}; }
    );
}

// 방장일 때만 secret을 구독한다. 방장이 바뀌면 구독도 따라 옮겨간다.
function updateSecretSubscription() {
    if (!myRoom || !myUid) return;
    if (isHost && !secretUnsub) {
        secretUnsub = window.firebaseOnValue(
            window.firebaseRef(window.db, 'secrets/' + myRoom),
            (snap) => { window._secret = snap.val() || {}; rerenderActiveGame(); },
            () => { window._secret = {}; }
        );
    } else if (!isHost && secretUnsub) {
        secretUnsub();
        secretUnsub = null;
        window._secret = null;
        window._pushedNotes = {};
    }
}

// 연결이 끊기면 서버가 내 항목만 지우도록 예약한다.
// beforeunload와 달리 폰 잠금 · 배터리 방전 · 앱 강제종료에서도 동작한다.
function registerDisconnect() {
    if (!myRoom || !myPlayerId || !window.firebaseOnDisconnect) return;
    const pRef = window.firebaseRef(window.db, 'rooms/' + myRoom + '/players/' + myPlayerId);
    try { window.firebaseOnDisconnect(pRef).remove(); } catch (e) {}
}

// 방장이 사라졌을 때 남은 사람 중 가장 먼저 들어온 사람이 이어받는다.
// 모든 클라이언트가 똑같은 기준으로 계산하므로 한 명만 자기 차례라고 판단한다.
const HOST_GRACE_MS = 12000; // 새로고침 정도로는 방장을 뺏기지 않도록 유예

function maybeClaimHost(data) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + myRoom);
    const ps = data.players || {};

    if (data.hostId && ps[data.hostId]) {
        // 방장이 계속 있거나 돌아왔음 → 유예 타이머 해제
        if (data.hostGoneAt) window.firebaseUpdate(roomRef, { hostGoneAt: null });
        return;
    }

    const candidates = Object.keys(ps).filter(id => !ps[id].isBot);
    if (candidates.length === 0) return;
    candidates.sort((a, b) => {
        const ta = parseInt(String(a).split('_')[1], 10) || 0;
        const tb = parseInt(String(b).split('_')[1], 10) || 0;
        return ta - tb || (a < b ? -1 : 1);
    });
    if (candidates[0] !== myPlayerId) return;

    // 방장이 새로고침 중일 수 있으니 잠시 기다렸다가 넘겨받는다
    if (!data.hostGoneAt) {
        window.firebaseUpdate(roomRef, { hostGoneAt: Date.now() });
        return;
    }
    const waited = Date.now() - data.hostGoneAt;
    if (waited >= 0 && waited < HOST_GRACE_MS) {
        // 방에 다른 변화가 없으면 onValue가 다시 안 오므로 직접 재확인 예약
        clearTimeout(window._hostGraceTimer);
        window._hostGraceTimer = setTimeout(() => {
            window.firebaseGet(roomRef).then(s => { if (s.exists()) maybeClaimHost(s.val()); });
        }, HOST_GRACE_MS - waited + 500);
        return;
    }

    const updates = { hostId: myPlayerId, hostUid: myUid, hostGoneAt: null, lastActiveAt: Date.now() };
    updates['players/' + myPlayerId + '/isHost'] = true;
    window.firebaseUpdate(roomRef, updates);
}

// 이전 방장의 타이머(setTimeout)가 함께 사라져 굳어버린 상태를 푼다.
// 룰렛이 도는 중, 부저 카운트다운 중 등에 방장이 끊기면 영원히 멈춰 있게 되기 때문.
function unstickRoom(data) {
    const fix = {};
    if (data.isSpinning) fix.isSpinning = false;
    if (data.isRolling) fix.isRolling = false;
    if (data.isDrawing) fix.isDrawing = false;
    if (data.isCountingDown) { fix.isCountingDown = null; fix.countdownMsg = null; }
    if (data.buzzer_countdown) { fix.buzzer_countdown = 0; fix.buzzer_active = true; }
    if (data.words4_timer) fix.words4_timer = 0;
    if (Object.keys(fix).length === 0) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), fix);
}

function applyHostState(nextIsHost) {
    if (nextIsHost === isHost) return false;
    isHost = nextIsHost;
    window.isHost = isHost;
    document.body.classList.toggle('is-host', isHost);
    return true;
}

function renderHostTransfer() {
    const sel = document.getElementById('host-transfer-select');
    if (!sel || !isHost) return;
    const others = Object.keys(players).filter(id => id !== myPlayerId && !players[id].isBot);
    sel.innerHTML = '<option value="">넘길 사람 선택...</option>' +
        others.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(players[id].name)}</option>`).join('');
    sel.onchange = function() {
        const target = this.value;
        this.value = '';
        if (!target || !players[target]) return;
        if (!confirm(`${players[target].name}님에게 방장을 넘기시겠습니까?`)) return;
        const updates = { hostId: target, hostUid: players[target].uid || null };
        updates['players/' + target + '/isHost'] = true;
        updates['players/' + myPlayerId + '/isHost'] = false;
        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), updates);
    };
}

// Room Logic
function joinRoomLogic(code, nickname) {
    myNickname = nickname;
    showScreen('lobby');
    lobbyRoomCodeDisplay.innerText = code;

    // 주소창을 초대 링크로 맞춰준다 (주소 복사만 해도 초대가 되도록)
    history.replaceState(null, null, getInviteUrl(code));
    renderInviteBox(code);
    saveSession();
    registerDisconnect();
    subscribeMyPrivate(code);

    // 뒤로가기 방지 로직 (모바일 폰)
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function(event) {
        if (confirm("정말 방에서 나가시겠습니까?\n(방은 그대로 남고 기록도 보존됩니다)")) {
            leaveRoomCleanly();
        } else {
            // 취소를 누르면 다시 현재 페이지 상태를 푸시하여 나가지 못하게 함
            history.pushState(null, null, location.href);
        }
    });

    const roomRef = window.firebaseRef(window.db, 'rooms/' + code);

    // Listen for state and player changes
    window.firebaseOnValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            // 방이 정말로 사라진 경우 (24시간 정리 등)
            alert("방이 종료되었습니다.");
            clearSession();
            window.location.href = location.origin + location.pathname;
            return;
        }

        players = data.players || {};

        // 네트워크가 잠깐 끊겨 내 항목이 지워졌으면 같은 ID로 다시 들어간다.
        // ID가 같아야 기록 · 점수 · 팀이 그대로 나에게 붙는다.
        if (myPlayerId && !players[myPlayerId]) {
            window.firebaseUpdate(
                window.firebaseRef(window.db, 'rooms/' + code + '/players/' + myPlayerId),
                { name: myNickname, isHost: data.hostId === myPlayerId, joinedAt: Date.now(), uid: myUid }
            );
            registerDisconnect(); // onDisconnect는 한 번 발동하면 소멸하므로 다시 예약
            return;
        }

        window.players = players; // Expose to window for external scripts
        window._isCaptain = (data.captain === myPlayerId);

        window._lastRoomData = data;

        maybeClaimHost(data);
        if (applyHostState(data.hostId === myPlayerId) && isHost) {
            unstickRoom(data); // 방금 방장을 이어받았다면 멈춘 상태를 풀어준다
        }
        updateSecretSubscription();

        updatePlayerList();
        renderTeamPicker(data);
        renderHostTransfer();

        if (data.state !== gameState) {
            gameState = data.state;
            handleStateChange(gameState, data);
        }

        // Let game modules handle their specific logic if active
        if (gameState === 'mafia' && typeof window.updateMafia === 'function') window.updateMafia(data);
        if (gameState === 'liar' && typeof window.updateLiar === 'function') window.updateLiar(data);
        if (gameState === 'quiz' && typeof window.updateQuiz === 'function') window.updateQuiz(data);
        if (gameState === 'minigames' && typeof window.updateMinigames === 'function') window.updateMinigames(data);
        if (gameState === 'buzzer' && typeof window.updateBuzzer === 'function') window.updateBuzzer(data);
    });

    // 탭을 닫을 때도 즉시 정리 (방은 지우지 않는다)
    window.addEventListener('beforeunload', () => {
        window.firebaseRemove(window.firebaseChild(roomRef, 'players/' + myPlayerId));
    });
}

function updatePlayerList() {
    playerList.innerHTML = '';
    const keys = Object.keys(players);
    playerCount.innerText = keys.length;

    const botCountEl = document.getElementById('bot-count'); // 테스트용 봇 표시
    if (botCountEl) botCountEl.innerText = keys.filter(id => players[id].isBot).length;
    
    keys.forEach(id => {
        const p = players[id];
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(p.name)} ${id === myPlayerId ? '(나)' : ''}</span>
                        ${p.isHost ? '<span class="host-badge">방장</span>' : ''}`;
        playerList.appendChild(li);
    });
}

// Global Team Picker (rendered in lobby)
function renderTeamPicker(data) {
    const container = document.getElementById('team-picker-area');
    if (!container) return;

    const globalTeams = data.globalTeams || {};
    const captain = data.captain || null;
    const keys = Object.keys(players);
    const myTeam = globalTeams[myPlayerId] || 'A';

    const TEAMS = [
        { id: 'A', name: data.teamAName || 'A팀', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
        { id: 'B', name: data.teamBName || 'B팀', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' }
    ];

    // 팀 하나를 그린다. 이름 입력칸을 카드 안에 넣어 이름이 두 번 보이지 않게 한다.
    const renderTeam = (t) => {
        const members = keys.filter(id => (globalTeams[id] || 'A') === t.id);
        const isMine = myTeam === t.id;

        const header = isHost
            ? `<input type="text" class="team-name-input" value="${escapeHtml(t.name)}"
                      placeholder="${t.id}팀 이름" style="border-color:${t.color};"
                      onchange="window.setTeamName('${t.id}', this.value)">`
            : `<div class="team-name-input" style="border-color:${t.color}; color:${t.color};">${escapeHtml(t.name)}</div>`;

        const list = members.map(id => `
            <div class="team-member" style="background:${t.color}22;">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml(players[id]?.name || id)}${id === myPlayerId ? ' <b style="color:#fbbf24;">(나)</b>' : ''}
                </span>
                ${captain === id ? '<span style="color:#fbbf24; font-size:0.7rem; flex-shrink:0;">👑</span>' : ''}
            </div>`).join('') || `<div style="color:#64748b; font-size:0.8rem; text-align:center; padding:10px 0;">비어 있음</div>`;

        const btn = isMine
            ? `<button class="btn" style="width:100%; padding:9px; font-size:0.88rem; margin-top:8px;
                       background:${t.color}33; border:1px solid ${t.color}; color:${t.color}; cursor:default;" disabled>✓ 참여 중</button>`
            : `<button class="btn" style="width:100%; padding:9px; font-size:0.88rem; margin-top:8px; background:${t.color};"
                       onclick="window.joinTeam('${t.id}')">들어가기</button>`;

        return `<div class="team-card" style="border-color:${t.color}; background:${t.bg};">
                    ${header}
                    <div style="text-align:center; color:${t.color}; font-size:0.75rem; margin:6px 0 8px;">${members.length}명</div>
                    <div style="flex:1;">${list}</div>
                    ${btn}
                </div>`;
    };

    container.innerHTML = `<h4 style="color:#94a3b8; margin-bottom:10px; text-align:center;">⚔️ 팀 선택</h4>
                           <div class="team-grid">${TEAMS.map(renderTeam).join('')}</div>`;

    // 팀장 지정은 방장 도구 안에 있다 (로비를 어지럽히지 않도록)
    const capSel = document.getElementById('captain-select');
    if (capSel && isHost) {
        capSel.innerHTML = '<option value="">없음</option>' +
            keys.map(id => `<option value="${escapeHtml(id)}" ${captain === id ? 'selected' : ''}>${escapeHtml(players[id]?.name || id)}</option>`).join('');
        capSel.onchange = function() { window.setCaptain(this.value); };
    }
}

window.joinTeam = function(team) {
    if (!myRoom) return;
    window.firebaseUpdate(window.firebaseChild(window.firebaseRef(window.db, 'rooms/' + myRoom), 'globalTeams'), {
        [myPlayerId]: team
    });
};

window.setTeamName = function(team, name) {
    if (!isHost || !myRoom) return;
    let key = team === 'A' ? 'teamAName' : 'teamBName';
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), { [key]: name });
};

window.setCaptain = function(pId) {
    if (!isHost || !myRoom) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), { captain: pId || null });
};

// ===== 테스트용 봇 (임시 기능) =====
// 실제 서비스에서 뺄 때는 이 블록과 index.html 의 test-bot-tools div 만 지우면 됩니다.
window.addBot = function() {
    if (!myRoom || !isHost) return;
    const botId = "bot_" + Date.now();
    const botNames = ["로봇철수", "인공지능영희", "알파고", "챗GPT", "봇돌이"];
    const taken = new Set(Object.values(players).map(p => p.name));

    // 안 쓰인 이름부터 차례로, 다 쓰면 뒤에 번호를 붙인다
    let botName = null;
    for (const n of botNames) {
        if (!taken.has(n + " (봇)")) { botName = n + " (봇)"; break; }
    }
    if (!botName) {
        let n = 2;
        while (taken.has(botNames[0] + n + " (봇)")) n++;
        botName = botNames[0] + n + " (봇)";
    }

    window.firebaseUpdate(window.firebaseChild(window.firebaseRef(window.db, 'rooms/' + myRoom), 'players'), {
        [botId]: { name: botName, isHost: false, isBot: true }
    });
};

window.removeBot = function() {
    if (!myRoom || !isHost) return;
    // 가장 나중에 추가한 봇부터 뺀다
    const botIds = Object.keys(players).filter(id => players[id].isBot).sort();
    if (botIds.length === 0) return;
    const target = botIds[botIds.length - 1];
    window.firebaseRemove(window.firebaseRef(window.db, 'rooms/' + myRoom + '/players/' + target));
};
// ===== 테스트용 봇 끝 =====

// Host selects game
gameButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const game = btn.getAttribute('data-game');
        if (myRoom && isHost) {
            const roomRef = window.firebaseRef(window.db, 'rooms/' + myRoom);
            // Initialize game state logic based on selected game
            let initialGameState = { 
                state: game,
                mafiaState: null,
                roles: null,
                alive: null,
                msg: null,
                nightActions: null,
                votes: null,
                winners: null
            };
            
            // Example: simple initialization, modules will handle specific data
            window.firebaseUpdate(roomRef, initialGameState);

            // 부저는 들어가자마자 카운트다운부터 시작한다
            if (game === 'buzzer' && typeof window.bzReset === 'function') window.bzReset();
        }
    });
});

// Host returns to lobby
backButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (myRoom && isHost) {
            const roomRef = window.firebaseRef(window.db, 'rooms/' + myRoom);
            window.firebaseUpdate(roomRef, { state: 'lobby' });
        }
    });
});

// ===== 초대 링크로 들어온 경우 처리 (?room=1234) =====
async function handleInviteParam() {
    const params = new URLSearchParams(location.search);
    let code = (params.get('room') || location.hash.replace('#', '')).trim();
    if (!/^\d{4}$/.test(code)) return;

    const banner = document.getElementById('invite-banner');

    // 코드는 미리 채워두고 잠근다 — 손님은 닉네임만 입력하면 된다
    showScreen('join');
    joinRoomCode.value = code;
    joinRoomCode.readOnly = true;
    joinRoomCode.style.opacity = '0.6';
    if (banner) {
        banner.style.display = 'block';
        banner.innerText = '초대받은 방을 확인하는 중...';
    }

    if (!window.db) return;

    let snap;
    try {
        snap = await window.firebaseGet(window.firebaseRef(window.db, 'rooms/' + code));
    } catch (e) {
        if (banner) banner.innerText = '방 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        return;
    }

    if (!snap.exists()) {
        // 방이 이미 닫힌 경우 — 직접 입력할 수 있게 풀어준다
        if (banner) {
            banner.style.background = 'rgba(239,68,68,0.12)';
            banner.style.borderColor = '#ef4444';
            banner.style.color = '#fecaca';
            banner.innerText = `${code}번 방은 이미 종료되었습니다. 방 코드를 직접 입력해 주세요.`;
        }
        joinRoomCode.readOnly = false;
        joinRoomCode.style.opacity = '1';
        joinRoomCode.value = '';
        return;
    }

    const data = snap.val();
    const playerObjs = Object.values(data.players || {});
    const hostName = (playerObjs.find(p => p.isHost) || {}).name || '누군가';
    if (banner) {
        banner.innerHTML = `🎉 <b>${escapeHtml(hostName)}</b>님의 방 (<b>${code}</b>번)에 초대되었습니다!<br>
                            <span style="font-size:0.85rem; color:#93c5fd;">현재 ${playerObjs.length}명 참여 중 · 닉네임만 입력하면 바로 입장합니다</span>`;
    }
    joinNickname.focus();
}

// ===== 버려진 빈 방 정리 =====
// 방을 아무도 지우지 않게 되었으므로, 하루가 지난 빈 방은 청소해 준다.
// 서버가 없으니 "누군가 방을 새로 만들 때" 함께 쓸어내는 방식으로 처리한다.
const ROOM_TTL = 24 * 60 * 60 * 1000; // 24시간
const SWEEP_KEY = 'partyhub_last_sweep';
const SWEEP_INTERVAL = 60 * 60 * 1000; // 기기당 한 시간에 한 번만

async function sweepOldRooms() {
    try {
        const last = parseInt(localStorage.getItem(SWEEP_KEY) || '0', 10);
        if (Date.now() - last < SWEEP_INTERVAL) return;
        localStorage.setItem(SWEEP_KEY, String(Date.now()));

        const snap = await window.firebaseGet(window.firebaseRef(window.db, 'rooms'));
        const all = snap.val() || {};
        const cutoff = Date.now() - ROOM_TTL;

        for (const code of Object.keys(all)) {
            const r = all[code] || {};
            const isEmpty = !r.players || Object.keys(r.players).length === 0;
            const stamp = r.lastActiveAt || r.createdAt || 0;
            if (isEmpty && stamp && stamp < cutoff) {
                await window.firebaseRemove(window.firebaseRef(window.db, 'rooms/' + code));
                await window.firebaseRemove(window.firebaseRef(window.db, 'secrets/' + code));
                await window.firebaseRemove(window.firebaseRef(window.db, 'privates/' + code));
            }
        }
    } catch (e) {
        // 청소는 실패해도 게임에 지장이 없으므로 조용히 넘어간다
    }
}

// ===== 세션 복구 =====
// 저장해 둔 playerId 그대로 다시 들어가야 기록 · 점수 · 팀이 본인에게 다시 붙는다.
async function rejoinWithSession(s) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + s.room);
    const snap = await window.firebaseGet(roomRef);
    if (!snap.exists()) { clearSession(); return false; }

    const data = snap.val();
    myRoom = s.room;
    myPlayerId = s.playerId;
    myNickname = s.nickname;
    window.myRoom = myRoom;
    window.myPlayerId = myPlayerId;

    applyHostState(data.hostId === myPlayerId);

    const prev = (data.players || {})[myPlayerId] || {};
    await window.firebaseUpdate(
        window.firebaseRef(window.db, 'rooms/' + s.room + '/players/' + myPlayerId),
        {
            name: s.nickname,
            isHost: data.hostId === myPlayerId,
            joinedAt: prev.joinedAt || Date.now(),
            uid: myUid
        }
    );
    await window.firebaseUpdate(roomRef, { lastActiveAt: Date.now() });

    joinRoomLogic(s.room, s.nickname);
    return true;
}

// 출입증(익명 로그인)이 발급될 때까지 기다린다. DB 규칙이 인증을 요구하므로
// 이보다 먼저 데이터를 건드리면 전부 거부당한다.
async function waitForAuth() {
    if (!window.authReady) return null;
    const user = await window.authReady;
    if (user) {
        myUid = user.uid;
        window.myUid = myUid;
        return user;
    }

    // 로그인은 실패했지만 DB 규칙이 아직 인증을 요구하지 않으면 게임은 정상 동작한다.
    // 그럴 때까지 사용자에게 굳이 빨간 경고를 보여줄 이유가 없다.
    try {
        await window.firebaseGet(window.firebaseRef(window.db, 'rooms'));
        console.warn('익명 로그인이 꺼져 있습니다. DB 규칙을 강화하기 전에 콘솔에서 켜주세요.');
        return null;
    } catch (e) {
        // 읽기까지 막혔다면 규칙은 인증을 요구하는데 로그인이 안 된 상태 → 앱을 쓸 수 없다
    }

    // 콘솔에서 '익명' 로그인을 켜지 않았을 때 가장 흔하게 발생한다.
    const home = document.getElementById('screen-home');
    if (home) {
        const box = document.createElement('div');
        box.style.cssText = 'margin:20px 0; padding:16px; border-radius:12px; background:rgba(239,68,68,0.12); border:1px solid #ef4444; color:#fecaca; font-size:0.9rem; line-height:1.6; text-align:left;';
        box.innerHTML = '⚠️ <b>접속 준비에 실패했습니다.</b><br>' +
                        '<span style="font-size:0.85rem;">Firebase 콘솔 → Authentication → 로그인 방법에서 ' +
                        '<b>익명</b>을 사용 설정해 주세요.' +
                        (window.authError ? '<br>(오류 코드: ' + escapeHtml(window.authError) + ')' : '') +
                        '</span>';
        home.insertBefore(box, home.firstChild.nextSibling);
    }
    return null;
}

async function startApp() {
    if (!window.db) { handleInviteParam(); return; }
    await waitForAuth();

    const s = loadSession();
    const linkRoom = new URLSearchParams(location.search).get('room');

    // 내가 있던 방의 링크를 다시 연 경우 → 묻지 않고 그대로 복귀
    if (s && linkRoom && linkRoom === s.room) {
        if (await rejoinWithSession(s)) return;
    }
    // 다른 방 링크를 눌렀다면 그 링크가 우선
    if (s && linkRoom && linkRoom !== s.room) {
        clearSession();
        handleInviteParam();
        return;
    }

    // 링크 없이 그냥 접속 → 돌아갈지 물어본다
    if (s) {
        let snap = null;
        try { snap = await window.firebaseGet(window.firebaseRef(window.db, 'rooms/' + s.room)); } catch (e) {}
        if (snap && snap.exists()) {
            const box = document.getElementById('resume-box');
            const txt = document.getElementById('resume-text');
            const people = Object.keys(snap.val().players || {}).length;
            if (box && txt) {
                txt.innerHTML = `<b>${escapeHtml(s.nickname)}</b>님, 아직 <b>${escapeHtml(s.room)}번 방</b>이 열려 있습니다. (${people}명 참여 중)<br>
                                 <span style="font-size:0.85rem; color:#86efac;">다시 들어가면 점수와 기록이 그대로 유지됩니다.</span>`;
                box.style.display = 'block';
                document.getElementById('btn-resume').onclick = () => rejoinWithSession(s);
                document.getElementById('btn-resume-dismiss').onclick = () => {
                    clearSession();
                    box.style.display = 'none';
                };
            }
        } else {
            clearSession();
        }
    }

    handleInviteParam();
}

startApp();

// State Handler
function handleStateChange(state, data) {
    showScreen(state); // 'lobby', 'mafia', 'liar', 'quiz'
    if (state !== 'lobby') {
        // Clear previous game content
        document.getElementById(`${state}-content`).innerHTML = '<p style="text-align:center;">게임을 준비 중입니다...</p>';
    }
}
