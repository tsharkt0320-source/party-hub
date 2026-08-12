// liar.js

const LIAR_DICTIONARY = {
    '동물': ['호랑이', '사자', '코끼리', '기린', '원숭이', '판다', '고양이', '강아지', '악어', '하마', '펭귄', '독수리', '캥거루'],
    '과일': ['사과', '바나나', '포도', '수박', '오렌지', '딸기', '복숭아', '파인애플', '망고', '블루베리', '참외', '자두'],
    '직업': ['소방관', '경찰관', '의사', '교사', '개발자', '요리사', '가수', '배우', '우주비행사', '농부', '건축가', '유튜버'],
    '음식': ['피자', '치킨', '햄버거', '초밥', '파스타', '떡볶이', '라면', '김치찌개', '짜장면', '돈까스', '삼겹살', '스테이크'],
    '나라': ['한국', '미국', '일본', '중국', '영국', '프랑스', '독일', '이탈리아', '호주', '캐나다', '브라질', '이집트'],
    '스포츠': ['축구', '야구', '농구', '배구', '테니스', '수영', '골프', '육상', '탁구', '배드민턴', '유도', '태권도'],
    '가전제품': ['냉장고', '세탁기', '텔레비전', '에어컨', '청소기', '전자레인지', '선풍기', '공기청정기', '건조기', '컴퓨터']
};

const WORD_MAFIA_DICTIONARY = [
    ['짜장면', '짬뽕'], ['사과', '배'], ['경찰', '도둑'], ['선풍기', '에어컨'], 
    ['강아지', '고양이'], ['피자', '치킨'], ['콜라', '사이다'], ['버스', '지하철'],
    ['노트북', '스마트폰'], ['산', '바다'], ['연필', '볼펜'], ['소주', '맥주']
];

// 비밀(제시어·라이어)은 방 노드에 없다. 방장만 secret에서 되살려 쓴다.
function mergeLiarSecret(data) {
    if (data.liarId || !window.isHost) return data;
    const sec = (window._secret && window._secret.liar) || null;
    if (!sec) return data;
    data.liarId = sec.liarId;
    data.spyId = sec.spyId;
    data.word = sec.word;
    data.liarFakeWord = sec.liarFakeWord;
    return data;
}
window.mergeLiarSecret = mergeLiarSecret;

// 게임이 끝나면 방장이 정답과 라이어를 공개한다
function hostRevealLiar(data) {
    if (!window.isHost || data.liarState !== 'game_over' || data.revealed) return;
    const sec = (window._secret && window._secret.liar) || null;
    if (!sec) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        revealed: {
            word: sec.word || null,
            liarFakeWord: sec.liarFakeWord || null,
            liarId: sec.liarId || null,
            spyId: sec.spyId || null
        }
    });
}

window.updateLiar = function(data) {
    mergeLiarSecret(data);
    hostRevealLiar(data);
    hostJudgeLiarGuess(data);
    const content = document.getElementById('liar-content');
    
    // 1. 대기실
    if (!data.liarState) {
        if (window.isHost) {
            let optionsHtml = `<option value="random">🎲 완전 랜덤</option>`;
            for (const cat in LIAR_DICTIONARY) {
                optionsHtml += `<option value="${cat}">${cat}</option>`;
            }
            
            content.innerHTML = `
                <div class="card" style="text-align:left;">
                    <h3 style="margin-bottom:15px;">🎭 라이어 게임 설정</h3>
                    
                    <div style="margin-bottom:15px;">
                        <label style="font-weight:bold; display:block; margin-bottom:5px;">게임 모드 선택:</label>
                        <select id="liar-mode-select" style="width:100%; padding:10px; border-radius:8px; background:#1e293b; color:white; border:1px solid #475569;">
                            <option value="normal" selected>🟢 일반 모드 (라이어 1명)</option>
                            <option value="spy">🕵️ 스파이 모드 (라이어 1명 + 스파이 1명)</option>
                            <option value="word_mafia">🤡 동상이몽 모드 (제시어 2개 부여)</option>
                        </select>
                        <p style="font-size:0.8rem; color:#94a3b8; margin-top:5px;" id="mode-desc">기본 라이어 게임입니다.</p>
                    </div>

                    <div style="margin-bottom:10px;" id="category-box">
                        <label>카테고리 선택:</label>
                        <select id="liar-category-select" style="width:100%; padding:10px; margin-top:5px; border-radius:8px; background:#1e293b; color:white; border:1px solid #475569;">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div style="margin-bottom:10px;">
                        <label>설명 라운드 수 (바퀴):</label>
                        <select id="liar-rounds-select" style="width:100%; padding:10px; margin-top:5px; border-radius:8px; background:#1e293b; color:white; border:1px solid #475569;">
                            <option value="1">1 바퀴 (빠른 진행)</option>
                            <option value="2" selected>2 바퀴 (추천)</option>
                            <option value="3">3 바퀴</option>
                        </select>
                    </div>
                    <div style="margin-bottom:10px;">
                        <label>턴 넘기기 방식:</label>
                        <select id="liar-turn-mode-select" style="width:100%; padding:10px; margin-top:5px; border-radius:8px; background:#1e293b; color:white; border:1px solid #475569;">
                            <option value="host" selected>방장이 수동으로 넘기기</option>
                            <option value="self">각자가 설명하고 본인이 넘기기</option>
                            <option value="auto_5">자동으로 넘어가기 (5초)</option>
                            <option value="auto_10">자동으로 넘어가기 (10초)</option>
                            <option value="auto_15">자동으로 넘어가기 (15초)</option>
                        </select>
                    </div>
                </div>
                <button id="btn-start-liar" class="btn primary" style="margin-top:15px; width:100%;">역할 배정하고 게임 시작하기</button>
            `;

            const modeSelect = document.getElementById('liar-mode-select');
            const modeDesc = document.getElementById('mode-desc');
            const catBox = document.getElementById('category-box');

            modeSelect.onchange = () => {
                if (modeSelect.value === 'spy') {
                    modeDesc.innerText = "시민 중에 라이어를 돕는 스파이가 추가됩니다. (최소 4인 이상 추천)";
                    catBox.style.display = 'block';
                } else if (modeSelect.value === 'word_mafia') {
                    modeDesc.innerHTML = "다수파와 소수파만 존재하며 눈치껏 다수파에 들어가도록 할 것!<br>다수파에서 소수파를 찾으면 다수파 승리! 다수파가 지적당하면 소수파 승리!";
                    catBox.style.display = 'none';
                } else {
                    modeDesc.innerText = "기본 라이어 게임입니다.";
                    catBox.style.display = 'block';
                }
            };
            
            document.getElementById('btn-start-liar').onclick = () => {
                const pKeys = Object.keys(window.players);
                if (pKeys.length < 3) {
                    alert("최소 3명 이상이어야 합니다.");
                    return;
                }
                
                const mode = modeSelect.value;
                let liarId = pKeys[Math.floor(Math.random() * pKeys.length)];
                let spyId = null;
                
                if (mode === 'spy' && pKeys.length >= 4) {
                    let available = pKeys.filter(p => p !== liarId);
                    spyId = available[Math.floor(Math.random() * available.length)];
                }

                let selectedCat = '동상이몽';
                let selectedWord = '';
                let liarFakeWord = '';

                if (mode === 'word_mafia') {
                    const pair = WORD_MAFIA_DICTIONARY[Math.floor(Math.random() * WORD_MAFIA_DICTIONARY.length)];
                    if (Math.random() > 0.5) {
                        selectedWord = pair[0]; liarFakeWord = pair[1];
                    } else {
                        selectedWord = pair[1]; liarFakeWord = pair[0];
                    }
                } else {
                    selectedCat = document.getElementById('liar-category-select').value;
                    if (selectedCat === 'random') {
                        const keys = Object.keys(LIAR_DICTIONARY);
                        selectedCat = keys[Math.floor(Math.random() * keys.length)];
                    }
                    const words = LIAR_DICTIONARY[selectedCat];
                    selectedWord = words[Math.floor(Math.random() * words.length)];
                }
                
                let numRounds = parseInt(document.getElementById('liar-rounds-select').value) || 2;
                let baseOrder = pKeys.sort(() => Math.random() - 0.5);
                let finalOrder = [];
                for(let i=0; i<numRounds; i++) {
                    finalOrder = finalOrder.concat(baseOrder);
                }
                
                const turnMode = document.getElementById('liar-turn-mode-select').value;
                
                // 각자의 봉투 — 자기가 알아야 할 것만 들어간다
                const liarPriv = {};
                pKeys.forEach(function(k) {
                    const uid = (window.players[k] || {}).uid;
                    if (!uid) return;
                    const kIsLiar = (k === liarId);
                    const kIsSpy = (k === spyId);
                    const box = {
                        isLiar: kIsLiar,
                        isSpy: kIsSpy,
                        word: kIsLiar ? (liarFakeWord || '') : selectedWord
                    };
                    if (kIsSpy) {
                        box.liarName = (window.players[liarId] || {}).name || '?';
                        box.realWord = selectedWord;
                    }
                    liarPriv[uid] = { liar: box };
                });

                // 비밀은 방 노드 바깥에 저장한다
                window.firebaseUpdate(window.firebaseRef(window.db), {
                    ['secrets/' + window.myRoom]: { liar: { liarId: liarId, spyId: spyId, word: selectedWord, liarFakeWord: liarFakeWord } },
                    ['privates/' + window.myRoom]: liarPriv
                });

                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
                    liarState: 'role_reveal',
                    gameMode: mode,
                    liarId: null,        // 공개 노드에서 제거
                    spyId: null,
                    word: null,
                    liarFakeWord: null,
                    revealed: null,
                    category: selectedCat,
                    turnIndex: 0,
                    turnOrder: finalOrder,
                    turnMode: turnMode,
                    votes: null,
                    winners: null,
                    guessResult: null,
                    msg: '각자의 역할을 확인하세요! 라이어는 정체를 들키지 않게 조심하세요.'
                });
            };
        } else {
            content.innerHTML = `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="color:#fbbf24;">⏳ 방장이 설정을 고르고 있습니다...</h3>
                </div>
                <div class="card" style="text-align:left; font-size:0.85rem; padding:15px;">
                    <b>📖 특수 모드 룰</b><br><br>
                    <b>🕵️ 스파이 모드</b>: 시민 중에 라이어를 돕는 스파이가 한 명 숨어있습니다. 스파이는 라이어와 정답을 알며, 라이어에게 은밀히 힌트를 줘야 합니다. 스파이가 잡히면 즉시 시민의 승리로 끝납니다!<br><br>
                    <b>🤡 동상이몽 모드</b>: 라이어 없이 '짜장면' 5명, '짬뽕' 1명 처럼 비슷한 단어를 받습니다. 다수파와 소수파만 존재하며 눈치껏 다수파에 들어가도록 할 것! 다수파에서 소수파를 찾으면 다수파 승리! 다수파가 지적당하면 소수파 승리!
                </div>
            `;
        }
        return;
    }

    // 게임 진행 UI
    let html = '';
    const myLiar = (window._myPrivate && window._myPrivate.liar) || null;
    const isLiar = myLiar ? !!myLiar.isLiar : (window.myPlayerId === data.liarId);
    const isSpy = myLiar ? !!myLiar.isSpy : (window.myPlayerId === data.spyId);
    
    // 최상단 메시지
    if (data.msg) {
        html += `<div style="margin-bottom:15px; font-size:1.1rem; text-align:center;">${data.msg}</div>`;
    }

    // 내 역할 카드 (게임 종료 전까지 항상 보임)
    if (data.liarState !== 'game_over') {
        if (data.gameMode === 'word_mafia') {
            const myWord = myLiar ? myLiar.word : (isLiar ? data.liarFakeWord : data.word);
            html += `
                <div class="card">
                    <h3 style="color:#a855f7; margin-bottom:10px;">모드: [ 🤡 동상이몽 모드 ]</h3>
                    <div class="role-title" style="color: var(--primary); font-size:1.8rem; margin:10px 0;">
                        제시어: <b>${myWord}</b>
                    </div>
                    <p style="color:#aaa; font-size:0.9rem;">본인이 다수파인지 소수파인지 눈치껏 파악하세요!</p>
                </div>
            `;
        } else {
            html += `
                <div class="card">
                    <h3 style="color:#a855f7; margin-bottom:10px;">카테고리: [ ${data.category} ]</h3>
                    <div class="role-title" style="color: ${(isLiar || isSpy) ? 'var(--danger)' : 'var(--primary)'}; font-size:1.8rem; margin:10px 0;">
                        ${isLiar ? '당신은 🤡 라이어입니다!' : (isSpy ? '당신은 🕵️ 스파이입니다!' : `제시어: <b>${myLiar ? myLiar.word : data.word}</b>`)}
                    </div>
                    ${isLiar ? '<p style="color:#aaa; font-size:0.9rem;">정체를 숨기고 눈치껏 아는 척 설명하세요!</p>' : ''}
                    ${isSpy ? `<p style="color:var(--danger); font-size:0.9rem; margin-top:5px;">진짜 라이어는 <b>[${myLiar ? myLiar.liarName : (window.players[data.liarId] || {}).name}]</b>님입니다!<br>정답은 <b>[${myLiar ? myLiar.realWord : data.word}]</b> 입니다.<br>라이어에게 은밀히 힌트를 주세요!</p>` : ''}
                    ${(!isLiar && !isSpy) ? '<p style="color:#aaa; font-size:0.9rem;">라이어에게 들키지 않게, 하지만 시민에겐 알아듣게 설명하세요!</p>' : ''}
                </div>
            `;
        }
    }

    // Phase 2: 역할 확인 (role_reveal)
    if (data.liarState === 'role_reveal') {
        if (window.isHost) {
            html += `<button class="btn primary" style="width:100%; margin-top:15px;" onclick="window.liarHostAction('start_turn')">설명 턴 시작하기</button>`;
        } else {
            html += `<div style="text-align:center; color:#fbbf24; margin-top:20px;">방장이 턴을 시작하기를 기다리는 중...</div>`;
        }
    }
    
    // Phase 3: 설명 턴 (turn)
    else if (data.liarState === 'turn') {
        const currentTurnId = data.turnOrder[data.turnIndex];
        const isMyTurn = (window.myPlayerId === currentTurnId);
        const turnMode = data.turnMode || 'host';
        const isLastTurn = data.turnIndex === data.turnOrder.length - 1;
        
        let turnHtml = `<div class="card" style="border: 2px solid ${isMyTurn ? 'var(--warning)' : '#475569'};">
                            <h3 style="color:${isMyTurn ? 'var(--warning)' : 'white'};">🗣️ 현재 턴: ${window.players[currentTurnId].name}</h3>`;
        
        if (turnMode.startsWith('auto_')) {
            let autoSec = parseInt(turnMode.split('_')[1]);
            turnHtml += `<div style="margin-top:15px;">
                            <div style="width:100%; height:20px; background:#1e293b; border-radius:10px; overflow:hidden;">
                                <div id="liar-turn-progress" style="width:100%; height:100%; background:var(--warning); transition: width 0.1s linear;"></div>
                            </div>
                         </div>
                         <p style="color:#aaa; margin-top:10px; text-align:center;">자동으로 턴이 넘어갑니다...</p>`;
            
            // Start local countdown for visuals
            if (window.liarTurnInterval) clearInterval(window.liarTurnInterval);
            let startTime = data.turnStartTime || Date.now();
            let duration = autoSec * 1000;
            window.liarTurnInterval = setInterval(() => {
                let bar = document.getElementById('liar-turn-progress');
                if (bar) {
                    let elapsed = Date.now() - startTime;
                    let p = Math.max(0, 100 - (elapsed / duration) * 100);
                    bar.style.width = p + '%';
                    if (elapsed > duration) clearInterval(window.liarTurnInterval);
                } else {
                    clearInterval(window.liarTurnInterval);
                }
            }, 50);
            
            // Host is responsible for actually triggering next_turn
            if (window.isHost) {
                if (window.liarHostTimeout) clearTimeout(window.liarHostTimeout);
                let remaining = Math.max(0, duration - (Date.now() - startTime));
                window.liarHostTimeout = setTimeout(() => {
                    window.liarHostAction('next_turn');
                }, remaining);
            }
        } else if (turnMode === 'self') {
            turnHtml += isMyTurn ? `<p style="font-weight:bold; color:var(--success); margin-top:10px;">말로 설명을 마치면 직접 다음 버튼을 누르세요!</p>
                                    <button class="btn primary" style="width:100%; margin-top:15px;" onclick="window.liarHostAction('next_turn')">${isLastTurn ? '설명 끝내고 투표로 가기' : '다음 사람 턴으로 넘기기'}</button>` 
                                 : `<p style="color:#aaa; margin-top:10px;">현재 턴인 플레이어가 단어를 설명 중입니다.</p>`;
        } else {
            // host mode
            turnHtml += isMyTurn ? `<p style="font-weight:bold; color:var(--success); margin-top:10px;">말로 설명을 마쳤다면 방장에게 넘겨달라고 하세요!</p>` 
                                 : `<p style="color:#aaa; margin-top:10px;">현재 턴인 플레이어가 단어를 설명 중입니다.</p>`;
        }
        
        turnHtml += `</div>`;
        html += turnHtml;
        
        if (window.isHost && turnMode === 'host') {
            html += `<button class="btn primary" style="width:100%; margin-top:15px;" onclick="window.liarHostAction('next_turn')">${isLastTurn ? '모든 설명 종료하고 투표로 가기' : '다음 사람 턴으로 넘기기'}</button>`;
        }
        if (window.isHost && turnMode !== 'host') {
            html += `<button class="btn secondary" style="width:100%; margin-top:15px; background-color:#ef4444;" onclick="window.liarHostAction('next_turn')">방장 권한으로 강제 넘기기</button>`;
        }
    }
    
    // Phase 4: 투표 (vote)
    else if (data.liarState === 'vote') {
        const myVote = (data.votes && data.votes[window.myPlayerId]) || null;
        
        html += `<div class="vote-list">`;
        Object.keys(window.players).forEach(pId => {
            if (pId === window.myPlayerId) return; // 자기 자신은 지목할 수 없다
            const isSelected = myVote === pId;
            html += `<button class="vote-btn ${isSelected ? 'selected' : ''}" onclick="window.submitLiarAction('voteTarget', '${pId}')">
                ${(window.escapeHtml || (x=>x))(window.players[pId].name)}
            </button>`;
        });
        html += `</div>`;
        
        if (window.isHost) {
            html += `<button class="btn danger" style="width:100%; margin-top:20px;" onclick="window.liarHostAction('resolve_vote')">투표 종료 및 결과 확인 (수동)</button>`;
            
            // Auto-resolve if everyone voted
            if (data.votes && Object.keys(data.votes).length === Object.keys(window.players).length && !data.isCountingDown) {
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { isCountingDown: true, countdownMsg: 3 });
                let cnt = 3;
                if (window.autoResolveInterval) clearInterval(window.autoResolveInterval);
                window.autoResolveInterval = setInterval(() => {
                    cnt--;
                    if (cnt > 0) {
                        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { countdownMsg: cnt });
                    } else {
                        clearInterval(window.autoResolveInterval);
                        window.liarHostAction('resolve_vote');
                    }
                }, 1000);
            }
        }
    }
    
    // Phase 5: 라이어의 추측 (liar_guess)
    else if (data.liarState === 'liar_guess') {
        // 스파이가 죽었든, 라이어가 죽었든 무조건 '진짜 라이어' 본인이 정답을 맞춤
        if (isLiar) {
            html += `
                <div class="card" style="border:2px solid var(--danger);">
                    <h3 style="color:var(--danger); margin-bottom:15px;">🚨 정체가 탄로 났거나, 동료(스파이)가 죽었습니다!</h3>
                    <p style="margin-bottom:15px;">마지막 기회입니다. 다수파의 진짜 제시어는 무엇일까요?</p>
                    ${data.liarGuess
                        ? `<div style="padding:14px; border-radius:10px; background:rgba(251,191,36,0.12); border:1px solid #fbbf24;">
                               <div style="color:#fbbf24; font-size:0.85rem; margin-bottom:6px;">외친 정답</div>
                               <div style="font-size:1.4rem; font-weight:900;">${(window.escapeHtml||(x=>x))(data.liarGuess)}</div>
                               <div style="color:#94a3b8; font-size:0.85rem; margin-top:8px;">결과를 기다리는 중...</div>
                           </div>`
                        : `<div style="display:flex; flex-direction:column; gap:10px;">
                               <input type="text" id="liar-guess-input" placeholder="정답 입력..." style="padding:15px; border-radius:8px; border:1px solid #475569; background:#1e293b; color:white; font-size:1.2rem; text-align:center;" onkeypress="if(event.key==='Enter') window.submitLiarGuess()">
                               <button id="liar-guess-btn" class="btn primary" onclick="window.submitLiarGuess()" style="padding:15px; font-size:1.1rem;">정답 외치기!</button>
                           </div>`}
                </div>
            `;
        } else {
            html += data.liarGuess
                ? `<div class="card info-text" style="color:var(--warning);">🤡 라이어가 <b>[${(window.escapeHtml||(x=>x))(data.liarGuess)}]</b> 라고 외쳤습니다! 판정 중...</div>`
                : `<div class="card info-text" style="color:var(--warning);">🤡 라이어가 진짜 제시어를 고민하고 있습니다... (틀리기를 기도하세요!)</div>`;
            if (window.isHost) {
                html += `<button class="btn danger" style="width:100%; margin-top:15px;" onclick="window.liarHostAction('timeout_guess')">시간 초과 (강제 오답 처리)</button>`;
            }
        }
    }
    
    // Phase 6: 게임 종료 (game_over)
    else if (data.liarState === 'game_over') {
        const esc = window.escapeHtml || (x => x);
        const rv = data.revealed || { word: data.word, liarFakeWord: data.liarFakeWord, liarId: data.liarId, spyId: data.spyId };
        const isWordMafia = data.gameMode === 'word_mafia';
        const foeLabel = isWordMafia ? '소수파' : '라이어파';
        const foeIcon  = isWordMafia ? '🎭' : '🤡';
        const liarWon  = data.winners === 'liar';

        // ── 승리 배너 (모드에 따라 이름이 달라진다) ──
        const winLabel = liarWon ? `${foeIcon} ${foeLabel} 승리!` : '👮 시민파 승리!';
        const winColor = liarWon ? 'var(--danger)' : 'var(--primary)';
        let winDesc;
        if (liarWon) {
            winDesc = data.guessResult === 'correct'
                ? (isWordMafia ? '소수파가 시민파의 단어를 맞혔습니다!' : '라이어가 제시어를 맞혔습니다!')
                : '시민들이 엉뚱한 사람을 지목했습니다!';
        } else {
            winDesc = isWordMafia ? '시민파가 소수파를 찾아냈습니다!' : '라이어를 찾아냈습니다!';
        }

        html += `<div class="card" style="border:2px solid ${winColor}; text-align:center;">
                    <h1 style="color:${winColor}; font-size:2.1rem; margin-bottom:8px; line-height:1.3;">${winLabel}</h1>
                    <p style="color:#cbd5e1; font-size:0.95rem;">${winDesc}</p>
                 </div>`;

        // ── 제시어 ──
        if (isWordMafia) {
            html += `<div class="card" style="margin-top:12px; display:flex; gap:10px;">
                        <div style="flex:1; padding:12px; border-radius:10px; background:rgba(59,130,246,0.12); border:1px solid #3b82f6; text-align:center;">
                            <div style="font-size:0.8rem; color:#93c5fd; margin-bottom:4px;">시민파 단어</div>
                            <div style="font-size:1.4rem; font-weight:900; color:#dbeafe;">${esc(rv.word || '-')}</div>
                        </div>
                        <div style="flex:1; padding:12px; border-radius:10px; background:rgba(239,68,68,0.12); border:1px solid #ef4444; text-align:center;">
                            <div style="font-size:0.8rem; color:#fca5a5; margin-bottom:4px;">소수파 단어</div>
                            <div style="font-size:1.4rem; font-weight:900; color:#fee2e2;">${esc(rv.liarFakeWord || '-')}</div>
                        </div>
                     </div>`;
        } else {
            html += `<div class="card" style="margin-top:12px; text-align:center;">
                        <div style="font-size:0.85rem; color:#94a3b8; margin-bottom:6px;">제시어</div>
                        <div style="font-size:2rem; font-weight:900; color:#fbbf24;">${esc(rv.word || '-')}</div>
                     </div>`;
        }

        // ── 팀 명단 ──
        const foeIds = [rv.liarId].concat(rv.spyId ? [rv.spyId] : []).filter(Boolean);
        const citizenIds = Object.keys(window.players).filter(id => foeIds.indexOf(id) === -1);
        const chip = (id, tag, color) =>
            `<span style="display:inline-block; margin:3px; padding:6px 12px; border-radius:999px;
                          background:${color}22; border:1px solid ${color}; color:#f8fafc; font-size:0.9rem;">
                ${esc((window.players[id] || {}).name || '나간 사람')}${tag ? ` <span style="color:${color}; font-size:0.75rem; font-weight:bold;">${tag}</span>` : ''}
             </span>`;

        html += `<div class="card" style="margin-top:12px; text-align:left;">
                    <div style="margin-bottom:14px;">
                        <div style="color:#60a5fa; font-weight:bold; margin-bottom:8px;">
                            👮 시민파 <span style="color:#94a3b8; font-weight:normal; font-size:0.85rem;">${citizenIds.length}명</span>
                        </div>
                        <div>${citizenIds.map(id => chip(id, '', '#3b82f6')).join('')}</div>
                    </div>
                    <div style="border-top:1px solid rgba(255,255,255,0.12); padding-top:14px;">
                        <div style="color:#f87171; font-weight:bold; margin-bottom:8px;">
                            ${foeIcon} ${foeLabel} <span style="color:#94a3b8; font-weight:normal; font-size:0.85rem;">${foeIds.length}명</span>
                        </div>
                        <div>${chip(rv.liarId, isWordMafia ? '소수파' : '라이어', '#ef4444')}${rv.spyId ? chip(rv.spyId, '스파이', '#f59e0b') : ''}</div>
                    </div>
                 </div>`;
    }

    // ── 투표 결과 (liar_guess · game_over 에서 표시) ──
    if (data.votes && (data.liarState === 'liar_guess' || data.liarState === 'game_over')) {
        const esc2 = window.escapeHtml || (x => x);
        const counts = {};
        Object.keys(data.votes).forEach(voter => {
            const t = data.votes[voter];
            (counts[t] = counts[t] || []).push(voter);
        });
        const total = Object.keys(data.votes).length || 1;
        const sorted = Object.keys(counts).sort((a, b) => counts[b].length - counts[a].length);
        const maxCount = sorted.length ? counts[sorted[0]].length : 0;

        let vh = `<div class="card" style="margin-top:12px; text-align:left;">
                    <h3 style="margin-bottom:14px; color:#fbbf24;">🗳️ 투표 결과</h3>`;
        sorted.forEach(t => {
            const n = counts[t].length;
            const pct = Math.round((n / total) * 100);
            const top = (n === maxCount);
            const voters = counts[t].map(v => esc2((window.players[v] || {}).name || '?')).join(', ');
            vh += `<div style="margin-bottom:14px;">
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <b style="color:${top ? '#fbbf24' : '#e2e8f0'}; font-size:0.98rem;">${top ? '👑 ' : ''}${esc2((window.players[t] || {}).name || '?')}</b>
                        <span style="color:${top ? '#fbbf24' : '#94a3b8'}; font-weight:bold; white-space:nowrap;">${n}표</span>
                     </div>
                     <div style="height:9px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:${top ? '#fbbf24' : '#64748b'}; border-radius:999px;"></div>
                     </div>
                     <div style="font-size:0.8rem; color:#94a3b8; margin-top:5px;">↳ ${voters}</div>
                   </div>`;
        });
        vh += `</div>`;
        html += vh;
    }

    // 게임 오버 시 다시하기 버튼은 항상 맨 아래에
    if (data.liarState === 'game_over' && window.isHost) {
        html += `<button class="btn primary" style="width:100%; margin-top:20px;" onclick="window.liarHostAction('reset')">다시 라이어 게임 하기 (설정으로 돌아가기)</button>`;
    }

    // 카운트다운 깃발이 남아 화면을 덮는 사고 방지 (마피아와 동일)
    const countdownStale = data.liarState === 'game_over' || !data.countdownMsg;
    if (data.isCountingDown && countdownStale) {
        if (window.isHost && window.myRoom) {
            window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom),
                { isCountingDown: null, countdownMsg: null });
        }
    }
    else if (data.isCountingDown) {
        html += `<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; flex-direction:column; backdrop-filter: blur(5px);">
                    <div style="font-size:1.5rem; color:white; margin-bottom:20px;">투표 완료! 결과 확인까지...</div>
                    <div style="font-size:10rem; font-weight:bold; color:var(--primary); text-shadow: 0 0 30px var(--primary); animation: pulse 1s infinite;">
                        ${data.countdownMsg}
                    </div>
                 </div>`;
    }

    content.innerHTML = html;
};

// Player Action
window.submitLiarAction = function(actionKey, value) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    if (actionKey === 'voteTarget') {
        window.firebaseUpdate(window.firebaseChild(roomRef, 'votes'), { [window.myPlayerId]: value });
    }
};

window.submitLiarGuess = function() {
    const input = document.getElementById('liar-guess-input');
    if (!input || !input.value.trim()) return;

    // 라이어 화면에는 진짜 제시어가 없다(방장 전용 secret).
    // 그래서 정답 여부는 제출만 하고 방장이 판정한다.
    const btn = document.getElementById('liar-guess-btn');
    if (btn) { btn.disabled = true; btn.innerText = '제출 중...'; }

    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        liarGuess: input.value.trim()
    });
};

// 방장만 진짜 제시어를 볼 수 있으므로, 판정도 방장이 한다.
function hostJudgeLiarGuess(data) {
    if (!window.isHost || !window.myRoom) return;
    if (data.liarState !== 'liar_guess' || !data.liarGuess) return;

    const sec = (window._secret && window._secret.liar) || null;
    const actualRaw = (sec && sec.word) || data.word;
    if (!actualRaw) return; // 아직 secret 을 못 받았으면 다음 스냅샷에서 다시 시도

    if (window._judgingGuess === data.liarGuess) return; // 중복 판정 방지
    window._judgingGuess = data.liarGuess;

    const norm = (v) => String(v).replace(/\s/g, '').toLowerCase();
    const correct = norm(data.liarGuess) === norm(actualRaw);
    const liarName = (window.players[(sec && sec.liarId) || data.liarId] || {}).name || '라이어';
    const esc = window.escapeHtml || (x => x);

    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        liarState: 'game_over',
        winners: correct ? 'liar' : 'citizen',
        guessResult: correct ? 'correct' : 'wrong',
        liarGuess: null,
        msg: correct
            ? `<b>${esc(liarName)}</b>가 정답 <b>[${esc(data.liarGuess)}]</b>(을)를 맞혔습니다! 소름! 😱`
            : `<b>${esc(liarName)}</b>가 오답 <b>[${esc(data.liarGuess)}]</b>(을)를 외치고 장렬히 전사했습니다! 🤣`
    });
}

// Host Action
window.liarHostAction = async function(command) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snapshot = await window.firebaseGet(roomRef);
    const data = mergeLiarSecret(snapshot.val());
    let updates = {};

    if (command === 'start_turn') {
        updates.liarState = 'turn';
        updates.turnStartTime = Date.now(); // For auto timer sync
        updates.msg = '제시어를 눈치껏 설명하세요! 너무 정확하게 말하면 라이어가 눈치챕니다.';
    }
    else if (command === 'next_turn') {
        if (window.liarHostTimeout) clearTimeout(window.liarHostTimeout); // clear any pending auto timeouts
        if (data.turnIndex < data.turnOrder.length - 1) {
            updates.turnIndex = data.turnIndex + 1;
            updates.turnStartTime = Date.now(); // Reset timer for next turn
        } else {
            updates.liarState = 'vote';
            updates.msg = '모든 사람의 설명이 끝났습니다. 누가 의심스러운지 투표하세요!';
            
            let botVotes = {};
            const pKeys = Object.keys(window.players);
            pKeys.forEach(pId => {
                if (window.players[pId].isBot) {
                    botVotes[pId] = pKeys[Math.floor(Math.random() * pKeys.length)];
                }
            });
            if (Object.keys(botVotes).length > 0) updates.votes = botVotes;
        }
    }
    else if (command === 'resolve_vote') {
        updates.isCountingDown = null;
        updates.countdownMsg = null;
        const votes = data.votes || {};
        let counts = {};
        Object.keys(votes).forEach(voter => {
            const target = votes[voter];
            counts[target] = (counts[target] || 0) + 1;
        });
        
        let maxVotes = 0;
        let accusedId = null;
        let tie = false;
        
        for (const [id, count] of Object.entries(counts)) {
            if (count > maxVotes) { maxVotes = count; accusedId = id; tie = false; } 
            else if (count === maxVotes) { tie = true; }
        }
        
        if (tie || !accusedId) {
            updates.msg = "동표이거나 기권이 많아 아무도 지목되지 않았습니다. 투표를 다시 진행해 주세요!";
            updates.votes = null;
            let botVotes = {};
            const pKeys = Object.keys(window.players);
            pKeys.forEach(pId => {
                if (window.players[pId].isBot) {
                    botVotes[pId] = pKeys[Math.floor(Math.random() * pKeys.length)];
                }
            });
            if (Object.keys(botVotes).length > 0) updates.votes = botVotes;
        } else {
            updates.defendant = accusedId;
            
            if (accusedId === data.liarId) {
                updates.liarState = 'liar_guess';
                updates.msg = `<b>${window.players[accusedId].name}</b>님이 소수파/라이어로 검거되었습니다!<br>마지막으로 다수파의 단어를 맞출 기회를 드립니다.`;
                
                if (window.players[data.liarId].isBot) {
                    // Bot Guess Logic
                    let randomGuess = '';
                    if (data.gameMode === 'word_mafia') {
                        // Word Mafia 봇은 그냥 다수파 단어 맞출 확률 50%
                        randomGuess = Math.random() > 0.5 ? data.word : "아무단어";
                    } else {
                        const words = LIAR_DICTIONARY[data.category] || [];
                        randomGuess = words.length > 0 ? words[Math.floor(Math.random() * words.length)] : "모름";
                    }
                    
                    if (randomGuess === data.word) {
                        updates.liarState = 'game_over';
                        updates.winners = 'liar';
                        updates.guessResult = 'correct';
                        updates.msg = `<b>${window.players[data.liarId].name}</b>(라이어 봇)가 정답 <b>[${randomGuess}]</b>(을)를 맞혔습니다! 소름! 😱`;
                    } else {
                        updates.liarState = 'game_over';
                        updates.winners = 'citizen';
                        updates.guessResult = 'wrong';
                        updates.msg = `<b>${window.players[data.liarId].name}</b>(라이어 봇)가 오답 <b>[${randomGuess}]</b>(을)를 외치고 장렬히 전사했습니다! 🤣`;
                    }
                }
            } else if (accusedId === data.spyId) {
                updates.liarState = 'game_over';
                updates.winners = 'citizen';
                updates.guessResult = 'wrong';
                updates.msg = `<b>${window.players[accusedId].name}</b>님은 스파이였습니다!<br>스파이가 꼬리를 밟혀 라이어 팀이 패배했습니다. 시민 승리! 👮`;
            } else {
                updates.liarState = 'game_over';
                updates.winners = 'liar';
                updates.msg = `<b>${window.players[accusedId].name}</b>님은 억울한 다수파 시민이었습니다!<br>선량한 시민을 죽인 죄로 라이어 팀이 승리합니다. 🤡`;
            }
        }
    }
    else if (command === 'timeout_guess') {
        updates.liarState = 'game_over';
        updates.winners = 'citizen';
        updates.guessResult = 'wrong';
        updates.msg = `시간이 초과되어 라이어 팀이 졌습니다. 시민 승리! 👮`;
    }
    else if (command === 'reset') {
        window._judgingGuess = null;
        updates.liarGuess = null;
        updates.liarState = null;
        updates.votes = null;
        updates.winners = null;
        updates.guessResult = null;
        updates.msg = null;
        updates.liarId = null;
        updates.spyId = null;
        updates.category = null;
        updates.word = null;
        updates.liarFakeWord = null;
        updates.turnIndex = 0;
        updates.turnOrder = null;
        updates.defendant = null;
        updates.gameMode = null;
        updates.isCountingDown = null;
        updates.countdownMsg = null;
    }
    
    // 명령이 실행됐다면 카운트다운은 끝난 것이다 (하나라도 빠뜨리면 화면이 멈춘다)
    if (!('isCountingDown' in updates)) {
        updates.isCountingDown = null;
        updates.countdownMsg = null;
    }

    window.firebaseUpdate(roomRef, updates);
};
