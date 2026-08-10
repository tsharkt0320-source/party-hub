// mafia.js
window.updateMafia = function(data) {
    const content = document.getElementById('mafia-content');
    
    // Check if game just started
    if (!data.mafiaState) {
        if (isHost) {
            content.innerHTML = '<button id="btn-start-mafia" class="btn primary">역할 분배하고 시작하기</button>';
            document.getElementById('btn-start-mafia').onclick = () => {
                const pKeys = Object.keys(players);
                // Simple role distribution
                let roles = ['mafia', 'police', 'doctor'];
                while(roles.length < pKeys.length) roles.push('citizen');
                roles.sort(() => Math.random() - 0.5);
                
                let assigned = {};
                pKeys.forEach((k, i) => assigned[k] = roles[i]);
                
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
                    mafiaState: 'night',
                    roles: assigned,
                    alive: pKeys.reduce((acc, curr) => ({...acc, [curr]: true}), {}),
                    msg: '밤이 되었습니다. 마피아는 고개를 들어주세요.'
                });
            };
        } else {
            content.innerHTML = '<p style="text-align:center;">방장이 게임을 시작하기를 기다리고 있습니다...</p>';
        }
        return;
    }

    // Game is running
    const myRole = data.roles[myPlayerId];
    const isAlive = data.alive[myPlayerId];
    
    let roleName = myRole === 'mafia' ? '🕵️ 마피아' : myRole === 'police' ? '👮 경찰' : myRole === 'doctor' ? '👨‍⚕️ 의사' : '👨‍🌾 시민';
    
    let html = `
        <div class="card">
            <div class="role-title">당신의 직업: ${roleName}</div>
            <p>${isAlive ? '현재 생존해 있습니다.' : '<span class="error-text">당신은 사망했습니다.</span>'}</p>
        </div>
        <div class="phase-title">${data.mafiaState === 'night' ? '🌙 밤' : '☀️ 낮'}</div>
        <div class="card">
            <p>${data.msg}</p>
        </div>
    `;

    // Controls based on phase and role (Simplified logic)
    if (isAlive) {
        if (data.mafiaState === 'night') {
            if (myRole === 'mafia') html += generateTargetList(data.alive, 'killTarget', '암살하기');
            else if (myRole === 'police') html += generateTargetList(data.alive, 'investigateTarget', '조사하기');
            else if (myRole === 'doctor') html += generateTargetList(data.alive, 'healTarget', '살리기');
        } else if (data.mafiaState === 'vote') {
            html += generateTargetList(data.alive, 'voteTarget', '투표하기');
        }
    }
    
    if (isHost) {
        html += `<div style="margin-top:20px; text-align:center;">
                    <button class="btn secondary" onclick="nextPhase('${data.mafiaState}')">다음 페이즈로 강제 진행 (방장)</button>
                 </div>`;
    }

    content.innerHTML = html;
};

function generateTargetList(aliveObj, action, btnText) {
    let list = `<div class="vote-list" style="margin-top:15px;">`;
    Object.keys(aliveObj).forEach(id => {
        if (aliveObj[id] && id !== myPlayerId) {
            list += `<button class="vote-btn" onclick="submitAction('${action}', '${id}')">${players[id].name} ${btnText}</button>`;
        }
    });
    list += `</div>`;
    return list;
}

window.submitAction = function(action, targetId) {
    alert(`${players[targetId].name}을(를) 선택했습니다! (실제 투표 집계는 로직 추가 필요)`);
    // Here we would push the action to Firebase
};

window.nextPhase = function(currentPhase) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + myRoom);
    let nextState = currentPhase === 'night' ? 'day' : currentPhase === 'day' ? 'vote' : 'night';
    let msg = nextState === 'night' ? '밤이 되었습니다.' : nextState === 'day' ? '낮이 밝았습니다. 토론을 시작하세요.' : '투표 시간입니다. 마피아로 의심되는 사람을 고르세요.';
    
    window.firebaseUpdate(roomRef, {
        mafiaState: nextState,
        msg: msg
    });
};
