// quiz.js

// 문제가 바뀔 때마다 번호를 올린다.
// 이전 문제의 타이머가 살아남아 새 문제에 '실패'를 써버리는 사고를 막기 위함.
window._quizRound = 0;

function newQuizRound() {
    window._quizRound = (window._quizRound || 0) + 1;
    if (window._quizBuzzerIv) { clearInterval(window._quizBuzzerIv); window._quizBuzzerIv = null; }
    if (window._quizWords4Iv) { clearInterval(window._quizWords4Iv); window._quizWords4Iv = null; }
    return window._quizRound;
}
window.newQuizRound = newQuizRound;

function getCategoriesForMode(mode) {
    if (!window.QUIZ_DB[mode]) return ['랜덤'];
    const cats = Object.keys(window.QUIZ_DB[mode]);
    // 실제 카테고리가 하나뿐이면 '랜덤'은 그것과 완전히 같은 결과라서 고를 이유가 없다
    const real = cats.filter(c => c !== '랜덤');
    if (real.length <= 1) return real.length ? real : ['랜덤'];
    return cats;
}

// 몸으로 말해요에서 '다음' 버튼이 무엇을 하는지 이름으로 알려준다
function charNextLabel(data, isCharades) {
    if (!isCharades) return '▶ 다음 문제';
    const total = data.charCount || 5;
    const idx = (typeof data.charIdx === 'number') ? data.charIdx : 0;
    if (idx + 1 < total) return '▶ 다음 문제';
    if ((data.charTeam || 'A') === 'A') {
        return '▶ ' + (data.teamBName || 'B팀') + ' 차례 시작';
    }
    return '🔄 새 판 시작';
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
    // teamBonus = 부저 게임에서 방장이 직접 올리고 내린 몫. 두 화면의 점수가 어긋나지 않게 함께 더한다.
    const teamBonus = data.teamBonus || {};
    let teamAScore = Number(teamBonus.A) || 0, teamBScore = Number(teamBonus.B) || 0;
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
            { id: 'proverb_meaning', name: '속담 뜻 맞추기' }
            // 🚨 부저만 사용하기 → 로비의 독립 게임으로 옮겼다 (buzzer.js)
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
            
            html += `<div style="margin-bottom:15px; text-align:left;">
                        <label style="color:#cbd5e1; font-size:0.9rem;">카테고리</label>
                        <select id="quiz-cat-select" class="input-group input" style="width:100%; margin-top:5px; padding:10px;" onchange="window.updateQuizSetup()">
                            ${catSelectHtml}
                        </select>
                    </div>`;
            
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

            // Buzzer toggle (not for words4)
            if (selectedMode !== 'words4') {
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

            // 몸으로 말해요 설정
            if (selectedMode === 'charades') {
                const descMode = data.charDescMode || 'fixed';
                const scope = data.charAnswerScope || 'team';
                const charCount = data.charCount || 5;
                const gTeams = data.globalTeams || {};

                html += `<div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; text-align:left;">
                            <h4 style="color:#fbbf24; margin-bottom:8px;">📋 한 팀당 문제 수</h4>
                            <select class="input-group input" style="width:100%; padding:9px;" onchange="window.setCharOption('charCount', Number(this.value))">
                                ${[3,5,7,10].map(v => `<option value="${v}" ${charCount===v?'selected':''}>${v}문제</option>`).join('')}
                            </select>
                            <p style="color:#64748b; font-size:0.78rem; margin-top:6px; line-height:1.5;">
                                A팀이 ${charCount}문제를 다 끝내면 B팀 차례로 넘어갑니다.
                                B팀은 A팀과 <b>같은 카테고리</b>를 순서대로 받고, 같은 단어는 나오지 않습니다.
                            </p>
                         </div>`;

                html += `<div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; text-align:left;">
                            <h4 style="color:#fbbf24; margin-bottom:8px;">🎭 출제자</h4>
                            <div class="bz-modes" style="margin-bottom:6px;">
                                <button class="bz-mode${descMode==='fixed'?' on':''}" onclick="window.setCharOption('charDescMode','fixed')">📌 한 명 고정</button>
                                <button class="bz-mode${descMode==='rotate'?' on':''}" onclick="window.setCharOption('charDescMode','rotate')">🔄 한 명씩 돌아가며</button>
                            </div>
                            <p style="color:#64748b; font-size:0.78rem; line-height:1.5;">
                                출제자에게만 제시어가 보입니다.
                                ${descMode==='rotate' ? '문제마다 팀 안에서 다음 사람에게 차례가 넘어갑니다.' : '팀마다 정해진 한 사람이 계속 설명합니다.'}
                            </p>`;

                if (descMode === 'fixed') {
                    ['A', 'B'].forEach(tk => {
                        const memList = Object.keys(window.players).filter(id => (gTeams[id] || 'A') === tk);
                        const cur = data['charDesc' + tk] || '';
                        const tName = tk === 'A' ? (data.teamAName || 'A팀') : (data.teamBName || 'B팀');
                        html += `<label style="margin-top:10px; color:#cbd5e1; font-size:0.85rem;">${tName} 출제자</label>
                                 <select class="input-group input" style="width:100%; padding:9px; margin-top:4px;" onchange="window.setCharOption('charDesc${tk}', this.value)">
                                    <option value="">— 선택 —</option>
                                    ${memList.map(id => `<option value="${id}" ${cur===id?'selected':''}>${window.players[id].name}</option>`).join('')}
                                 </select>`;
                    });
                }
                html += `</div>`;

                html += `<div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; text-align:left;">
                            <h4 style="color:#fbbf24; margin-bottom:8px;">🚨 부저를 누를 수 있는 사람</h4>
                            <div class="bz-modes">
                                <button class="bz-mode${scope==='team'?' on':''}" onclick="window.setCharOption('charAnswerScope','team')">차례인 팀만</button>
                                <button class="bz-mode${scope==='all'?' on':''}" onclick="window.setCharOption('charAnswerScope','all')">전원 아무나</button>
                            </div>
                         </div>`;
            }

            html += `<button id="btn-start-quiz" class="btn primary" style="width:100%; font-size:1.2rem; padding:16px;" onclick="window.startQuizGame()">🚀 문제 출제하기</button>
                </div>
                <details class="host-tools">
                    <summary>🧹 초기화</summary>
                    <div class="tool-body">
                        <div class="btn-row">
                            <button class="btn secondary" onclick="window.resetQuizScores()">점수 초기화</button>
                            <button class="btn" style="background:#7f1d1d;" onclick="window.resetUsedQuestions()">문제 내역 초기화</button>
                        </div>
                        <p style="color:#64748b; font-size:0.78rem; margin-top:8px; line-height:1.5;">
                            점수 초기화: 팀·개인 점수를 0으로<br>
                            문제 내역 초기화: 이미 나온 문제를 다시 나오게
                        </p>
                    </div>
                </details>
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
        const buzzerEnabled = data.buzzer_enabled || false;
        const myTeam = (data.globalTeams && data.globalTeams[window.myPlayerId]) || 'A';
        // 출제자는 몸으로 말해요에서만 의미가 있다
        const amIDescriber = isCharades && window.myPlayerId === data.describer;
        const amICaptain = data.captain === window.myPlayerId;
        const canControl = window.isHost || amICaptain;

        // === QUESTION DISPLAY ===
        {
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
                const turnTeam = data.charTeam || 'A';
                const tName = turnTeam === 'A' ? (data.teamAName || 'A팀') : (data.teamBName || 'B팀');
                const tColor = turnTeam === 'A' ? '#60a5fa' : '#f87171';
                const descName = (window.players[data.describer] || {}).name || '?';

                const total = data.charCount || 5;
                const nth = (typeof data.charIdx === 'number' ? data.charIdx : 0) + 1;

                html += `<div style="margin-bottom:10px; font-size:0.95rem;">
                            <b style="color:${tColor};">${tName}</b> 차례
                            <span style="color:#94a3b8;">(${nth}/${total}문제)</span><br>
                            🎭 <b style="color:#facc15;">${descName}</b> 님이 설명합니다
                         </div>`;

                if (amIDescriber) {
                    html += `<div style="font-size: 1.05rem; margin-bottom:6px; color:#fbbf24;">몸으로 설명하세요!</div>
                             <div style="font-size: 2.6rem; font-weight: 900; color: var(--danger); margin: 12px 0;">${data.answer}</div>`;
                } else {
                    html += `<div style="font-size: 1.05rem; margin-bottom:6px; color:#22c55e;">설명을 보고 맞혀보세요!</div>
                             <div style="font-size: 2.6rem; font-weight: 900; color: #94a3b8; margin: 12px 0;">???</div>`;
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
            let displayAns = Array.isArray(data.answer) ? data.answer[0] : data.answer;
            html += `
                <div class="card" style="background:var(--success); border: 2px solid #fff; box-shadow: 0 0 20px var(--success); animation: pulse 1s infinite;">
                    <h3 style="color:white; margin-bottom:10px;">🎉 정답입니다! 🎉</h3>
                    <p style="font-size:1.5rem; color:white; font-weight:bold;">정답: ${displayAns}</p>
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
            if (isWords4 && !data.words4_failed) {
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
                // === 부저 — '부저만 사용'과 같은 화면(팀 상자 + 이름 앞 램프) ===
                const answerScope = data.charAnswerScope || 'team';
                const turnTeam = isCharades ? (data.charTeam || 'A') : null;

                // 내가 누를 수 있는지
                let canPress = true, note = '대기 중';
                if (amIDescriber) { canPress = false; note = '🎭 출제자는 못 누릅니다'; }
                else if (isCharades && answerScope === 'team' && myTeam !== turnTeam) {
                    canPress = false;
                    note = '상대 팀 차례입니다';
                } else if (!isCharades && data.buzzer_mode === 'A' && data.last_buzzer_team === myTeam) {
                    canPress = false;
                    note = '상대 팀 차례입니다';
                }

                if (typeof window.bzTeamBoxesHtml === 'function') {
                    html += window.bzTeamBoxesHtml(data, {
                        winner: data.buzzer_winner || null,
                        showScore: false,
                        showAdjust: false,
                        activeTeam: (isCharades && answerScope === 'team') ? turnTeam : null,
                        describers: data.describer ? { [data.describer]: true } : {}
                    });
                }

                if (typeof window.bzStageHtml === 'function') {
                    html += window.bzStageHtml({
                        countdown: data.buzzer_countdown || 0,
                        winner: data.buzzer_winner || null,
                        active: !!data.buzzer_active,
                        canPress: canPress,
                        note: note,
                        pressFn: 'window.pressBuzzer()'
                    });
                }

                if (data.buzzer_winner && canControl) {
                    html += `<div class="btn-row" style="margin-top:12px;">
                                <button class="btn primary" onclick="window.hostBuzzerCorrect('${data.buzzer_winner}')">⭕ 정답</button>
                                <button class="btn danger" onclick="window.hostBuzzerWrong()">❌ 오답</button>
                             </div>`;
                }
                if (canControl && !data.buzzer_winner) {
                    html += `<div class="btn-row" style="margin-top:12px;">
                                <button class="btn primary wide" onclick="window.startQuizGame()">${charNextLabel(data, isCharades)}</button>
                                <button class="btn secondary" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
                             </div>`;
                }
            }
            else {
                // Normal text input mode (초성, 인물, 속담 etc.)
                html += `<div class="input-group" style="display:flex; gap:10px;">
                            <input type="text" id="input-guess" placeholder="정답을 입력하세요" style="flex:1; font-size:1.2rem; padding:15px;" onkeypress="if(event.key==='Enter') window.submitGuess()">
                            <button class="btn primary" style="padding:0 20px; font-size:1.1rem;" onclick="window.submitGuess()">확인</button>
                        </div>`;
                if (canControl) {
                    html += `<div class="btn-row" style="margin-top:15px;">
                                <button class="btn primary wide" onclick="window.startQuizGame()">▶ 다음 문제</button>
                                <button class="btn secondary" onclick="window.hostForceCorrect()" title="아무도 못 맞혔을 때 방장이 정답을 공개합니다">정답 공개</button>
                                <button class="btn secondary" onclick="window.backToQuizLobby()" title="설정으로 돌아가기">⚙️ 설정</button>
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

window.setCharOption = function(key, val) {
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { [key]: val || null });
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
    // 새 문제를 내는 순간 이전 문제의 타이머를 모두 무효화한다
    const round = newQuizRound();
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snapshot = await window.firebaseGet(roomRef);
    const data = snapshot.val();
    
    const mode = data.setupMode || 'initial';
    let cat = data.setupCategory || '랜덤';
    const buzzerEnabled = data.buzzer_enabled || false;
    const winPoints = data.win_points || 1;
    
    // === 몸으로 말해요 ===
    // A팀이 정해진 문제 수를 전부 끝내면 B팀 차례.
    // B팀은 A팀이 받았던 카테고리를 순서대로 그대로 받는다 (단어는 다르다).
    let charTeam = null, charCat = null, charIdx = 0, charCats = null;
    if (mode === 'charades') {
        const total = data.charCount || 5;
        const wasCharades = data.gameMode === 'charades' && data.quizState === 'playing';
        const prevTeam = data.charTeam;
        const prevIdx = (typeof data.charIdx === 'number') ? data.charIdx : -1;
        charCats = Array.isArray(data.charCats) ? data.charCats.slice() : [];

        if (!wasCharades) {
            charTeam = 'A'; charIdx = 0; charCats = [];      // 새 판
        } else if (prevIdx + 1 < total) {
            charTeam = prevTeam || 'A'; charIdx = prevIdx + 1; // 같은 팀 계속
        } else if (prevTeam === 'A') {
            charTeam = 'B'; charIdx = 0;                       // A팀 끝 → B팀
        } else {
            charTeam = 'A'; charIdx = 0; charCats = [];        // 한 판 끝 → 새 판
        }

        if (charTeam === 'B' && charCats[charIdx]) {
            charCat = charCats[charIdx];   // A팀이 썼던 카테고리 그대로
        } else if (cat !== '랜덤' && window.QUIZ_DB.charades[cat]) {
            charCat = cat;                 // 방장이 카테고리를 지정한 경우
        } else {
            // 한 판 안에서는 되도록 겹치지 않게 뽑는다
            const real = Object.keys(window.QUIZ_DB.charades).filter(c => c !== '랜덤');
            const fresh = real.filter(c => charCats.indexOf(c) === -1);
            const pool = fresh.length ? fresh : real;
            charCat = pool[Math.floor(Math.random() * pool.length)];
        }
        if (charTeam === 'A') charCats[charIdx] = charCat;
        cat = charCat;
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
    
    // === 출제자 결정 ===
    // 몸으로 말해요가 아니면 출제자는 없다.
    // (이걸 비우지 않으면 다른 게임에서도 예전 출제자가 부저를 못 누른다)
    let desc = null;
    let charRot = data.charRot || {};
    if (mode === 'charades') {
        const gTeams = data.globalTeams || {};
        const teamMembers = Object.keys(window.players)
            .filter(id => (gTeams[id] || 'A') === charTeam)
            .sort((a, b) => ((window.players[a] || {}).joinedAt || 0) - ((window.players[b] || {}).joinedAt || 0));

        if ((data.charDescMode || 'fixed') === 'fixed') {
            const picked = data['charDesc' + charTeam];
            desc = (picked && window.players[picked]) ? picked : (teamMembers[0] || null);
        } else {
            // 한 명씩 돌아가며 — 팀별로 몇 번째 차례인지 세어 둔다
            const turn = (charRot[charTeam] || 0);
            desc = teamMembers.length ? teamMembers[turn % teamMembers.length] : null;
            charRot = Object.assign({}, charRot, { [charTeam]: turn + 1 });
        }
    }

    const useBuzzer = buzzerEnabled || mode === 'charades';
    const isWords4 = mode === 'words4';
    const timerSec = data.timer_seconds || 3;
    
    let updateObj = {
        quizState: 'playing', gameMode: mode, category: displayCat,
        question: qData.q, answer: qData.a,
        img: qData.img || null, hints: qData.hints || null,
        describer: desc || null, winner: null,
        charTeam: charTeam, charCat: charCat, charRot: charRot,
        charIdx: charIdx, charCats: charCats,
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
        window._quizBuzzerIv = setInterval(() => {
            if (window._quizRound !== round) { clearInterval(window._quizBuzzerIv); return; }
            c--;
            if (c <= 0) { clearInterval(window._quizBuzzerIv); window._quizBuzzerIv = null; window.firebaseUpdate(roomRef, { buzzer_countdown: 0, buzzer_active: true }); }
            else { window.firebaseUpdate(roomRef, { buzzer_countdown: c }); }
        }, 1000);
    }
    
    if (isWords4) {
        let t = timerSec;
        window._quizWords4Iv = setInterval(() => {
            // 다음 문제로 넘어갔거나 이미 정답 처리됐으면 아무것도 쓰지 않는다
            if (window._quizRound !== round) { clearInterval(window._quizWords4Iv); return; }
            t--;
            if (t <= 0) {
                clearInterval(window._quizWords4Iv);
                window._quizWords4Iv = null;
                window.firebaseUpdate(roomRef, { words4_timer: 0, words4_failed: true });
            } else {
                window.firebaseUpdate(roomRef, { words4_timer: t });
            }
        }, 1000);
    }
};

window.getEditDistance = function(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    let matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

window.submitGuess = async function() {
    const input = document.getElementById('input-guess');
    if (!input) return;
    const guess = input.value.trim().replace(/\s+/g, '').toLowerCase();
    
    const data = window._lastRoomData;
    if (!data || !data.answer) return;
    
    let answers = Array.isArray(data.answer) ? data.answer : [data.answer];
    let isCorrect = false;
    
    for (let ans of answers) {
        let cleanAns = String(ans).replace(/\s+/g, '').toLowerCase();
        
        // 1. 완벽 일치
        if (guess === cleanAns) {
            isCorrect = true; break;
        }
        
        // 2. 오타 허용 (레벤슈타인 거리)
        // 네 글자 이상일 때 한 글자 오타 허용, 여섯 글자 이상일 때 두 글자 오타 허용
        let dist = window.getEditDistance(guess, cleanAns);
        if (cleanAns.length >= 4 && dist <= 1) {
            isCorrect = true; break;
        }
        if (cleanAns.length >= 6 && dist <= 2) {
            isCorrect = true; break;
        }
        
        // 3. 부분 일치 허용 (어절 단위)
        // 예: '레오나르도 디카프리오' -> ['레오나르도', '디카프리오']
        let words = String(ans).toLowerCase().split(' ');
        for (let word of words) {
            if (word.length >= 2 && guess === word.replace(/\s+/g, '')) {
                isCorrect = true; break;
            }
        }
        if (isCorrect) break;
    }
    
    if (isCorrect) {
        const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
        let snap = await window.firebaseGet(roomRef);
        let d = snap.val();
        let indScores = d.individualScores || {};
        let gScores = d.globalScores || {};
        let pts = d.win_points || 1;
        indScores[window.myPlayerId] = (indScores[window.myPlayerId] || 0) + pts;
        gScores[window.myPlayerId] = (gScores[window.myPlayerId] || 0) + pts;
        newQuizRound(); // 정답이 나왔으니 남은 제한시간 타이머 무효화
        window.firebaseUpdate(roomRef, { winner: window.myPlayerId, individualScores: indScores, globalScores: gScores, words4_timer: 0 });
    } else {
        alert("틀렸습니다! 다시 시도하세요.");
        input.value = '';
        input.focus();
    }
};

window.pressBuzzer = async function() {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snap = await window.firebaseGet(roomRef);
    let d = snap.val();
    if (!d.buzzer_active || d.buzzer_winner) return;

    const isCharades = d.gameMode === 'charades';
    const myTeam = (d.globalTeams && d.globalTeams[window.myPlayerId]) || 'A';
    if (isCharades) {
        if (d.describer === window.myPlayerId) return;            // 출제자는 못 누른다
        if ((d.charAnswerScope || 'team') === 'team' && myTeam !== (d.charTeam || 'A')) return;
    } else if (d.buzzer_mode === 'A' && d.last_buzzer_team === myTeam) {
        return;
    }

    window.firebaseUpdate(roomRef, { buzzer_winner: window.myPlayerId, buzzer_active: false });
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
    // 몸으로 말해요는 차례가 정해져 있으므로 '방금 틀린 팀' 개념을 쓰지 않는다
    const wrongTeam = (d.gameMode === 'charades')
        ? null
        : (d.globalTeams ? d.globalTeams[d.buzzer_winner] : null);
    window.firebaseUpdate(roomRef, { buzzer_winner: null, buzzer_active: true, last_buzzer_team: wrongTeam });
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
    newQuizRound(); // 진행 중이던 타이머 정리
    if (!window.isHost) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        quizState: null, question: null, answer: null, img: null, hints: null,
        winner: null, buzzer_countdown: 0, buzzer_active: false, buzzer_winner: null,
        last_buzzer_team: null, words4_failed: false, words4_timer: 0,
        hintsRevealed: 0, hintVotes: {}
    });
};
