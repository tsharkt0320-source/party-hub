// liar.js
window.updateLiar = function(data) {
    const content = document.getElementById('liar-content');
    
    if (!data.liarState) {
        if (isHost) {
            content.innerHTML = '<button id="btn-start-liar" class="btn primary">주제 정하고 게임 시작하기</button>';
            document.getElementById('btn-start-liar').onclick = () => {
                const pKeys = Object.keys(players);
                // Randomly select one liar
                const liarId = pKeys[Math.floor(Math.random() * pKeys.length)];
                
                const topics = [
                    { category: '동물', word: '기린' },
                    { category: '직업', word: '소방관' },
                    { category: '과일', word: '수박' }
                ];
                const selectedTopic = topics[Math.floor(Math.random() * topics.length)];

                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
                    liarState: 'playing',
                    liarId: liarId,
                    category: selectedTopic.category,
                    word: selectedTopic.word,
                    turnIndex: 0,
                    turnOrder: pKeys.sort(() => Math.random() - 0.5)
                });
            };
        } else {
            content.innerHTML = '<p style="text-align:center;">방장이 게임을 시작하기를 기다리고 있습니다...</p>';
        }
        return;
    }

    // Game Running
    let isLiar = (myPlayerId === data.liarId);
    let currentTurnId = data.turnOrder[data.turnIndex];
    let isMyTurn = (myPlayerId === currentTurnId);
    
    let html = `
        <div class="card">
            <h3>카테고리: ${data.category}</h3>
            <div class="role-title" style="color: ${isLiar ? 'var(--danger)' : 'var(--primary)'}">
                ${isLiar ? '당신은 라이어입니다!' : `제시어: ${data.word}`}
            </div>
            ${isLiar ? '<p>정체를 숨기고 그럴듯하게 설명하세요.</p>' : '<p>라이어에게 들키지 않게 설명하세요.</p>'}
        </div>
        
        <div class="card">
            <h3 style="color:var(--warning)">현재 턴: ${players[currentTurnId].name}</h3>
            ${isMyTurn ? '<p style="font-weight:bold; color:var(--success);">설명을 마치면 아래 버튼을 누르세요.</p>' : '<p>현재 턴인 플레이어가 단어를 설명 중입니다.</p>'}
        </div>
    `;

    if (isMyTurn) {
        html += `<button class="btn primary" onclick="nextLiarTurn(${data.turnIndex}, ${data.turnOrder.length})">설명 완료 (다음 턴으로)</button>`;
    }

    if (isHost) {
        html += `<div style="margin-top:20px; text-align:center;">
                    <button class="btn secondary" onclick="endLiarGame()">게임 강제 종료 및 결과 보기 (방장)</button>
                 </div>`;
    }

    content.innerHTML = html;
};

window.nextLiarTurn = function(currentIndex, totalPlayers) {
    let nextIndex = currentIndex + 1;
    if (nextIndex >= totalPlayers) {
        // All players explained, time to vote
        alert("모든 플레이어의 설명이 끝났습니다. 오프라인으로 토론 후 라이어를 지목하세요!");
        nextIndex = 0; // Loop or change state to 'voting'
    }
    
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
        turnIndex: nextIndex
    });
};

window.endLiarGame = function() {
    // Show results
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
        liarState: null // Reset
    });
    alert("게임 종료! (실제로는 결과창 화면으로 넘어가야 합니다)");
};
