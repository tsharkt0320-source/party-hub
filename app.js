// app.js

// Global State
let myRoom = null;
let myPlayerId = null;
let isHost = false;
let players = {};
let gameState = null; // "lobby", "mafia", "liar", "quiz"

// DOM Elements
const screens = {
    login: document.getElementById('screen-login'),
    lobby: document.getElementById('screen-lobby'),
    mafia: document.getElementById('screen-mafia'),
    liar: document.getElementById('screen-liar'),
    quiz: document.getElementById('screen-quiz')
};

const inputNickname = document.getElementById('input-nickname');
const inputRoomCode = document.getElementById('input-roomcode');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const loginError = document.getElementById('login-error');
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
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Firebase Check
function checkFirebase() {
    if (!window.db) {
        loginError.innerText = "Firebase 설정이 필요합니다. 코드에 API 키를 넣어주세요.";
        return false;
    }
    return true;
}

// Create Room
btnCreateRoom.addEventListener('click', async () => {
    if (!checkFirebase()) return;
    const nickname = inputNickname.value.trim();
    if (!nickname) { loginError.innerText = "닉네임을 입력해주세요."; return; }
    
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
    if (!checkFirebase()) return;
    const nickname = inputNickname.value.trim();
    const code = inputRoomCode.value.trim().toUpperCase();
    
    if (!nickname) { loginError.innerText = "닉네임을 입력해주세요."; return; }
    if (!code || code.length !== 4) { loginError.innerText = "올바른 4자리 방 코드를 입력해주세요."; return; }

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
        loginError.innerText = "존재하지 않는 방입니다.";
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
            // 유저가 확인을 누르면 그대로 나가게 둠
            window.removeEventListener('beforeunload', handleUnload); // Prevent double trigger
            history.back();
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
        
        updatePlayerList();
        
        if (data.state !== gameState) {
            gameState = data.state;
            handleStateChange(gameState, data);
        }
        
        // Let game modules handle their specific logic if active
        if (gameState === 'mafia' && typeof window.updateMafia === 'function') window.updateMafia(data);
        if (gameState === 'liar' && typeof window.updateLiar === 'function') window.updateLiar(data);
        if (gameState === 'quiz' && typeof window.updateQuiz === 'function') window.updateQuiz(data);
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
            let initialGameState = { state: game };
            
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
