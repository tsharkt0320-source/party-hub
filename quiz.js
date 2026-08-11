// quiz.js

function getCategoriesForMode(mode) {
    if (!window.QUIZ_DB[mode]) return ['랜덤'];
    const cats = Object.keys(window.QUIZ_DB[mode]);
    // 실제 카테고리가 하나뿐이면 '랜덤'은 그것과 완전히 같은 결과라서 고를 이유가 없다
    const real = cats.filter(c => c !== '랜덤');
    if (real.length <= 1) return real.length ? real : ['랜덤'];
    return cats;
}

window.updateQuiz = function(data) {
    const content = document.getElementById('quiz-content');
    let html = '';
    
    // === Global Scoreboard (top-right style inline) ===
    const globalTeams = data.globalTeams || {};
    const teamAName = data.teamAName || 'A팀';
    const teamBName = data.teamBName || 'B팀';
    const globalScores = data.globalScores || {};
    const individualScores = data.individualScores || {};
    
    // Team score summary bar
    let teamAScore = 0, teamBScore = 0;
    Object.keys(globalScores).forEach(pId => {
        let t = globalTeams[pId] || 'A';
        if (t === 'A') teamAScore += (globalScores[pId] || 0);
        else teamBScore += (globalScores[pId] || 0);
    });
    
    html += `<div style="display:flex; justify-content:space-between; margin-bottom:15px; gap:10px;">
                <div style="flex:1; background:rgba(59,130,246,0.2); border:1px solid #3b82f6; border-radius:10px; padding:8px; text-align:center;">
                    <div style="font-size:0.8rem; color:#93c5fd;">${teamAName}</div>
                    <div style="font-size:1.5rem; font-weight:900; color:#3b82f6;">${teamAScore}점</div>
                </div>
                <div style="flex:1; background:rgba(239,68,68,0.2); border:1px solid #ef4444; border-radius:10px; padding:8px; text-align:center;">
                    <div style="font-size:0.8rem; color:#fca5a5;">${teamBName}</div>
                    <div style="font-size:1.5rem; font-weight:900; color:#ef4444;">${teamBScore}점</div>
                </div>
             </div>`;
    
    // Individual scores bar
    if (Object.keys(individualScores).length > 0) {
        html += `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:15px; justify-content:center;">`;
        Object.keys(individualScores).forEach(pId => {
            if (window.players[pId]) {
                let t = globalTeams[pId] || 'A';
                let color = t === 'A' ? '#3b82f6' : '#ef4444';
                html += `<div style="background:rgba(0,0,0,0.3); padding:3px 10px; border-radius:15px; font-size:0.75rem; border-left:3px solid ${color};">
                            ${window.players[pId].name}: <span style="color:${color}; font-weight:bold;">${individualScores[pId]}점</span>
                         </div>`;
            }
        });
        html += `</div>`;
    }

    if (!data.quizState) {
        // === LOBBY ===
        const selectedMode = data.setupMode || 'initial';
        const selectedCat = data.setupCategory || '랜덤';
        const buzzerEnabled = data.buzzer_enabled || false;
        const buzzerMode = data.buzzer_mode || 'A';
        const timerSeconds = data.timer_seconds || 3;
        const winPoints = data.win_points || 1;
        const losePoints = data.lose_points || 0;
        
        let modeOptions = [
            { id: 'initial', name: '초성 퀴즈' },
            { id: 'words4', name: '4글자 이어말하기 (육성만가능)' },
            { id: 'charades', name: '몸으로 말해요' },
            { id: 'person_image', name: '인물 퀴즈 (사진)' },
            { id: 'person_text', name: '인물 퀴즈 (스무고개)' },
            { id: 'proverb_meaning', name: '속담 뜻 맞추기' },
            { id: 'buzzer_only', name: '🚨 부저만 사용하기' }
        ];

        let modeSelectHtml = modeOptions.map(m => 
            `<option value="${m.id}" ${selectedMode === m.id ? 'selected' : ''}>${m.name}</option>`
        ).join('');
        
        let cats = getCategoriesForMode(selectedMode);
        let catSelectHtml = cats.map(c => 
            `<option value="${c}" ${selectedCat === c ? 'selected' : ''}>${c}</option>`
        ).join('');

        if (window.isHost) {
            html += `<div class="card">
                    <h3 style="color:var(--primary); margin-bottom:15px;">게임 설정</h3>
                    <div style="margin-bottom:10px; text-align:left;">
                        <label style="color:#cbd5e1; font-size:0.9rem;">게임 모드</label>
                        <select id="quiz-mode-select" class="input-group input" style="width:100%; margin-top:5px; padding:10px;" onchange="window.updateQuizSetup()">
                            ${modeSelectHtml}
                        </select>
                    </div>`;
            
            // Category (not for buzzer_only)
            if (selectedMode !== 'buzzer_only') {
                html += `<div style="margin-bottom:15px; text-align:left;">
                        <label style="color:#cbd5e1; font-size:0.9rem;">카테고리</label>
                        <select id="quiz-cat-select" class="input-group input" style="width:100%; margin-top:5px; padding:10px;" onchange="window.updateQuizSetup()">
                            ${catSelectHtml}
                        </select>
                    </div>`;
            }
            
            // Points multiplier
            html += `<div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; text-align:left;">
                        <label style="color:#fbbf24; font-size:0.9rem; font-weight:bold;">점수 배율</label>
                        <div style="display:flex; gap:10px; margin-top:5px;">
                            <div style="flex:1;">
                                <label style="color:#cbd5e1; font-size:0.8rem;">승리</label>
                                <select id="quiz-win-points" class="input-group input" style="width:100%; padding:8px;" onchange="window.updateQuizSetup()">
                                    ${[1,2,3,5].map(v => `<option value="${v}" ${winPoints==v?'selected':''}>${v}점</option>`).join('')}
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="color:#cbd5e1; font-size:0.8rem;">패배</label>
                                <select id="quiz-lose-points" class="input-group input" style="width:100%; padding:8px;" onchange="window.updateQuizSetup()">
                                    ${[0,1].map(v => `<option value="${v}" ${losePoints==v?'selected':''}>${v}점</option>`).join('')}
                                </select>
                            </div>
                        </div>
                     </div>`;

            // Buzzer toggle (not for words4 or buzzer_only)
            if (selectedMode !== 'words4' && selectedMode !== 'buzzer_only') {
                html += `<div style="margin-bottom:15px; text-align:left;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="checkbox" id="quiz-buzzer-toggle" ${buzzerEnabled?'checked':''} onchange="window.toggleBuzzer()">
                                <span style="color:#cbd5e1; font-size:0.9rem;">🚨 부저 사용</span>
                            </label>
                         </div>`;
                if (buzzerEnabled) {
                    html += `<div style="margin-bottom:15px; text-align:left; padding-left:20px;">
                                <label style="display:block; margin-bottom:5px; cursor:pointer;">
                                    <input type="radio" name="buzzer_mode" value="A" ${buzzerMode==='A'?'checked':''} onclick="window.setBuzzerMode('A')">
                                    <span style="color:#cbd5e1; font-size:0.85rem;">번갈아가며 누르기</span>
                                </label>
                                <label style="display:block; cursor:pointer;">
                                    <input type="radio" name="buzzer_mode" value="B" ${buzzerMode==='B'?'checked':''} onclick="window.setBuzzerMode('B')">
                                    <span style="color:#cbd5e1; font-size:0.85rem;">아무나 무제한</span>
                                </label>
                             </div>`;
                }
            }
            
            // Timer for words4
            if (selectedMode === 'words4') {
                html += `<div style="margin-bottom:15px; text-align:left;">
                            <label style="color:#cbd5e1; font-size:0.9rem;">⏱ 제한 시간</label>
                            <select id="quiz-timer-select" class="input-group input" style="width:100%; margin-top:5px; padding:10px;" onchange="window.updateQuizSetup()">
                                ${[1,2,3,4,5,6].map(v => `<option value="${v}" ${timerSeconds==v?'selected':''}>${v}초</option>`).join('')}
                            </select>
                         </div>`;
            }

            // Team setup for charades
            if (selectedMode === 'charades') {
                const teams = data.teams || {};
                const describer = data.describer || null;
                
                html += `<div style="margin-bottom:20px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                            <h4 style="color:#fbbf24; margin-bottom:10px;">출제자 선택</h4>`;
                Object.keys(window.players).forEach(pId => {
                    let isDesc = (describer === pId);
                    html += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; padding:5px; border-radius:6px; ${isDesc?'background:rgba(251,191,36,0.2);':''}">
                                <span>${window.players[pId].name}</span>
                                <button class="btn ${isDesc?'primary':'secondary'}" style="padding:2px 10px; font-size:0.8rem; ${isDesc?'background:#fbbf24; color:black;':''}" onclick="window.setQuizDescriber('${pId}')">${isDesc?'✓ 출제자':'선택'}</button>
                             </div>`;
                });
                html += `</div>`;
            }

            html += `<button id="btn-start-quiz" class="btn primary" style="width:100%; font-size:1.2rem; padding:15px;" onclick="window.startQuizGame()">🚀 ${selectedMode === 'buzzer_only' ? '부저 시작' : '문제 출제하기'}</button>
                </div>
                <button class="btn secondary" style="width:100%; margin-top:10px;" onclick="window.resetQuizScores()">점수 초기화</button>
                <button class="btn" style="width:100%; margin-top:10px; background:#7f1d1d; color:white;" onclick="window.resetUsedQuestions()">🔄 사용된 문제 내역 초기화</button>
            `;
        } else {
            // Guest view
            html += `<div class="card">
                        <h3 style="color:var(--text-muted)">게임 설정 중...</h3>
                        <p style="margin-top:15px;">방장이 <b>${modeOptions.find(m=>m.id===selectedMode)?.name || '게임'}</b> 모드를 준비하고 있습니다.</p>
                     </div>`;
        }
    } 
    else if (data.quizState === 'playing') {
        const mode = data.gameMode;
        const isCharades = mode === 'charades';
        const isWords4 = mode === 'words4';
        const isBuzzerOnly = mode === 'buzzer_only';
        const buzzerEnabled = data.buzzer_enabled || false;
        const myTeam = (data.globalTeams && data.globalTeams[window.myPlayerId]) || 'A';
        const amIDescriber = window.myPlayerId === data.describer;
        const amICaptain = data.captain === window.myPlayerId;
        const canControl = window.isHost || amICaptain;

        // === QUESTION DISPLAY ===
        if (!isBuzzerOnly) {
            html += `<div class="card" style="margin-bottom:20px;">
                        <div style="color:var(--text-muted); font-size:0.9rem; margin-bottom:10px;">${data.category || ''}</div>`;
            
            if (mode === 'person_image') {
                html += `<h3 style="margin-bottom:15px;">${data.question}</h3>
                         <img src="${data.img}" style="max-width:100%; max-height:300px; border-radius:10px; box-shadow:0 4px 6px rgba(0,0,0,0.5); object-fit:contain;">`;
            } 
            else if (mode === 'person_text') {
                html += `<h3 style="margin-bottom:15px; line-height:1.5;">${data.question}</h3>`;
                if (data.hints) {
                    const revealedCount = data.hintsRevealed || 0;
                    const totalPlayers = Object.keys(window.players).length;
                    const hintVotes = data.hintVotes || {};
                    const voteCount = Object.keys(hintVotes).length;
                    const iVoted = !!hintVotes[window.myPlayerId];
                    
                    html += `<div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:8px; text-align:left;">`;
                    data.hints.forEach((h, i) => {
                        if (i < revealedCount) {
                            html += `<div style="margin-bottom:8px; color:#cbd5e1; animation: fadeIn 0.5s;">💡 힌트 ${i+1}: <b>${h}</b></div>`;
                        } else {
                            html += `<div style="margin-bottom:8px; color:#4b5563;">🔒 힌트 ${i+1}: ???</div>`;
                        }
                    });
                    html += `</div>`;
                    
                    if (revealedCount < data.hints.length && !data.winner) {
                        html += `<div style="margin-top:10px; text-align:center;">
                                    <button class="btn ${iVoted?'secondary':'primary'}" style="padding:10px 20px;" onclick="window.voteHint()" ${iVoted?'disabled':''}>
                                        ${iVoted ? '✓ 투표 완료' : '💡 힌트 하나 더 보기'}
                                    </button>
                                    <div style="color:var(--text-muted); font-size:0.8rem; margin-top:5px;">${voteCount}/${totalPlayers}명 투표</div>
                                 </div>`;
                    }
                }
            }
            else if (mode === 'proverb_meaning') {
                html += `<h3 style="margin-bottom:15px; line-height:1.5; font-size:1.1rem;">${data.question}</h3>`;
            }
            else if (isCharades) {
                if (amIDescriber) {
                    html += `<div style="font-size: 1.2rem; margin-bottom:10px; color:#fbbf24;">당신은 출제자입니다! 몸으로 설명하세요!</div>
                             <div style="font-size: 3rem; font-weight: 900; color: var(--danger); margin: 20px 0;">${data.answer}</div>`;
                } else {
                    html += `<div style="font-size: 1.2rem; margin-bottom:10px; color:#22c55e;">화면을 보고 정답을 맞혀보세요!</div>
                             <div style="font-size: 3rem; font-weight: 900; color: #94a3b8; margin: 20px 0;">???</div>`;
                }
            }
            else if (isWords4) {
                // 4글자 이어말하기 - show word + timer
                html += `<div style="font-size: 3.5rem; font-weight: 900; color: var(--primary); letter-spacing: 5px; margin: 20px 0; text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);">
                            ${data.question}
                        </div>`;
                if (data.words4_failed) {
                    html += `<div style="font-size: 3rem; font-weight: 900; color: var(--danger); margin: 20px 0; animation: pulse 0.5s infinite;">
                                ⏰ 실패!
                             </div>
                             <div style="color:var(--text-muted); font-size:1.2rem;">정답: <b>${data.answer}</b></div>`;
                } else if (data.words4_timer > 0) {
                    html += `<div style="font-size: 2rem; font-weight: 900; color: ${data.words4_timer <= 1 ? 'var(--danger)' : '#fbbf24'}; margin: 10px 0;">
                                ⏱ ${data.words4_timer}초
                             </div>`;
                }
            }
            else {
                // Initial / default
                html += `<div style="font-size: 3.5rem; font-weight: 900; color: var(--primary); letter-spacing: 5px; margin: 20px 0; text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);">
                            ${data.question}
                        </div>`;
            }
            html += `</div>`;
        }

        // === WINNER DISPLAY ===
        if (data.winner) {
            let winName = window.players[data.winner]?.name || '누군가';
            html += `
                <div class="card" style="background:var(--success); border: 2px solid #fff; box-shadow: 0 0 20px var(--success); animation: pulse 1s infinite;">
                    <h3 style="color:white; margin-bottom:10px;">🎉 정답입니다! 🎉</h3>
                    <p style="font-size:1.5rem; color:white; font-weight:bold;">정답: ${data.answer}</p>
                    <p style="font-size:1.2rem; color:white; margin-top:10px;">맞힌 사람: <strong>${winName}</strong></p>
                </div>`;
            if (canControl) {
                html += `<div style="display:flex; gap:10px; margin-top:20px;">
                            <button class="btn primary" style="flex:1; padding:15px; font-size:1.1rem;" onclick="window.startQuizGame()">▶ 다음 문제</button>
                            <button class="btn secondary" style="padding:15px;" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
                         </div>`;
            }
        } else {
            // === INPUT / BUZZER AREA ===
            if (isBuzzerOnly) {
                // Standalone buzzer
                if (data.buzzer_countdown > 0) {
                    html += `<div class="card" style="text-align:center;">
                                <div style="font-size:6rem; font-weight:900; color:#fbbf24; animation: pulse 1s infinite;">${data.buzzer_countdown}</div>
                             </div>`;
                } else if (data.buzzer_winner) {
                    let bName = window.players[data.buzzer_winner]?.name || '누군가';
                    html += `<div class="card" style="background:rgba(239,68,68,0.2); border:2px solid var(--danger);">
                                <h2 style="color:var(--danger); margin-bottom:10px;">🚨 ${bName}!</h2>
                             </div>`;
                    if (canControl) {
                        html += `<button class="btn primary" style="width:100%; margin-top:15px; padding:15px;" onclick="window.resetBuzzerOnly()">🔄 부저 리셋</button>`;
                    }
                } else {
                    html += `<button class="btn danger" style="width:100%; height:200px; font-size:4rem; border-radius:20px; box-shadow: 0 10px 0 #991b1b;" onclick="window.pressBuzzer()">🚨</button>`;
                }
                if (canControl) {
                    html += `<button class="btn secondary" style="width:100%; margin-top:15px;" onclick="window.backToQuizLobby()">⚙️ 설정으로</button>`;
                }
            }
            else if (isWords4 && !data.words4_failed) {
                // 4글자 - no input, just next button for host/captain
                if (canControl) {
                    html += `<div style="display:flex; gap:10px; margin-top:10px;">
                                <button class="btn primary" style="flex:1; padding:15px; font-size:1.1rem;" onclick="window.startQuizGame()">▶ 다음 문제</button>
                                <button class="btn secondary" style="padding:15px;" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
                             </div>`;
                }
            }
            else if (isWords4 && data.words4_failed) {
                if (canControl) {
                    html += `<div style="display:flex; gap:10px; margin-top:20px;">
                                <button class="btn primary" style="flex:1; padding:15px; font-size:1.1rem;" onclick="window.startQuizGame()">▶ 다음 문제</button>
                                <button class="btn secondary" style="padding:15px;" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
                             </div>`;
                }
            }
            else if (buzzerEnabled || isCharades) {
                // Buzzer mode
                if (data.buzzer_countdown > 0) {
                    html += `<div class="card" style="text-align:center;">
                                <div style="font-size:5rem; font-weight:900; color:#fbbf24; animation: pulse 1s infinite;">${data.buzzer_countdown}</div>
                                <p style="color:var(--text-muted);">부저 준비...</p>
                             </div>`;
                } else if (data.buzzer_winner) {
                    let bName = window.players[data.buzzer_winner]?.name || '누군가';
                    html += `<div class="card" style="background:rgba(239,68,68,0.2); border:2px solid var(--danger);">
                                <h2 style="color:var(--danger); margin-bottom:10px;">🚨 부저가 울렸습니다!</h2>
                                <p style="font-size:1.5rem; color:white;"><strong>${bName}</strong></p>
                             </div>`;
                    if (canControl) {
                        html += `<div style="display:flex; gap:10px; margin-top:15px;">
                                    <button class="btn primary" style="flex:1; padding:15px; font-size:1.1rem;" onclick="window.hostBuzzerCorrect('${data.buzzer_winner}')">⭕ 정답</button>
                                    <button class="btn danger" style="flex:1; padding:15px; font-size:1.1rem;" onclick="window.hostBuzzerWrong()">❌ 오답</button>
                                 </div>`;
                    }
                } else if (amIDescriber) {
                    html += `<div class="card info-text" style="text-align:center;">출제자는 부저를 누를 수 없습니다.</div>`;
                } else {
                    let canPress = true;
                    if (data.buzzer_mode === 'A' && data.last_buzzer_team) {
                        if (myTeam === data.last_buzzer_team) canPress = false;
                    }
                    if (canPress) {
                        html += `<button class="btn danger" style="width:100%; height:150px; font-size:3rem; border-radius:20px; box-shadow: 0 10px 0 #991b1b;" onclick="window.pressBuzzer()">🚨 부저!</button>`;
                    } else {
                        html += `<div class="card" style="text-align:center; opacity:0.5;"><h3 style="color:var(--text-muted);">상대팀 차례...</h3></div>`;
                    }
                }
                if (canControl && !data.buzzer_winner) {
                    html += `<div style="display:flex; gap:10px; margin-top:15px;">
                                <button class="btn primary" style="flex:1; padding:12px;" onclick="window.startQuizGame()">▶ 다음</button>
                                <button class="btn secondary" style="padding:12px;" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
                             </div>`;
                }
            }
            else {
                // Normal text input mode (초성, 인물, 속담 etc.)
                html += `<div class="input-group" style="display:flex; gap:10px;">
                            <input type="text" id="input-guess" placeholder="정답을 입력하세요" style="flex:1; font-size:1.2rem; padding:15px;" onkeypress="if(event.key==='Enter') window.submitGuess('${data.answer.replace(/'/g, "\\'")}')">
                            <button class="btn primary" style="padding:0 20px; font-size:1.1rem;" onclick="window.submitGuess('${data.answer.replace(/'/g, "\\'")}')">확인</button>
                        </div>`;
                if (canControl) {
                    html += `<div style="display:flex; gap:10px; margin-top:15px;">
                                <button class="btn primary" style="flex:1; padding:12px;" onclick="window.startQuizGame()">▶ 다음 문제</button>
                                <button class="btn secondary" style="padding:12px;" onclick="window.hostForceCorrect()" title="아무도 못 맞혔을 때 방장이 정답을 공개합니다">정답 공개</button>
                                <button class="btn secondary" style="padding:12px;" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
                             </div>`;
                }
            }
        }
    }

    content.innerHTML = html;
};

// === SETUP ACTIONS ===
window.updateQuizSetup = function() {
    if (!window.isHost) return;
    const modeEl = document.getElementById('quiz-mode-select');
    const catEl = document.getElementById('quiz-cat-select');
    const timerEl = document.getElementById('quiz-timer-select');
    const winEl = document.getElementById('quiz-win-points');
    const loseEl = document.getElementById('quiz-lose-points');
    
    const mode = modeEl ? modeEl.value : 'initial';
    let selectedCat = catEl ? catEl.value : '랜덤';
    
    let cats = getCategoriesForMode(mode);
    if (!cats.includes(selectedCat)) {
        selectedCat = cats.includes('랜덤') ? '랜덤' : cats[0];
    }
    
    let updates = { setupMode: mode, setupCategory: selectedCat };
    if (timerEl) updates.timer_seconds = parseInt(timerEl.value);
    if (winEl) updates.win_points = parseInt(winEl.value);
    if (loseEl) updates.lose_points = parseInt(loseEl.value);
    
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), updates);
};

window.toggleBuzzer = function() {
    if (!window.isHost) return;
    const el = document.getElementById('quiz-buzzer-toggle');
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        buzzer_enabled: el ? el.checked : false
    });
};

window.setBuzzerMode = function(mode) {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { buzzer_mode: mode });
};

window.setQuizTeam = function(pId, teamId) {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseChild(window.firebaseRef(window.db, 'rooms/' + window.myRoom), 'globalTeams'), { [pId]: teamId });
};

window.setQuizDescriber = function(pId) {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { describer: pId });
};

window.resetUsedQuestions = function() {
    if (!window.isHost) return;
    if (confirm("리셋되면 나왔던 항목이 전부 다시 리셋되서 초기화 됩니다. 그래도 하시겠습니까?")) {
        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { usedQuestions: [] });
    }
};

window.resetQuizScores = function() {
    if (!window.isHost) return;
    if (confirm("모든 점수를 초기화합니다. 계속하시겠습니까?")) {
        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { 
            scores: {}, individualScores: {}, globalScores: {} 
        });
    }
};

// === GAME ACTIONS ===
window.startQuizGame = async function() {
    if (!window.isHost && !window._isCaptain) return;
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snapshot = await window.firebaseGet(roomRef);
    const data = snapshot.val();
    
    const mode = data.setupMode || 'initial';
    let cat = data.setupCategory || '랜덤';
    const buzzerEnabled = data.buzzer_enabled || false;
    const winPoints = data.win_points || 1;
    
    if (mode === 'buzzer_only') {
        window.firebaseUpdate(roomRef, {
            quizState: 'playing', gameMode: 'buzzer_only',
            buzzer_countdown: 3, buzzer_active: false, buzzer_winner: null
        });
        let c = 3;
        let iv = setInterval(() => {
            c--;
            if (c <= 0) { clearInterval(iv); window.firebaseUpdate(roomRef, { buzzer_countdown: 0, buzzer_active: true }); }
            else { window.firebaseUpdate(roomRef, { buzzer_countdown: c }); }
        }, 1000);
        return;
    }
    
    if (!window.QUIZ_DB[mode] || !window.QUIZ_DB[mode][cat]) { cat = '랜덤'; }
    const questions = window.QUIZ_DB[mode][cat];
    if (!questions || questions.length === 0) { alert("문제가 없습니다."); return; }
    
    // 출제 이력의 열쇠를 '초성'이 아니라 '모드|정답'으로 잡는다.
    // 초성으로 잡으면 ㅅㄹ(쉬리)과 ㅅㄹ(슈렉)처럼 서로 다른 문제가 같은 것으로 취급돼
    // 한쪽이 나오면 다른 쪽이 영영 안 나온다. 모드가 다른 문제끼리 섞이는 것도 막는다.
    const qKey = (q) => mode + '|' + (q.a || q.q);

    const usedQuestions = data.usedQuestions || [];
    const available = questions.filter(q => !usedQuestions.includes(qKey(q)));
    if (available.length === 0) { alert("이 카테고리의 모든 문제가 출제되었습니다. 문제를 초기화해주세요."); return; }

    const qData = available[Math.floor(Math.random() * available.length)];
    usedQuestions.push(qKey(qData));

    // '랜덤'으로 뽑았어도 화면에는 실제 카테고리를 보여준다.
    // 초성 퀴즈에서 카테고리는 사실상 유일한 단서라, '랜덤'이라고만 쓰면 맞힐 수가 없다.
    let displayCat = cat;
    if (cat === '랜덤') {
        for (const c of Object.keys(window.QUIZ_DB[mode])) {
            if (c !== '랜덤' && window.QUIZ_DB[mode][c].indexOf(qData) !== -1) { displayCat = c; break; }
        }
    }
    
    let desc = data.describer;
    if (mode === 'charades' && !desc) desc = window.myPlayerId;
    
    const useBuzzer = buzzerEnabled || mode === 'charades';
    const isWords4 = mode === 'words4';
    const timerSec = data.timer_seconds || 3;
    
    let updateObj = {
        quizState: 'playing', gameMode: mode, category: displayCat,
        question: qData.q, answer: qData.a,
        img: qData.img || null, hints: qData.hints || null,
        describer: desc || null, winner: null,
        usedQuestions: usedQuestions,
        buzzer_countdown: useBuzzer ? 3 : 0,
        buzzer_active: !useBuzzer && !isWords4,
        buzzer_winner: null, last_buzzer_team: null,
        buzzer_enabled: buzzerEnabled,
        buzzer_mode: data.buzzer_mode || 'A',
        words4_failed: false, words4_timer: isWords4 ? timerSec : 0,
        hintsRevealed: (mode === 'person_text') ? 1 : 0,
        hintVotes: {},
        win_points: winPoints
    };
    
    window.firebaseUpdate(roomRef, updateObj);

    if (useBuzzer) {
        let c = 3;
        let iv = setInterval(() => {
            c--;
            if (c <= 0) { clearInterval(iv); window.firebaseUpdate(roomRef, { buzzer_countdown: 0, buzzer_active: true }); }
            else { window.firebaseUpdate(roomRef, { buzzer_countdown: c }); }
        }, 1000);
    }
    
    if (isWords4) {
        let t = timerSec;
        let iv = setInterval(() => {
            t--;
            if (t <= 0) {
                clearInterval(iv);
                window.firebaseUpdate(roomRef, { words4_timer: 0, words4_failed: true });
            } else {
                window.firebaseUpdate(roomRef, { words4_timer: t });
            }
        }, 1000);
    }
};

window.submitGuess = async function(correctAnswer) {
    const input = document.getElementById('input-guess');
    if (!input) return;
    const guess = input.value.trim().replace(/\s+/g, '');
    const clean = correctAnswer.replace(/\s+/g, '');
    if (guess === clean) {
        const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
        let snap = await window.firebaseGet(roomRef);
        let d = snap.val();
        let indScores = d.individualScores || {};
        let gScores = d.globalScores || {};
        let pts = d.win_points || 1;
        indScores[window.myPlayerId] = (indScores[window.myPlayerId] || 0) + pts;
        gScores[window.myPlayerId] = (gScores[window.myPlayerId] || 0) + pts;
        window.firebaseUpdate(roomRef, { winner: window.myPlayerId, individualScores: indScores, globalScores: gScores });
    } else {
        alert("틀렸습니다! 다시 시도하세요.");
        input.value = '';
    }
};

window.pressBuzzer = async function() {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snap = await window.firebaseGet(roomRef);
    let d = snap.val();
    if (d.buzzer_active && !d.buzzer_winner) {
        window.firebaseUpdate(roomRef, { buzzer_winner: window.myPlayerId, buzzer_active: false });
    }
};

window.hostBuzzerCorrect = async function(winnerId) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snap = await window.firebaseGet(roomRef);
    let d = snap.val();
    let indScores = d.individualScores || {};
    let gScores = d.globalScores || {};
    let pts = d.win_points || 1;
    indScores[winnerId] = (indScores[winnerId] || 0) + pts;
    gScores[winnerId] = (gScores[winnerId] || 0) + pts;
    window.firebaseUpdate(roomRef, { winner: winnerId, individualScores: indScores, globalScores: gScores });
};

window.hostBuzzerWrong = async function() {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snap = await window.firebaseGet(roomRef);
    let d = snap.val();
    let wrongTeam = d.globalTeams ? d.globalTeams[d.buzzer_winner] : null;
    window.firebaseUpdate(roomRef, { buzzer_winner: null, buzzer_active: true, last_buzzer_team: wrongTeam });
};

window.resetBuzzerOnly = async function() {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    window.firebaseUpdate(roomRef, { buzzer_countdown: 3, buzzer_active: false, buzzer_winner: null });
    let c = 3;
    let iv = setInterval(() => {
        c--;
        if (c <= 0) { clearInterval(iv); window.firebaseUpdate(roomRef, { buzzer_countdown: 0, buzzer_active: true }); }
        else { window.firebaseUpdate(roomRef, { buzzer_countdown: c }); }
    }, 1000);
};

window.voteHint = async function() {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snap = await window.firebaseGet(roomRef);
    let d = snap.val();
    let votes = d.hintVotes || {};
    votes[window.myPlayerId] = true;
    let totalPlayers = Object.keys(d.players || {}).length;
    let voteCount = Object.keys(votes).length;
    
    if (voteCount >= totalPlayers) {
        // All voted - reveal next hint
        let revealed = (d.hintsRevealed || 1) + 1;
        window.firebaseUpdate(roomRef, { hintVotes: {}, hintsRevealed: revealed });
    } else {
        window.firebaseUpdate(roomRef, { hintVotes: votes });
    }
};

window.hostForceCorrect = async function() {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snap = await window.firebaseGet(roomRef);
    let d = snap.val();
    let indScores = d.individualScores || {};
    let gScores = d.globalScores || {};
    let pts = d.win_points || 1;
    indScores[window.myPlayerId] = (indScores[window.myPlayerId] || 0) + pts;
    gScores[window.myPlayerId] = (gScores[window.myPlayerId] || 0) + pts;
    window.firebaseUpdate(roomRef, { winner: window.myPlayerId, individualScores: indScores, globalScores: gScores });
};

window.backToQuizLobby = function() {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        quizState: null, question: null, answer: null, img: null, hints: null,
        winner: null, buzzer_countdown: 0, buzzer_active: false, buzzer_winner: null,
        last_buzzer_team: null, words4_failed: false, words4_timer: 0,
        hintsRevealed: 0, hintVotes: {}
    });
};
