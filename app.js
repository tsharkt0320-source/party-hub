// app.js

// Global State
let myRoom = null;
let myPlayerId = null;
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
    minigames: document.getElementById('screen-minigames')
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
const btnAddBot = document.getElementById('btn-add-bot');

// Helper: Show Screen
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Generate random 4 character room code
// Generate random 4 digit room code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Navigation
navCreate.addEventListener('click', () => showScreen('create'));
navJoin.addEventListener('click', () => showScreen('join'));
navBacks.forEach(btn => btn.addEventListener('click', () => {
    showScreen('home');
    createError.innerText = '';
    joinError.innerText = '';
}));

document.querySelectorAll('.leave-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm("정말 방에서 나가시겠습니까?")) {
            window.location.reload();
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
    
    myRoom = generateRoomCode();
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
        createdAt: Date.now(),
        players: {
            [myPlayerId]: { name: nickname, isHost: true }
        }
    });

    joinRoomLogic(myRoom, nickname);
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
        myRoom = code;
        myPlayerId = "guest_" + Date.now();
        isHost = false;
        document.body.classList.remove('is-host');
        
        window.myRoom = myRoom;
        window.myPlayerId = myPlayerId;
        window.isHost = isHost;
        
        await window.firebaseUpdate(window.firebaseChild(roomRef, 'players'), {
            [myPlayerId]: { name: nickname, isHost: false }
        });
        
        joinRoomLogic(myRoom, nickname);
    } else {
        joinError.innerText = "존재하지 않는 방입니다.";
    }
});

// Room Logic
function joinRoomLogic(code, nickname) {
    showScreen('lobby');
    lobbyRoomCodeDisplay.innerText = code;
    
    // 뒤로가기 방지 로직 (모바일 폰)
    history.pushState(null, null, location.href);
    window.addEventListener('popstate', function(event) {
        if (confirm("정말 방에서 나가시겠습니까?")) {
            // 유저가 확인을 누르면 아예 화면을 새로고침해서 모든 통신을 끊고 홈으로 돌아감
            window.removeEventListener('beforeunload', handleUnload); // Prevent double trigger
            window.location.reload();
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
            // Room deleted
            alert("방이 종료되었습니다.");
            window.location.reload();
            return;
        }
        
        players = data.players || {};
        window.players = players; // Expose to window for external scripts
        window._isCaptain = (data.captain === myPlayerId);
        
        updatePlayerList();
        renderTeamPicker(data);
        
        if (data.state !== gameState) {
            gameState = data.state;
            handleStateChange(gameState, data);
        }
        
        // Let game modules handle their specific logic if active
        if (gameState === 'mafia' && typeof window.updateMafia === 'function') window.updateMafia(data);
        if (gameState === 'liar' && typeof window.updateLiar === 'function') window.updateLiar(data);
        if (gameState === 'quiz' && typeof window.updateQuiz === 'function') window.updateQuiz(data);
        if (gameState === 'minigames' && typeof window.updateMinigames === 'function') window.updateMinigames(data);
    });
    
    // Disconnect hook
    const handleUnload = () => {
        if (isHost) {
            window.firebaseRemove(roomRef);
        } else {
            window.firebaseRemove(window.firebaseChild(roomRef, 'players/' + myPlayerId));
        }
    };
    window.addEventListener('beforeunload', handleUnload);
}

function updatePlayerList() {
    playerList.innerHTML = '';
    const keys = Object.keys(players);
    playerCount.innerText = keys.length;
    
    keys.forEach(id => {
        const p = players[id];
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name} ${id === myPlayerId ? '(나)' : ''}</span> 
                        ${p.isHost ? '<span class="host-badge">방장</span>' : ''}`;
        playerList.appendChild(li);
    });
}

// Global Team Picker (rendered in lobby)
function renderTeamPicker(data) {
    const container = document.getElementById('team-picker-area');
    if (!container) return;
    const globalTeams = data.globalTeams || {};
    const teamAName = data.teamAName || 'A팀';
    const teamBName = data.teamBName || 'B팀';
    const captain = data.captain || null;
    const keys = Object.keys(players);
    const teamA = keys.filter(id => (globalTeams[id] || 'A') === 'A');
    const teamB = keys.filter(id => globalTeams[id] === 'B');
    
    let html = '';
    if (isHost) {
        html += `<div style="display:flex; gap:10px; margin-bottom:10px;">
                    <input type="text" id="team-a-name" value="${teamAName}" placeholder="A팀 이름" style="flex:1; padding:8px; border-radius:6px; border:1px solid #3b82f6; background:rgba(59,130,246,0.1); color:white; text-align:center;" onchange="window.setTeamName('A', this.value)">
                    <input type="text" id="team-b-name" value="${teamBName}" placeholder="B팀 이름" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ef4444; background:rgba(239,68,68,0.1); color:white; text-align:center;" onchange="window.setTeamName('B', this.value)">
                 </div>`;
    }
    html += `<div style="display:flex; gap:10px; min-height:120px;">
                <div style="flex:1; display:flex; flex-direction:column; background:rgba(59,130,246,0.1); border:2px solid #3b82f6; border-radius:12px; padding:10px;">
                    <div style="text-align:center; font-weight:bold; color:#3b82f6; margin-bottom:8px;">${teamAName}</div>
                    <div style="flex:1;">`;
    teamA.forEach(id => {
        let isCap = captain === id;
        html += `<div style="padding:4px 8px; margin-bottom:3px; border-radius:6px; background:rgba(59,130,246,0.2); font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>${players[id]?.name || id} ${id === myPlayerId ? '(나)' : ''}</span>
                    ${isCap ? '<span style="color:#fbbf24; font-size:0.7rem;">👑팀장</span>' : ''}
                 </div>`;
    });
    html += `       </div>
                    <button class="btn primary" style="width:100%; padding:8px; font-size:0.9rem; margin-top:10px;" onclick="window.joinTeam('A')">A팀 들어가기</button>
                </div>
                <div style="flex:1; display:flex; flex-direction:column; background:rgba(239,68,68,0.1); border:2px solid #ef4444; border-radius:12px; padding:10px;">
                    <div style="text-align:center; font-weight:bold; color:#ef4444; margin-bottom:8px;">${teamBName}</div>
                    <div style="flex:1;">`;
    teamB.forEach(id => {
        let isCap = captain === id;
        html += `<div style="padding:4px 8px; margin-bottom:3px; border-radius:6px; background:rgba(239,68,68,0.2); font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                    <span>${players[id]?.name || id} ${id === myPlayerId ? '(나)' : ''}</span>
                    ${isCap ? '<span style="color:#fbbf24; font-size:0.7rem;">👑팀장</span>' : ''}
                 </div>`;
    });
    html += `       </div>
                    <button class="btn danger" style="width:100%; padding:8px; font-size:0.9rem; margin-top:10px; background:#ef4444; color:white;" onclick="window.joinTeam('B')">B팀 들어가기</button>
                </div>
             </div>`;
    if (isHost) {
        html += `<div style="margin-top:10px;"><label style="color:#cbd5e1; font-size:0.85rem;">👑 팀장 지정</label>
                    <select id="captain-select" class="input-group input" style="width:100%; padding:8px; margin-top:5px;" onchange="window.setCaptain(this.value)">
                        <option value="">없음</option>
                        ${keys.map(id => `<option value="${id}" ${captain===id?'selected':''}>${players[id]?.name || id}</option>`).join('')}
                    </select>
                 </div>`;
    }
    container.innerHTML = html;
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

// Host adds a bot for solo testing
if (btnAddBot) {
    btnAddBot.addEventListener('click', () => {
        if (myRoom && isHost) {
            const botId = "bot_" + Date.now();
            const botNames = ["로봇철수", "인공지능영희", "알파고", "챗GPT", "봇돌이"];
            const botName = botNames[Math.floor(Math.random() * botNames.length)];
            
            window.firebaseUpdate(window.firebaseChild(window.firebaseRef(window.db, 'rooms/' + myRoom), 'players'), {
                [botId]: { name: botName + " (봇)", isHost: false, isBot: true }
            });
        }
    });
}

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

// State Handler
function handleStateChange(state, data) {
    showScreen(state); // 'lobby', 'mafia', 'liar', 'quiz'
    if (state !== 'lobby') {
        // Clear previous game content
        document.getElementById(`${state}-content`).innerHTML = '<p style="text-align:center;">게임을 준비 중입니다...</p>';
    }
}
