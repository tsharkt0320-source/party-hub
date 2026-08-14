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
    const isA = (data.charTeam || 'A') === 'A';
    if ((data.charMode || 'count') === 'time') {
        if (!data.charTimeUp) return '▶ 다음 문제';
        return isA ? '▶ ' + (data.teamBName || 'B팀') + ' 차례 시작' : '🔄 새 판 시작';
    }
    const total = data.charCount || 5;
    const idx = (typeof data.charIdx === 'number') ? data.charIdx : 0;
    if (idx + 1 < total) return '▶ 다음 문제';
    return isA ? '▶ ' + (data.teamBName || 'B팀') + ' 차례 시작' : '🔄 새 판 시작';
}

// 힌트 상자 — 모두가 '힌트 하나 더 보기'를 누르면 하나씩 열린다.
// 초성 퀴즈와 스무고개가 같이 쓴다.
function hintBlockHtml(data) {
    if (!data.hints || !data.hints.length) return '';
    const revealed = data.hintsRevealed || 0;
    const totalPlayers = Object.keys(window.players).length;
    const votes = data.hintVotes || {};
    const voteCount = Object.keys(votes).length;
    const iVoted = !!votes[window.myPlayerId];

    let html = '<div style="background:rgba(0,0,0,0.3); padding:14px; border-radius:8px; text-align:left; margin-top:12px;">';
    data.hints.forEach((h, i) => {
        html += (i < revealed)
            ? `<div style="margin-bottom:8px; color:#cbd5e1; animation: fadeIn 0.5s;">💡 힌트 ${i+1}: <b>${h}</b></div>`
            : `<div style="margin-bottom:8px; color:#4b5563;">🔒 힌트 ${i+1}: ???</div>`;
    });
    html += '</div>';

    if (revealed < data.hints.length && !data.winner) {
        html += `<div style="margin-top:10px; text-align:center;">
                    <button class="btn ${iVoted?'secondary':'primary'}" style="padding:10px 20px;" onclick="window.voteHint()" ${iVoted?'disabled':''}>
                        ${iVoted ? '✓ 눌렀습니다' : '💡 힌트 하나 더 보기'}
                    </button>
                    <div style="color:var(--text-muted); font-size:0.8rem; margin-top:5px;">${voteCount}/${totalPlayers}명이 눌렀습니다</div>
                 </div>`;
    } else if (revealed >= data.hints.length) {
        html += `<div style="color:var(--text-muted); font-size:0.8rem; margin-top:8px; text-align:center;">힌트를 모두 열었습니다</div>`;
    }
    return html;
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
            { id: 'words4', name: '이어말하기 (육성만가능)' },
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

            // 부저 설정 — 4글자 이어말하기와 몸으로 말해요는 부저를 쓰지 않는다
            if (selectedMode !== 'words4' && selectedMode !== 'charades') {
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

                    // 부저는 소리쳐 답하는 방식이라, 정답 여부를 판정할 사람이 필요하다
                    const judge = data.buzzerJudge || '';
                    html += `<div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; text-align:left;">
                                <h4 style="color:#fbbf24; margin-bottom:6px;">🎭 출제자 (정답 판정)</h4>
                                <select class="input-group input" style="width:100%; padding:9px;" onchange="window.setCharOption('buzzerJudge', this.value)">
                                    <option value="">— 방장이 판정 —</option>
                                    ${Object.keys(window.players).map(id => `<option value="${id}" ${judge===id?'selected':''}>${window.players[id].name}</option>`).join('')}
                                </select>
                                <p style="color:#64748b; font-size:0.78rem; margin-top:6px; line-height:1.5;">
                                    출제자에게만 정답이 보입니다. 부저를 누른 사람이 소리쳐 답하면
                                    출제자가 <b style="color:#94a3b8;">⭕ 정답</b> 또는 <b style="color:#94a3b8;">❌ 오답</b> 을 누릅니다.
                                    오답이면 다른 사람이 다시 누를 수 있습니다.<br>
                                    출제자는 부저를 누를 수 없습니다.
                                </p>
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
                const charCount = data.charCount || 5;
                const gTeams = data.globalTeams || {};

                const charMode = data.charMode || 'count';
                const charTime = data.charTime || 300;

                html += `<div style="margin-bottom:15px; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; text-align:left;">
                            <h4 style="color:#fbbf24; margin-bottom:8px;">📋 진행 방식</h4>
                            <div class="bz-modes" style="margin-bottom:8px;">
                                <button class="bz-mode${charMode==='count'?' on':''}" onclick="window.setCharOption('charMode','count')">📋 문제 수</button>
                                <button class="bz-mode${charMode==='time'?' on':''}" onclick="window.setCharOption('charMode','time')">⏱ 시간 제한</button>
                            </div>`;

                if (charMode === 'count') {
                    html += `<select class="input-group input" style="width:100%; padding:9px;" onchange="window.setCharOption('charCount', Number(this.value))">
                                ${[3,5,7,10].map(v => `<option value="${v}" ${charCount===v?'selected':''}>한 팀당 ${v}문제</option>`).join('')}
                             </select>
                             <p style="color:#64748b; font-size:0.78rem; margin-top:6px; line-height:1.5;">
                                A팀이 ${charCount}문제를 다 끝내면 B팀 차례로 넘어갑니다.
                                B팀은 A팀과 <b>같은 카테고리</b>를 순서대로 받고, 같은 단어는 나오지 않습니다.
                             </p>`;
                } else {
                    html += `<select class="input-group input" style="width:100%; padding:9px;" onchange="window.setCharOption('charTime', Number(this.value))">
                                ${[180,300,420].map(v => `<option value="${v}" ${charTime===v?'selected':''}>${v/60}분</option>`).join('')}
                             </select>
                             <p style="color:#64748b; font-size:0.78rem; margin-top:6px; line-height:1.5;">
                                ${charTime/60}분 동안 계속 문제를 풉니다. 맞힌 개수만큼 점수가 오릅니다.<br>
                                두 팀이 <b>같은 카테고리 하나</b>를 절반씩 나눠 갖습니다.
                                같은 제시어는 <b>절대 두 팀에 겹치지 않습니다</b>.
                             </p>`;

                    // 카테고리가 작으면 시간이 남아도 문제가 먼저 떨어진다 — 미리 알려준다
                    const catInfo = Object.keys(window.QUIZ_DB.charades)
                        .filter(c => c !== '랜덤')
                        .map(c => ({ name: c, half: Math.floor(window.QUIZ_DB.charades[c].length / 2) }));
                    const pickedCat = selectedCat !== '랜덤' && window.QUIZ_DB.charades[selectedCat] ? selectedCat : null;
                    if (pickedCat) {
                        const half = Math.floor(window.QUIZ_DB.charades[pickedCat].length / 2);
                        html += `<p style="color:${half < 8 ? '#fbbf24' : '#64748b'}; font-size:0.78rem; margin-top:4px;">
                                    「${pickedCat}」 → 한 팀당 <b>${half}문제</b>${half < 8 ? ' — 시간보다 문제가 먼저 떨어질 수 있습니다' : ''}
                                 </p>`;
                    } else {
                        const biggest = catInfo.slice().sort((a,b) => b.half - a.half)[0];
                        html += `<p style="color:#64748b; font-size:0.78rem; margin-top:4px;">
                                    카테고리를 정하면 한 팀당 몇 문제인지 알려드립니다.
                                    가장 많은 「${biggest.name}」는 한 팀당 ${biggest.half}문제입니다.
                                 </p>`;
                    }
                }
                html += `</div>`;

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

                html += `<p style="color:#64748b; font-size:0.78rem; margin-bottom:15px; line-height:1.5; text-align:left;">
                            부저는 쓰지 않습니다. 팀원이 소리쳐 맞히면 출제자가
                            <b style="color:#94a3b8;">⭕ 정답! 다음 문제</b> 또는 <b style="color:#94a3b8;">⏭ PASS</b> 를 누릅니다.<br>
                            상대 팀 화면에는 제시어가 보입니다.
                         </p>`;
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
                html += hintBlockHtml(data);
            }
            else if (mode === 'proverb_meaning') {
                html += `<h3 style="margin-bottom:15px; line-height:1.5; font-size:1.1rem;">${data.question}</h3>`;
            }
            else if (isCharades) {
                const turnTeam = data.charTeam || 'A';
                const tName = turnTeam === 'A' ? (data.teamAName || 'A팀') : (data.teamBName || 'B팀');
                const tColor = turnTeam === 'A' ? '#60a5fa' : '#f87171';
                const descName = (window.players[data.describer] || {}).name || '?';
                const byTime = (data.charMode || 'count') === 'time';
                const solved = (data.charSolved || {})[turnTeam] || 0;
                const timeUp = !!data.charTimeUp;
                // 우리 팀 차례가 아니면 구경하는 쪽 — 정답을 보여준다
                const amWatching = myTeam !== turnTeam;

                html += `<div style="margin-bottom:10px; font-size:0.95rem;">
                            <b style="color:${tColor};">${tName}</b> 차례
                            <span style="color:#94a3b8;">${byTime
                                ? `(맞힌 문제 ${solved}개)`
                                : `(${(typeof data.charIdx === 'number' ? data.charIdx : 0) + 1}/${data.charCount || 5}문제)`}</span><br>
                            🎭 <b style="color:#facc15;">${descName}</b> 님이 설명합니다
                         </div>`;

                if (byTime) {
                    html += `<div id="char-timer" style="font-size:2.2rem; font-weight:900; color:#fbbf24; margin:6px 0;">
                                ${timeUp ? '⏰ 시간 종료' : '⏱ --:--'}
                             </div>`;
                }

                if (timeUp) {
                    html += `<div style="font-size:1.1rem; color:#cbd5e1; margin:12px 0;">
                                ${tName}은 <b style="color:#4ade80;">${solved}개</b>를 맞혔습니다
                                ${data.charOutOfWords ? '<br><span style="color:#fbbf24; font-size:0.85rem;">이 카테고리에 배정된 문제를 다 썼습니다</span>' : ''}
                             </div>`;
                } else if (amIDescriber && byTime) {
                    const pool = (data.charPools || {})[turnTeam];
                    const left = Array.isArray(pool) ? pool.length : 0;
                    html += `<div style="font-size: 1.05rem; margin-bottom:6px; color:#fbbf24;">
                                몸으로 설명하세요! <span style="color:#64748b; font-size:0.8rem;">(남은 문제 ${left}개)</span>
                             </div>
                             <div style="font-size: 2.6rem; font-weight: 900; color: var(--danger); margin: 12px 0;">${data.answer}</div>`;
                } else if (amIDescriber) {
                    html += `<div style="font-size: 1.05rem; margin-bottom:6px; color:#fbbf24;">몸으로 설명하세요!</div>
                             <div style="font-size: 2.6rem; font-weight: 900; color: var(--danger); margin: 12px 0;">${data.answer}</div>`;
                } else if (amWatching) {
                    html += `<div style="font-size: 0.95rem; margin-bottom:6px; color:#94a3b8;">👀 구경 중 — 상대 팀 제시어</div>
                             <div style="font-size: 2.2rem; font-weight: 900; color: #cbd5e1; margin: 12px 0;">${data.answer}</div>`;
                } else {
                    html += `<div style="font-size: 1.05rem; margin-bottom:6px; color:#22c55e;">설명을 보고 소리쳐 맞혀보세요!</div>
                             <div style="font-size: 2.6rem; font-weight: 900; color: #94a3b8; margin: 12px 0;">???</div>`;
                }
            }
            else if (isWords4) {
                // 이어말하기 — 앞 글자를 보여주고, 남은 글자 수를 ○ 로 알려준다
                const restLen = String(data.answer || '').length;
                html += `<div style="font-size: 3rem; font-weight: 900; color: var(--primary); letter-spacing: 4px; margin: 18px 0; text-shadow: 0 0 20px rgba(74, 222, 128, 0.5);">
                            ${data.question}<span style="color:#475569;">${'○'.repeat(restLen)}</span>
                        </div>
                        <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:8px;">뒤에 올 <b>${restLen}글자</b>를 이어 말하세요</div>`;
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
                html += hintBlockHtml(data);   // 초성이 어려울 때 힌트를 하나씩 연다
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
            else if (isCharades) {
                // === 몸으로 말해요 — 부저 없이 육성으로 맞히고 출제자가 판정한다 ===
                const turnTeam = data.charTeam || 'A';
                const byTime = (data.charMode || 'count') === 'time';
                const timeUp = !!data.charTimeUp;

                if (typeof window.bzTeamBoxesHtml === 'function') {
                    html += window.bzTeamBoxesHtml(data, {
                        showScore: false, showAdjust: false,
                        activeTeam: turnTeam,
                        describers: data.describer ? { [data.describer]: true } : {}
                    });
                }

                if (amIDescriber && !timeUp) {
                    html += `<div class="btn-row" style="margin-top:14px;">
                                <button class="btn primary wide" style="padding:18px 8px; font-size:1.05rem;" onclick="window.charCorrect()">⭕ 정답! 다음 문제</button>
                                <button class="btn secondary" style="padding:18px 8px; font-size:1.05rem; background:#4b5563;" onclick="window.charPass()">⏭ PASS</button>
                             </div>
                             <p style="color:#64748b; font-size:0.78rem; margin-top:8px;">정답을 누르면 ${turnTeam === 'A' ? (data.teamAName || 'A팀') : (data.teamBName || 'B팀')} 점수가 오릅니다</p>`;
                } else if (!timeUp) {
                    html += `<div class="card" style="text-align:center; margin-top:14px; padding:14px;">
                                <span style="color:#94a3b8; font-size:0.9rem;">🎭 출제자가 정답 여부를 눌러 줍니다</span>
                             </div>`;
                }

                if (canControl) {
                    if (byTime && !timeUp) {
                        html += `<div class="btn-row" style="margin-top:12px;">
                                    <button class="btn secondary wide" onclick="window.charStopTime()">⏹ 시간 끝내기</button>
                                    <button class="btn secondary" onclick="window.backToQuizLobby()">⚙️ 설정</button>
                                 </div>`;
                    } else if (!byTime || timeUp) {
                        html += `<div class="btn-row" style="margin-top:12px;">
                                    <button class="btn primary wide" onclick="window.startQuizGame()">${charNextLabel(data, true)}</button>
                                    <button class="btn secondary" onclick="window.backToQuizLobby()">⚙️ 설정</button>
                                 </div>`;
                    }
                }
            }
            else if (buzzerEnabled) {
                // === 부저 — '부저만 사용'과 같은 화면(팀 상자 + 이름 앞 램프) ===
                const judge = data.buzzerJudge && window.players[data.buzzerJudge] ? data.buzzerJudge : null;
                const amJudge = judge === window.myPlayerId;

                let canPress = true, note = '대기 중';
                if (amJudge) { canPress = false; note = '🎭 출제자는 못 누릅니다'; }
                else if (data.buzzer_mode === 'A' && data.last_buzzer_team === myTeam) {
                    canPress = false;
                    note = '상대 팀 차례입니다';
                }

                if (amJudge && !data.winner) {
                    html += `<div class="card" style="text-align:center; padding:12px; margin-bottom:10px; background:rgba(251,191,36,0.12); border:1px solid #fbbf24;">
                                <div style="color:#fbbf24; font-size:0.85rem;">🎭 출제자만 보는 정답</div>
                                <div style="font-size:1.6rem; font-weight:900; color:#fff;">${Array.isArray(data.answer) ? data.answer[0] : data.answer}</div>
                             </div>`;
                }

                if (typeof window.bzTeamBoxesHtml === 'function') {
                    html += window.bzTeamBoxesHtml(data, {
                        winner: data.buzzer_winner || null,
                        showScore: false, showAdjust: false,
                        describers: judge ? { [judge]: true } : {}
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

                // 판정은 출제자가 (지정 안 했으면 방장/팀장이)
                if (data.buzzer_winner && (judge ? amJudge : canControl)) {
                    html += `<div class="btn-row" style="margin-top:12px;">
                                <button class="btn primary" onclick="window.hostBuzzerCorrect('${data.buzzer_winner}')">⭕ 정답</button>
                                <button class="btn danger" onclick="window.hostBuzzerWrong()">❌ 오답 (다음 사람에게)</button>
                             </div>`;
                } else if (data.buzzer_winner && judge) {
                    html += `<p style="text-align:center; color:#94a3b8; font-size:0.85rem; margin-top:10px;">
                                🎭 ${window.players[judge].name} 님의 판정을 기다리는 중...
                             </p>`;
                }
                if (canControl && !data.buzzer_winner) {
                    html += `<div class="btn-row" style="margin-top:12px;">
                                <button class="btn primary wide" onclick="window.startQuizGame()">▶ 다음 문제</button>
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
    syncCharTimer(data);
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

// === 몸으로 말해요 — 출제자가 직접 판정 ===

// ⭕ 정답! → 그 팀 점수를 올리고 다음 문제로
window.charCorrect = async function() {
    const d = window._lastRoomData || {};
    if (d.gameMode !== 'charades' || d.describer !== window.myPlayerId) return;
    if (d.charTimeUp) return;

    const team = d.charTeam || 'A';
    const pts = d.win_points || 1;
    const bonus = Object.assign({}, d.teamBonus || {});
    bonus[team] = (Number(bonus[team]) || 0) + pts;
    const solved = Object.assign({}, d.charSolved || {});
    solved[team] = (solved[team] || 0) + 1;

    await window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
        teamBonus: bonus, charSolved: solved
    });
    window.startQuizGame();
};

// ⏭ PASS → 점수 없이 다음 문제로
window.charPass = function() {
    const d = window._lastRoomData || {};
    if (d.gameMode !== 'charades' || d.describer !== window.myPlayerId) return;
    if (d.charTimeUp) return;
    window.startQuizGame();
};

window.charStopTime = function() {
    if (!window.isHost && !window._isCaptain) return;
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { charTimeUp: true });
};

// 남은 시간은 각자 화면에서 센다 (1초마다 방 전체를 다시 그리지 않기 위해)
function syncCharTimer(data) {
    const el = document.getElementById('char-timer');
    const endAt = data.charEndAt;
    if (window._charTickIv) { clearInterval(window._charTickIv); window._charTickIv = null; }
    if (!el || !endAt || data.charTimeUp) return;

    const paint = () => {
        const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        const box = document.getElementById('char-timer');
        if (!box) { clearInterval(window._charTickIv); window._charTickIv = null; return; }
        const m = Math.floor(left / 60), s = left % 60;
        box.innerText = '⏱ ' + m + ':' + String(s).padStart(2, '0');
        box.style.color = left <= 10 ? '#ef4444' : '#fbbf24';
        if (left <= 0) {
            clearInterval(window._charTickIv); window._charTickIv = null;
            // 시간이 끝났다는 사실은 한 사람만 기록한다
            if (window.isHost) {
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { charTimeUp: true });
            }
        }
    };
    paint();
    window._charTickIv = setInterval(paint, 250);
}

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
    let charNewTurn = false, charNewMatch = false, charSolved = data.charSolved || {};
    if (mode === 'charades') {
        const byTime = (data.charMode || 'count') === 'time';
        const total = data.charCount || 5;
        const wasCharades = data.gameMode === 'charades' && data.quizState === 'playing';
        const prevTeam = data.charTeam;
        const prevIdx = (typeof data.charIdx === 'number') ? data.charIdx : -1;
        charCats = Array.isArray(data.charCats) ? data.charCats.slice() : [];

        if (byTime) {
            // 시간 제한 — 시간이 끝났을 때만 팀이 넘어간다
            if (!wasCharades) {
                charTeam = 'A'; charNewTurn = charNewMatch = true; charCats = []; charSolved = {};
            } else if (!data.charTimeUp) {
                charTeam = prevTeam || 'A';           // 시간 안 — 같은 팀 계속
            } else if (prevTeam === 'A') {
                charTeam = 'B'; charNewTurn = true;   // A팀 시간 끝 → B팀
            } else {
                charTeam = 'A'; charNewTurn = charNewMatch = true; charCats = []; charSolved = {}; // 새 판
            }
            charIdx = charNewTurn ? 0 : (prevIdx + 1);
        } else {
            if (!wasCharades) {
                charTeam = 'A'; charIdx = 0; charCats = []; charSolved = {};
            } else if (prevIdx + 1 < total) {
                charTeam = prevTeam || 'A'; charIdx = prevIdx + 1;
            } else if (prevTeam === 'A') {
                charTeam = 'B'; charIdx = 0;
            } else {
                charTeam = 'A'; charIdx = 0; charCats = []; charSolved = {};
            }
        }

        if (byTime) {
            // 두 팀이 같은 카테고리 하나로만 진행한다
            if (charCats[0]) {
                charCat = charCats[0];
            } else if (cat !== '랜덤' && window.QUIZ_DB.charades[cat]) {
                charCat = cat;
            } else {
                const real = Object.keys(window.QUIZ_DB.charades).filter(c => c !== '랜덤');
                charCat = real[Math.floor(Math.random() * real.length)];
            }
            charCats[0] = charCat;
        } else if (charTeam === 'B' && charCats[charIdx]) {
            charCat = charCats[charIdx];   // A팀이 썼던 카테고리 그대로
        } else if (cat !== '랜덤' && window.QUIZ_DB.charades[cat]) {
            charCat = cat;                 // 방장이 카테고리를 지정한 경우
        } else {
            // 한 판 안에서는 되도록 겹치지 않게 뽑는다
            const real = Object.keys(window.QUIZ_DB.charades).filter(c => c !== '랜덤');
            const fresh = real.filter(c => charCats.indexOf(c) === -1);
            const pool = fresh.length ? fresh : real;
            charCat = pool[Math.floor(Math.random() * pool.length)];
            if (charTeam === 'A') charCats[charIdx] = charCat;
        }
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

    let qData = null;
    let charPools = null;

    if (mode === 'charades' && (data.charMode || 'count') === 'time') {
        // 시간 제한은 두 팀이 한 카테고리를 나눠 쓴다.
        // 판이 시작될 때 문제를 섞어 반씩 갈라 두면
        //  ① 두 팀에게 같은 문제가 나올 수 없고
        //  ② 앞 팀이 문제를 다 써버려 뒤 팀이 굶는 일도 없다.
        charPools = data.charPools;
        // built 표시로 판단한다. 파이어베이스는 빈 배열을 아예 지워버려서
        // charPools.A 가 있는지로 보면, 한 팀이 문제를 다 쓴 순간 새로 만들어져 버린다.
        if (charNewMatch || !charPools || !charPools.built) {
            const idxs = questions.map((_, i) => i);
            for (let i = idxs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const t = idxs[i]; idxs[i] = idxs[j]; idxs[j] = t;
            }
            const half = Math.floor(idxs.length / 2);
            charPools = { built: true, A: idxs.slice(0, half), B: idxs.slice(half, half * 2) };
        }

        const myPool = Array.isArray(charPools[charTeam]) ? charPools[charTeam].slice() : [];
        if (myPool.length === 0) {
            // 배정받은 문제를 다 썼다 → 이 팀의 차례를 여기서 끝낸다
            window.firebaseUpdate(roomRef, { charTimeUp: true, charOutOfWords: true });
            return;
        }
        qData = questions[myPool.shift()];
        charPools = Object.assign({}, charPools, { built: true, [charTeam]: myPool });
        usedQuestions.push(qKey(qData));
    } else {
        const available = questions.filter(q => !usedQuestions.includes(qKey(q)));
        if (available.length === 0) { alert("이 카테고리의 모든 문제가 출제되었습니다. 문제를 초기화해주세요."); return; }
        qData = available[Math.floor(Math.random() * available.length)];
        usedQuestions.push(qKey(qData));
    }

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

    // 몸으로 말해요는 부저를 쓰지 않는다 — 육성으로 맞히고 출제자가 판정한다
    const useBuzzer = buzzerEnabled && mode !== 'charades';
    const isWords4 = mode === 'words4';
    const timerSec = data.timer_seconds || 3;
    
    let updateObj = {
        quizState: 'playing', gameMode: mode, category: displayCat,
        question: qData.q, answer: qData.a,
        img: qData.img || null, hints: qData.hints || null,
        describer: desc || null, winner: null,
        charTeam: charTeam, charCat: charCat, charRot: charRot,
        charIdx: charIdx, charCats: charCats, charSolved: charSolved,
        charPools: charPools,
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
    
    // 시간 제한 — 새 차례가 시작될 때만 시계를 다시 맞춘다
    if (mode === 'charades' && (data.charMode || 'count') === 'time') {
        updateObj.charEndAt = charNewTurn
            ? Date.now() + (data.charTime || 300) * 1000
            : (data.charEndAt || Date.now() + (data.charTime || 300) * 1000);
        updateObj.charTimeUp = false;
        updateObj.charOutOfWords = null;
    } else if (mode === 'charades') {
        updateObj.charEndAt = null;
        updateObj.charTimeUp = false;
        updateObj.charOutOfWords = null;
    }

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

    const myTeam = (d.globalTeams && d.globalTeams[window.myPlayerId]) || 'A';
    if (d.buzzerJudge === window.myPlayerId) return;   // 출제자는 못 누른다
    if (d.buzzer_mode === 'A' && d.last_buzzer_team === myTeam) return;

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

    // 봇은 누를 수 없으므로 사람 수만 센다 (안 그러면 힌트가 영영 안 열린다)
    const humans = Object.keys(d.players || {}).filter(id => id.indexOf('bot_') !== 0);
    const voteCount = Object.keys(votes).filter(id => id.indexOf('bot_') !== 0).length;

    if (voteCount >= humans.length) {
        // 모두 눌렀다 → 힌트 하나 공개
        // (|| 1 로 잡으면 0에서 시작하는 초성 퀴즈가 1번 힌트를 건너뛴다)
        const revealed = (d.hintsRevealed || 0) + 1;
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
