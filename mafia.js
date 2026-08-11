// mafia.js

window.updateMafia = function(data) {
    const content = document.getElementById('mafia-content');
    
    // Check if game just started (no mafiaState)
    if (!data.mafiaState) {
        if (window.isHost) {
            let html = `
                <div class="card" style="text-align:left;">
                    <h3 style="margin-bottom:15px;">⚙️ 마피아 게임 설정</h3>
                    
                    <div style="margin-bottom:10px;">
                        <label><input type="checkbox" id="opt-public-vote" checked> <b>공개 투표 모드</b> (누가 누구를 찍었는지 언제든 열람 가능)</label>
                    </div>
                    
                    <h4 style="margin:15px 0 5px 0;">✨ 특수 직업 포함</h4>
                    <div style="display:flex; flex-direction:column; gap:5px; font-size:0.9rem;">
                        <label><input type="checkbox" id="opt-role-medium"> 🔮 영매 (전날 죽은 사람 정체 확인) <span style="font-size:0.8em; color:#fbbf24; margin-left:5px;">[추천: 6인 이상]</span></label>
                        <label><input type="checkbox" id="opt-role-hunter"> 🏹 사냥꾼 (처형당할 때 1명 길동무) <span style="font-size:0.8em; color:#fbbf24; margin-left:5px;">[추천: 5인 이상]</span></label>
                        <label><input type="checkbox" id="opt-role-seducer"> 💋 유혹자 (마피아팀: 투표권/능력 봉쇄) <span style="font-size:0.8em; color:#fbbf24; margin-left:5px;">[추천: 7인 이상]</span></label>
                        <label><input type="checkbox" id="opt-role-madman"> 🤡 광인 (자살희망자: 처형 시 단독 승리) <span style="font-size:0.8em; color:#fbbf24; margin-left:5px;">[추천: 6인 이상]</span></label>
                        <label><input type="checkbox" id="opt-role-politician" onchange="document.getElementById('pol-opts').style.display=this.checked?'block':'none'"> 👔 정치인 (투표 특권) <span style="font-size:0.8em; color:#fbbf24; margin-left:5px;">[추천: 5인 이상]</span></label>
                        <div id="pol-opts" style="display:none; padding-left:20px; color:#aaa;">
                            <label><input type="checkbox" id="opt-pol-2votes" checked> 투표 시 2표 행사</label>
                            <label><input type="checkbox" id="opt-pol-immunity" checked> 처형 면제 (투표로 죽지 않음)</label>
                        </div>
                        </div>
                    </div>
                </div>
                <div id="role-preview-box" class="card" style="margin-top:15px; background:rgba(255,255,255,0.05); color:#cbd5e1; font-size:0.9rem; text-align:center;">
                   (직업 배정 미리보기)
                </div>
                <button id="btn-start-mafia" class="btn primary" style="margin-top:15px; width:100%;">역할 분배하고 시작하기</button>
            `;
            content.innerHTML = html;
            
            const updateRolePreview = () => {
                const pKeys = Object.keys(window.players);
                const pCount = pKeys.length;
                let mafiaCount = pCount >= 6 ? 2 : 1;
                
                const optSeducer = document.getElementById('opt-role-seducer').checked;
                const optMedium = document.getElementById('opt-role-medium').checked;
                const optHunter = document.getElementById('opt-role-hunter').checked;
                const optPolitician = document.getElementById('opt-role-politician').checked;
                const optMadman = document.getElementById('opt-role-madman').checked;

                let counts = { '마피아': 0, '유혹자': 0, '경찰': 0, '의사': 0, '영매': 0, '사냥꾼': 0, '정치인': 0, '광인': 0, '시민': 0 };
                let totalRolesAssigned = 0;

                counts['마피아']++; totalRolesAssigned++;
                if (mafiaCount > 1) {
                    if (optSeducer) { counts['유혹자']++; totalRolesAssigned++; }
                    else { counts['마피아']++; totalRolesAssigned++; }
                }

                if (pCount > 3) { counts['경찰']++; totalRolesAssigned++; }
                if (pCount > 4) { counts['의사']++; totalRolesAssigned++; }
                if (optMedium && totalRolesAssigned < pCount) { counts['영매']++; totalRolesAssigned++; }
                if (optHunter && totalRolesAssigned < pCount) { counts['사냥꾼']++; totalRolesAssigned++; }
                if (optPolitician && totalRolesAssigned < pCount) { counts['정치인']++; totalRolesAssigned++; }
                if (optMadman && totalRolesAssigned < pCount) { counts['광인']++; totalRolesAssigned++; }

                let c = pCount - totalRolesAssigned;
                if (c > 0) counts['시민'] = c;

                let previewText = `👥 총 <b>${pCount}</b>명 참가 중<br><div style="margin-top:8px;">`;
                let rolesList = [];
                for (const [name, cnt] of Object.entries(counts)) {
                    if (cnt > 0) {
                        let color = (name === '마피아' || name === '유혹자') ? 'var(--danger)' : (name === '광인' ? 'var(--warning)' : 'var(--primary)');
                        if (name === '시민') color = '#cbd5e1';
                        rolesList.push(`<span style="color:${color}; font-weight:bold;">${name} ${cnt}명</span>`);
                    }
                }
                previewText += rolesList.join(' / ') + '</div>';
                
                const previewBox = document.getElementById('role-preview-box');
                if (previewBox) previewBox.innerHTML = previewText;
            };
            
            const cbs = ['opt-role-medium', 'opt-role-hunter', 'opt-role-seducer', 'opt-role-madman', 'opt-role-politician'];
            cbs.forEach(id => {
                let el = document.getElementById(id);
                if (el) el.addEventListener('change', updateRolePreview);
            });
            setTimeout(updateRolePreview, 0);
            
            document.getElementById('btn-start-mafia').onclick = () => {
                const pKeys = Object.keys(window.players);
                
                // Read options
                const options = {
                    publicVote: document.getElementById('opt-public-vote').checked,
                    medium: document.getElementById('opt-role-medium').checked,
                    hunter: document.getElementById('opt-role-hunter').checked,
                    seducer: document.getElementById('opt-role-seducer').checked,
                    madman: document.getElementById('opt-role-madman').checked,
                    politician: document.getElementById('opt-role-politician').checked,
                    pol2Votes: document.getElementById('opt-pol-2votes')?.checked,
                    polImmunity: document.getElementById('opt-pol-immunity')?.checked
                };

                let roles = [];
                let mafiaCount = pKeys.length >= 6 ? 2 : 1;
                
                // Add mafia team
                roles.push('mafia');
                if (mafiaCount > 1 && options.seducer) roles.push('seducer');
                else if (mafiaCount > 1) roles.push('mafia');
                
                // Add citizen special roles based on checkboxes
                if (pKeys.length > 3) roles.push('police');
                if (pKeys.length > 4) roles.push('doctor');
                if (options.medium && roles.length < pKeys.length) roles.push('medium');
                if (options.hunter && roles.length < pKeys.length) roles.push('hunter');
                if (options.politician && roles.length < pKeys.length) roles.push('politician');
                if (options.madman && roles.length < pKeys.length) roles.push('madman');
                
                // Fill rest with citizens
                while(roles.length < pKeys.length) roles.push('citizen');
                
                // Shuffle roles
                roles.sort(() => Math.random() - 0.5);
                
                let assigned = {};
                pKeys.forEach((k, i) => assigned[k] = roles[i]);
                
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), {
                    mafiaState: 'role_reveal',
                    roles: assigned,
                    options: options,
                    alive: pKeys.reduce((acc, curr) => ({...acc, [curr]: true}), {}),
                    msg: '각자의 역할을 확인해 주세요. 아무에게도 말하지 마세요!',
                    dayCount: 1,
                    voteHistory: [],
                    lastDead: null,
                    mafiaChat: null
                });
                window.currentMafiaChats = null;
            };
        } else {
            let guideHtml = `
                <div style="text-align:center; margin-bottom:20px;">
                    <h3 style="color:#fbbf24;">⏳ 방장이 게임 옵션을 설정중입니다...</h3>
                    <p style="font-size:0.9rem; color:#aaa;">기다리는 동안 직업별 가이드와 전략을 확인해 보세요!</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px; font-size:0.85rem; max-height:400px; overflow-y:auto; padding-right:5px;">
                    <div class="card" style="padding:10px;">
                        <b>🕵️ 마피아</b> (마피아팀)<br>
                        - <span style="color:#aaa;">밤마다 1명 암살. 시민인 척 연기하며 끝까지 살아남으세요.</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>💋 유혹자</b> (마피아팀)<br>
                        - <span style="color:#aaa;">밤마다 1명을 유혹해 능력을 봉쇄합니다. 경찰이나 의사 같은 핵심 인물을 노리는 것이 핵심!</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>👮 경찰</b> (시민팀)<br>
                        - <span style="color:#aaa;">밤마다 마피아를 찾습니다. 너무 일찍 정체를 드러내면 마피아의 타겟이 되니 주의하세요.</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>👨‍⚕️ 의사</b> (시민팀)<br>
                        - <span style="color:#aaa;">밤마다 암살 위협으로부터 1명을 살립니다. 경찰 등 중요 직업을 지키거나 자신을 보호하세요.</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>🔮 영매</b> (시민팀)<br>
                        - <span style="color:#aaa;">직전에 죽은 사람의 정체(마피아/시민)를 봅니다. 죽은 자가 남긴 단서를 통해 남은 마피아를 추리하세요.</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>🏹 사냥꾼</b> (시민팀)<br>
                        - <span style="color:#aaa;">죽을 때 1명을 길동무로 데려갑니다. 내가 죽을 위기라면 과감하게 마피아로 의심되는 자를 쏘세요!</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>👔 정치인</b> (시민팀)<br>
                        - <span style="color:#aaa;">투표권이 2장이거나 처형을 면제받습니다. 여론을 주도하고 시민팀의 중심이 되세요.</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>🤡 광인</b> (개인 플레이)<br>
                        - <span style="color:#aaa;">낮 투표로 처형당하면 단독 승리합니다. 고의로 의심받을 행동을 해 사람들을 자극하세요!</span>
                    </div>
                    <div class="card" style="padding:10px;">
                        <b>👨‍🌾 시민</b> (시민팀)<br>
                        - <span style="color:#aaa;">투표로 마피아를 잡아내야 합니다. 사람들의 행동과 투표 기록을 분석해 모순을 찾아내세요.</span>
                    </div>
                </div>
            `;
            content.innerHTML = guideHtml;
        }
        return;
    }

    // Game is running
    const myRole = data.roles[window.myPlayerId];
    const isAlive = data.alive[window.myPlayerId];
    const options = data.options || {};
    
    const polDesc = [];
    if (options.pol2Votes) polDesc.push('투표 시 2표 행사');
    if (options.polImmunity) polDesc.push('낮 투표로 처형되지 않음');
    const roleInfos = {
        'mafia': { n: '🕵️ 마피아', d: '밤마다 한 명을 암살합니다.' },
        'seducer': { n: '💋 유혹자', d: '밤마다 한 명을 유혹해 다음 날 능력을 봉쇄합니다.' },
        'police': { n: '👮 경찰', d: '밤마다 한 명의 마피아 여부를 조사합니다.' },
        'doctor': { n: '👨‍⚕️ 의사', d: '밤마다 한 명을 마피아로부터 살립니다.' },
        'medium': { n: '🔮 영매', d: '밤에 최근 죽은 자의 마피아 여부를 봅니다.' },
        'hunter': { n: '🏹 사냥꾼', d: '처형되거나 암살될 때 1명을 길동무로 데려갑니다.' },
        'politician': { n: '👔 정치인', d: polDesc.length > 0 ? polDesc.join(' + ') : '투표 관련 특권이 없습니다.' },
        'madman': { n: '🤡 광인', d: '낮 투표로 처형당하면 즉시 단독 승리합니다!' },
        'citizen': { n: '👨‍🌾 시민', d: '선량한 시민입니다. 투표로 마피아를 잡으세요.' }
    };
    
    let histHtml = '';
    if (data.playerHistory && data.playerHistory[window.myPlayerId] && data.playerHistory[window.myPlayerId].length > 0) {
        histHtml = `<div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.85rem; color:#cbd5e1; text-align:left;">
                        <div style="color:#94a3b8; margin-bottom:5px; font-weight:bold;">[활동 기록]</div>
                        ${data.playerHistory[window.myPlayerId].map(h => `<div style="margin-bottom:3px;">- ${h}</div>`).join('')}
                    </div>`;
    }

    let statusBg = isAlive ? '#22c55e' : '#64748b';
    let statusText = isAlive ? '🟢 생존해 있습니다' : '💀 사망했습니다';

    let roleCounts = {};
    Object.values(data.roles).forEach(r => { roleCounts[r] = (roleCounts[r] || 0) + 1; });
    
    const roleOrder = ['mafia', 'seducer', 'police', 'doctor', 'medium', 'hunter', 'politician', 'madman', 'citizen'];
    let roleSummaryArr = [];
    roleOrder.forEach(rKey => {
        if (roleCounts[rKey]) {
            let n = roleInfos[rKey].n.replace(/[^가-힣a-zA-Z]/g, '').trim();
            let color = (rKey === 'mafia' || rKey === 'seducer') ? '#ef4444' : (rKey === 'madman' ? '#fbbf24' : '#60a5fa');
            roleSummaryArr.push(`<span style="color:${color}; font-weight:bold;">${n} ${roleCounts[rKey]}명</span>`);
        }
    });
    let roleSummaryText = roleSummaryArr.join(' <span style="color:#64748b; margin:0 3px;">/</span> ');

    let html = `
        <div style="background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; margin-bottom:20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); ${!isAlive ? 'opacity:0.7; filter:grayscale(0.5);' : ''}">
            <div style="background:${statusBg}; color:white; font-weight:bold; padding:8px; text-align:center; font-size:0.95rem;">
                ${statusText}
            </div>
            <div style="padding:15px;">
                <div style="display:flex; align-items:center; gap:15px; margin-bottom:5px;">
                    <span style="font-size:1.3rem; font-weight:bold; white-space:nowrap;">${roleInfos[myRole].n}</span>
                    <span style="font-size:0.85rem; color:#cbd5e1; opacity:0.9; text-align:left; line-height:1.3;">${roleInfos[myRole].d}</span>
                </div>
                <div style="margin-top:12px; padding:10px; background:rgba(0,0,0,0.2); border-radius:6px; font-size:0.9rem; text-align:center;">
                    <div style="color:#94a3b8; margin-bottom:5px; font-size:0.8rem; font-weight:bold;">[ 게임 전체 직업 구성 ]</div>
                    ${roleSummaryText}
                </div>
                ${!isAlive ? `<div style="font-size:0.8rem; color:#fbbf24; margin-top:10px; text-align:left;">* 사망자 전용 채팅을 이용할 수 있습니다.</div>` : ''}
                ${histHtml}
            </div>
        </div>
    `;

    // State Display
    let stateTitles = {
        'role_reveal': '👀 직업 확인',
        'night': '🌙 깊은 밤',
        'day_result': '🌅 아침 결과',
        'day': '☀️ 낮 (자유 토론)',
        'vote': '🗳️ 낮 투표 시간',
        'final_plea': '⚖️ 최후의 변론',
        'yes_no_vote': '👎 찬반 투표',
        'hunter_revenge': '🏹 사냥꾼의 최후',
        'vote_result': '⚖️ 처형 결과',
        'game_over': '🏆 게임 종료'
    };

    html += `
        <div class="phase-title">${stateTitles[data.mafiaState] || ''}</div>
        <div class="card" style="text-align:center; padding: 20px;">
            <p style="font-size:17px;">${data.msg}</p>
        </div>
    `;
    
    // Vote Summary Table (Current Vote)
    if (data.votes && (data.mafiaState === 'final_plea' || data.mafiaState === 'yes_no_vote' || data.mafiaState === 'vote_result')) {
        let counts = {};
        Object.keys(data.votes).forEach(voter => {
            let t = data.votes[voter];
            let weight = 1;
            if (data.roles[voter] === 'politician' && options.pol2Votes) weight = 2;
            if (!counts[t]) counts[t] = { count: 0, voters: [] };
            counts[t].count += weight;
            counts[t].voters.push(voter);
        });
        
        let voteSummaryHtml = `
            <div style="margin-top:20px;">
                <h3 style="margin-bottom:15px; color:#fbbf24; text-align:center;">🗳️ 낮 투표 결과 요약</h3>
                <div style="display:flex; flex-direction:column; gap:10px;">
        `;
        
        let sortedTargets = Object.keys(counts).sort((a,b) => counts[b].count - counts[a].count);
        sortedTargets.forEach((t, idx) => {
            let isMax = counts[t].count === counts[sortedTargets[0]].count;
            let votersName = options.publicVote 
                ? counts[t].voters.map(vid => `<span style="display:inline-block; background:rgba(255,255,255,0.1); padding:3px 8px; border-radius:4px; margin:2px;">${window.players[vid].name}</span>`).join(' ')
                : '<span style="color:#64748b; font-style:italic;">(비밀 투표 모드)</span>';
                
            voteSummaryHtml += `
                <div style="background:rgba(0,0,0,0.3); border-radius:10px; padding:15px; border-left: 5px solid ${isMax ? 'var(--danger)' : '#475569'}; position:relative; overflow:hidden;">
                    ${isMax ? `<div style="position:absolute; top:0; right:0; background:var(--danger); color:white; font-size:0.7rem; padding:2px 8px; border-bottom-left-radius:10px; font-weight:bold;">최다 득표</div>` : ''}
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px; margin-bottom:10px;">
                        <span style="font-size:1.15rem; font-weight:bold; color:white;">${window.players[t].name}</span>
                        <span style="color:${isMax ? 'var(--danger)' : '#fbbf24'}; font-weight:bold; font-size:1.2rem;">${counts[t].count}표</span>
                    </div>
                    <div style="font-size:0.9rem; color:#cbd5e1; display:flex; flex-wrap:wrap; align-items:center; gap:5px;">
                        <span style="color:#94a3b8; font-size:0.8rem; margin-right:5px;">투표자:</span> 
                        ${votersName}
                    </div>
                </div>
            `;
        });
        voteSummaryHtml += `</div></div>`;
        html += voteSummaryHtml;
    }

    // Vote History Accordion
    if (options.publicVote && data.voteHistory && data.voteHistory.length > 0) {
        html += `<div class="history-accordion">
                    <button class="history-btn" onclick="document.getElementById('vote-hist-content').classList.toggle('open')">📜 이전 투표 결과 보기</button>
                    <div id="vote-hist-content" class="history-content">`;
        data.voteHistory.forEach((hist, idx) => {
            let isNewFormat = !!hist.votes;
            let votesObj = isNewFormat ? hist.votes : hist;
            
            let summaryText = "";
            if (isNewFormat) {
                if (!hist.accused) {
                    summaryText = "<span style='color:#94a3b8;'>부결 (동표/기권)</span>";
                } else {
                    let execText = "";
                    if (hist.yesNo) {
                        if (hist.immunity) execText = "<span style='color:#3b82f6;'>(정치인 면제)</span>";
                        else if (hist.executed) execText = "<span style='color:#ef4444;'>(처형됨)</span>";
                        else execText = "<span style='color:#94a3b8;'>(반대로 생존)</span>";
                    } else {
                        execText = "<span style='color:#94a3b8;'>(부결)</span>";
                    }
                    summaryText = `<span style='color:var(--danger);'>최다: ${window.players[hist.accused].name} (${hist.maxVotes}표)</span> ${execText}`;
                }
            } else {
                summaryText = "<span style='color:#64748b;'>결과 기록 없음</span>";
            }

            html += `<div style="margin-bottom:15px; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                            <b>[${idx+1}일차 투표]</b>
                            <div style="font-size:0.85rem; text-align:right;">${summaryText}</div>
                        </div>
                        <table style="width:100%; font-size:0.9rem; border-spacing:0;">`;
            
            Object.keys(votesObj).forEach(voterId => {
                html += `<tr>
                            <td style="text-align:right; width:45%; padding:3px;">${window.players[voterId].name}</td>
                            <td style="text-align:center; width:10%; color:#64748b; padding:3px;">➔</td>
                            <td style="text-align:left; width:45%; padding:3px;">${window.players[votesObj[voterId]].name}</td>
                         </tr>`;
            });
            html += `</table></div>`;
        });
        html += `</div></div>`;
    }
    
    // Phase specific UI (Only for alive players, EXCEPT for Hunter taking revenge)
    const canAct = isAlive || (data.mafiaState === 'hunter_revenge' && data.hunterId === window.myPlayerId);
    
    if (canAct && data.mafiaState !== 'game_over') {
        const silenced = data.silenced === window.myPlayerId;
        
        if (silenced && (data.mafiaState === 'night' || data.mafiaState === 'vote' || data.mafiaState === 'yes_no_vote')) {
             html += `<div class="card error-text">💋 유혹자에게 홀려 이번 턴에는 행동할 수 없습니다!</div>`;
        }
        else if (data.mafiaState === 'night') {
            const actions = data.nightActions || {};
            if (myRole === 'mafia' || myRole === 'seducer') {
                const targetKey = myRole === 'mafia' ? 'kill' : 'seduce';
                if (actions[targetKey]) html += `<p class="info-text">현재 타겟: <b>${window.players[actions[targetKey]].name}</b></p>`;
                html += generateTargetList(data.alive, targetKey, myRole === 'mafia' ? '암살' : '유혹', actions[targetKey]);
            }
            else if (myRole === 'police') {
                if (actions.investigate) {
                    const targetRole = data.roles[actions.investigate];
                    const isTargetMafia = targetRole === 'mafia' || targetRole === 'seducer';
                    html += `<p class="info-text" style="color:${isTargetMafia ? '#ef4444' : '#3b82f6'};">조사 결과: <b>${window.players[actions.investigate].name}</b>님은 ${isTargetMafia ? '마피아팀입니다!' : '마피아팀이 아닙니다.'}</p>`;
                } else {
                    html += generateTargetList(data.alive, 'investigate', '조사', null);
                }
            }
            else if (myRole === 'doctor') {
                if (actions.heal) html += `<p class="info-text">현재 보호 대상: <b>${window.players[actions.heal].name}</b></p>`;
                html += generateTargetList(data.alive, 'heal', '살리기', actions.heal, true);
            }
            else if (myRole === 'medium' && data.lastDead) {
                const deadRole = data.roles[data.lastDead];
                const isTargetMafia = deadRole === 'mafia' || deadRole === 'seducer';
                html += `<div class="card info-text" style="color:#a855f7;">🔮 영매의 눈: 어젯밤 죽은 <b>${window.players[data.lastDead].name}</b>님은 ${isTargetMafia ? '마피아팀이었습니다.' : '시민팀이었습니다.'}</div>`;
            }
        } 
        else if (data.mafiaState === 'vote') {
            const votes = data.votes || {};
            const myVote = votes[window.myPlayerId];
            if (myVote) html += `<p class="info-text">현재 <b>${window.players[myVote].name}</b> 투표함.</p>`;
            html += generateTargetList(data.alive, 'voteTarget', '투표', myVote);
        }
        else if (data.mafiaState === 'yes_no_vote' && window.myPlayerId !== data.defendant) {
            const ynVotes = data.ynVotes || {};
            const myVote = ynVotes[window.myPlayerId];
            html += `<div style="display:flex; gap:10px; margin-top:20px;">
                        <button class="btn ${myVote==='yes'?'primary':'secondary'}" style="flex:1;" onclick="window.submitMafiaAction('ynVote', 'yes')">👍 찬성 (처형)</button>
                        <button class="btn ${myVote==='no'?'primary':'secondary'}" style="flex:1;" onclick="window.submitMafiaAction('ynVote', 'no')">👎 반대 (살림)</button>
                     </div>`;
        }
        else if (data.mafiaState === 'hunter_revenge' && myRole === 'hunter' && data.hunterId === window.myPlayerId) {
            const target = data.hunterTarget;
            if (target) html += `<p class="info-text">길동무 타겟: <b>${window.players[target].name}</b></p>`;
            html += generateTargetList(data.alive, 'hunterTarget', '🔫 쏘기', target);
        }
    }

    // Dead Player Chat
    if (!isAlive && data.mafiaState !== 'role_reveal') {
        let chatHtml = '';
        if (window.currentMafiaChats) {
            Object.values(window.currentMafiaChats).forEach(c => {
                chatHtml += `<div class="chat-msg"><b>${c.name}</b>: ${c.msg}</div>`;
            });
        }
        html += `
            <div class="chat-container">
                <div style="font-size:0.8rem; color:#aaa; margin-bottom:5px;">👻 사망자 전용 채팅방</div>
                <div id="mafia-chat-box" class="chat-messages">${chatHtml}</div>
                <div class="chat-input-row">
                    <input type="text" id="mafia-chat-input" placeholder="원혼의 목소리...">
                    <button class="btn primary" onclick="window.sendMafiaChat()">전송</button>
                </div>
            </div>
        `;
    }

    if (data.mafiaState === 'game_over') {
        let winColor = data.winners === 'mafia' ? '#ef4444' : data.winners === 'madman' ? '#fbbf24' : '#3b82f6';
        let winText = data.winners === 'mafia' ? '🕵️ 마피아팀 승리!' : data.winners === 'madman' ? '🤡 광인 단독 승리!' : '👨‍🌾 시민팀 승리!';
        
        let rolesHtml = '<div style="margin-top:30px; font-size:1rem; color:white; text-align:left; background:rgba(255,255,255,0.1); padding:15px; border-radius:10px; max-height:30vh; overflow-y:auto; width:80%; max-width:400px; border:1px solid rgba(255,255,255,0.2);">';
        rolesHtml += '<div style="font-size:1.1rem; font-weight:bold; margin-bottom:10px; text-align:center; color:#fbbf24;">[ 참가자 직업 공개 ]</div>';
        const roleNames = { 'mafia': '마피아', 'police': '경찰', 'doctor': '의사', 'seducer': '유혹자', 'medium': '영매', 'hunter': '사냥꾼', 'politician': '정치인', 'madman': '광인', 'citizen': '시민' };
        
        Object.keys(window.players).forEach(pId => {
            if (data.roles && data.roles[pId]) {
                const r = data.roles[pId];
                let color = (r === 'mafia' || r === 'seducer') ? '#ef4444' : (r === 'madman' ? '#fbbf24' : '#3b82f6');
                rolesHtml += `<div style="margin-bottom:8px; display:flex; justify-content:space-between;">
                                <span>${window.players[pId].name}</span>
                                <span style="color:${color}; font-weight:bold;">${roleNames[r] || r}</span>
                              </div>`;
            }
        });
        rolesHtml += '</div>';

        html += `<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:9998; flex-direction:column; backdrop-filter: blur(10px);">
                    <div style="font-size:1.5rem; color:white; margin-bottom:20px;">모든 게임 종료!</div>
                    <div style="font-size:4rem; font-weight:bold; color:${winColor}; text-shadow: 0 0 40px ${winColor}; animation: pulse 1s infinite; text-align:center; padding:0 20px;">
                        ${winText}
                    </div>
                    ${rolesHtml}
                    ${window.isHost ? `<button class="btn primary" style="margin-top:30px; font-size:1.2rem; padding:15px 30px;" onclick="window.mafiaHostAction('reset')">🔄 다시 준비하기</button>` : `<div style="margin-top:40px; color:#aaa; font-size:1.1rem;">방장이 다음 게임을 준비 중입니다...</div>`}
                 </div>`;
    }

    // Host Controls
    if (window.isHost) {
        html += `<div style="margin-top:30px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1); text-align:center;">
                    <p style="font-size:12px; color:#9ca3af; margin-bottom:10px;">방장 컨트롤</p>`;
        
        if (data.mafiaState === 'role_reveal' || data.mafiaState === 'vote_result' || data.mafiaState === 'day_result') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('${data.mafiaState === 'day_result' ? 'start_day' : 'start_night'}')">${data.mafiaState === 'day_result' ? '자유 토론 시작' : '밤으로 넘어가기'}</button>`;
        } else if (data.mafiaState === 'night') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('resolve_night')">아침 결과 발표 (수동)</button>`;
            let needsKill = false, needsInvestigate = false, needsHeal = false, needsSeduce = false;
            Object.keys(data.alive).forEach(id => {
                if (data.alive[id] && data.silenced !== id) {
                    const r = data.roles[id];
                    if (r === 'mafia') needsKill = true;
                    if (r === 'police') needsInvestigate = true;
                    if (r === 'doctor') needsHeal = true;
                    if (r === 'seducer') needsSeduce = true;
                }
            });
            let expected = 0, actual = 0;
            if (needsKill) expected++;
            if (needsInvestigate) expected++;
            if (needsHeal) expected++;
            if (needsSeduce) expected++;
            
            if (data.nightActions) {
                if (needsKill && data.nightActions.kill) actual++;
                if (needsInvestigate && data.nightActions.investigate) actual++;
                if (needsHeal && data.nightActions.heal) actual++;
                if (needsSeduce && data.nightActions.seduce) actual++;
            }
            
            if (expected > 0 && actual >= expected && !data.isCountingDown) {
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { isCountingDown: true, countdownMsg: 5 });
                let cnt = 5;
                if (window.autoResolveInterval) clearInterval(window.autoResolveInterval);
                window.autoResolveInterval = setInterval(() => {
                    cnt--;
                    if (cnt > 0) {
                        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { countdownMsg: cnt });
                    } else {
                        clearInterval(window.autoResolveInterval);
                        window.mafiaHostAction('resolve_night');
                    }
                }, 1000);
            }
        } else if (data.mafiaState === 'day') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('start_vote')">낮 투표 시작</button>`;
        } else if (data.mafiaState === 'vote') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('resolve_vote')">투표 종료 및 집계 (수동)</button>`;
            if (data.votes) {
                let expectedVotes = Object.keys(data.alive).filter(id => data.alive[id] && data.silenced !== id).length;
                if (Object.keys(data.votes).length >= expectedVotes && !data.isCountingDown) {
                    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { isCountingDown: true, countdownMsg: 3 });
                    let cnt = 3;
                    if (window.autoResolveInterval) clearInterval(window.autoResolveInterval);
                    window.autoResolveInterval = setInterval(() => {
                        cnt--;
                        if (cnt > 0) {
                            window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { countdownMsg: cnt });
                        } else {
                            clearInterval(window.autoResolveInterval);
                            window.mafiaHostAction('resolve_vote');
                        }
                    }, 1000);
                }
            }
        } else if (data.mafiaState === 'final_plea') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('start_yes_no')">찬반 투표 시작</button>`;
        } else if (data.mafiaState === 'yes_no_vote') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('resolve_yes_no')">찬반 투표 결과 발표 (수동)</button>`;
            if (data.ynVotes) {
                let expectedVotes = Object.keys(data.alive).filter(id => data.alive[id] && id !== data.defendant && data.silenced !== id).length;
                if (Object.keys(data.ynVotes).length >= expectedVotes && !data.isCountingDown) {
                    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { isCountingDown: true, countdownMsg: 3 });
                    let cnt = 3;
                    if (window.autoResolveInterval) clearInterval(window.autoResolveInterval);
                    window.autoResolveInterval = setInterval(() => {
                        cnt--;
                        if (cnt > 0) {
                            window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { countdownMsg: cnt });
                        } else {
                            clearInterval(window.autoResolveInterval);
                            window.mafiaHostAction('resolve_yes_no');
                        }
                    }, 1000);
                }
            }
        } else if (data.mafiaState === 'hunter_revenge') {
            html += `<button class="btn secondary" onclick="window.mafiaHostAction('resolve_hunter')">사냥꾼의 최후 발표 (수동)</button>`;
            if (data.hunterTarget && !data.isCountingDown) {
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { isCountingDown: true, countdownMsg: 3 });
                let cnt = 3;
                if (window.autoResolveInterval) clearInterval(window.autoResolveInterval);
                window.autoResolveInterval = setInterval(() => {
                    cnt--;
                    if (cnt > 0) {
                        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + window.myRoom), { countdownMsg: cnt });
                    } else {
                        clearInterval(window.autoResolveInterval);
                        window.mafiaHostAction('resolve_hunter');
                    }
                }, 1000);
            }
        }
        
        html += `</div>`;
    }

    if (data.isCountingDown) {
        let overlayTitle = "결과 집계 중...";
        if (data.mafiaState === 'night') overlayTitle = "모든 행동 종료! 아침이 밝아옵니다...";
        else if (data.mafiaState === 'vote') overlayTitle = "투표 완료! 결과 확인까지...";
        else if (data.mafiaState === 'yes_no_vote') overlayTitle = "찬반 투표 완료! 최종 판결까지...";
        else if (data.mafiaState === 'hunter_revenge') overlayTitle = "사냥꾼이 방아쇠를 당겼습니다...";
        
        html += `<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; flex-direction:column; backdrop-filter: blur(5px);">
                    <div style="font-size:1.5rem; color:white; margin-bottom:20px;">${overlayTitle}</div>
                    <div style="font-size:10rem; font-weight:bold; color:var(--primary); text-shadow: 0 0 30px var(--primary); animation: pulse 1s infinite;">
                        ${data.countdownMsg}
                    </div>
                 </div>`;
    }

    content.innerHTML = html;
    
    // Auto-scroll dead chat if present
    const chatBox = document.getElementById('mafia-chat-box');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Attach chat listeners if dead
    if (!isAlive) {
        setupChatListener();
        document.getElementById('mafia-chat-input')?.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') window.sendMafiaChat();
        });
    }
};

// Chat Functions
let chatListenerRef = null;
function setupChatListener() {
    if (chatListenerRef) return;
    chatListenerRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom + '/mafiaChat');
    window.firebaseOnValue(chatListenerRef, (snapshot) => {
        const chats = snapshot.val() || {};
        window.currentMafiaChats = chats;
        const chatBox = document.getElementById('mafia-chat-box');
        if (!chatBox) return;
        chatBox.innerHTML = '';
        Object.values(chats).forEach(c => {
            chatBox.innerHTML += `<div class="chat-msg"><b>${c.name}</b>: ${c.msg}</div>`;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}
window.sendMafiaChat = function() {
    const input = document.getElementById('mafia-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    const newChatRef = window.firebaseChild(window.firebaseRef(window.db, 'rooms/' + window.myRoom + '/mafiaChat'), Date.now().toString());
    window.firebaseSet(newChatRef, { name: window.players[window.myPlayerId].name, msg: msg });
    input.value = '';
};

// Target Selection UI Builder
function generateTargetList(aliveObj, actionKey, btnText, selectedId, allowSelf = false) {
    let list = `<div class="vote-list" style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">`;
    Object.keys(aliveObj).forEach(id => {
        if (aliveObj[id] && (id !== window.myPlayerId || allowSelf)) {
            const isSelected = id === selectedId;
            list += `<button class="btn ${isSelected ? 'primary' : 'secondary'}" style="${isSelected ? 'border: 2px solid #fbbf24;' : 'background-color: rgba(255,255,255,0.1);'}" onclick="window.submitMafiaAction('${actionKey}', '${id}')">
                        ${window.players[id].name} ${btnText}
                     </button>`;
        }
    });
    list += `</div>`;
    return list;
}

// Player submits action to Firebase
window.submitMafiaAction = function(actionKey, value) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    if (actionKey === 'voteTarget') {
        window.firebaseUpdate(window.firebaseChild(roomRef, 'votes'), { [window.myPlayerId]: value });
    } else if (actionKey === 'ynVote') {
        window.firebaseUpdate(window.firebaseChild(roomRef, 'ynVotes'), { [window.myPlayerId]: value });
    } else if (actionKey === 'hunterTarget') {
        window.firebaseUpdate(roomRef, { hunterTarget: value });
    } else {
        window.firebaseUpdate(window.firebaseChild(roomRef, 'nightActions'), { [actionKey]: value });
    }
};

// Host actions state machine
window.mafiaHostAction = async function(command) {
    const roomRef = window.firebaseRef(window.db, 'rooms/' + window.myRoom);
    let snapshot = await window.firebaseGet(roomRef);
    const data = snapshot.val();
    let updates = {};

    if (command === 'start_night') {
        updates = {
            mafiaState: 'night',
            msg: '달이 떴습니다. 🌙<br>밤 능력을 가진 분들은 활동해 주세요.',
            nightActions: null, votes: null, ynVotes: null, silenced: null
        };
        // 봇 로직 (밤)
        let botNightActions = {};
        Object.keys(window.players).forEach(pId => {
            if (window.players[pId].isBot && data.alive[pId]) {
                const role = data.roles[pId];
                const aliveIds = Object.keys(data.alive).filter(id => data.alive[id]);
                const target = aliveIds[Math.floor(Math.random() * aliveIds.length)];
                if (role === 'mafia') botNightActions.kill = target;
                if (role === 'police') botNightActions.investigate = target;
                if (role === 'doctor') botNightActions.heal = target;
                if (role === 'seducer') botNightActions.seduce = target;
            }
        });
        if (Object.keys(botNightActions).length > 0) updates.nightActions = botNightActions;
    } 
    else if (command === 'resolve_night') {
        updates.isCountingDown = null;
        updates.countdownMsg = null;
        const actions = data.nightActions || {};
        const alive = data.alive || {};
        
        let msg = "간밤에 평화로운 밤이 지났습니다. 아무도 죽지 않았습니다. 🕊️";
        let killedId = actions.kill;
        let healedId = actions.heal;
        
        let pHist = data.playerHistory || {};
        let dayCount = (data.voteHistory ? data.voteHistory.length : 0) + 1;
        
        Object.keys(data.alive).forEach(pId => {
            if (data.alive[pId]) {
                const r = data.roles[pId];
                if (!pHist[pId]) pHist[pId] = [];
                
                if (r === 'police' && actions.investigate) {
                    const isM = (data.roles[actions.investigate] === 'mafia' || data.roles[actions.investigate] === 'seducer');
                    pHist[pId].push(`${dayCount}일차 밤: ${window.players[actions.investigate].name} ➔ ${isM ? '<span style="color:#ef4444">마피아팀</span>' : '<span style="color:#3b82f6">시민팀</span>'}`);
                }
                else if (r === 'doctor' && actions.heal) {
                    pHist[pId].push(`${dayCount}일차 밤: ${window.players[actions.heal].name} 치료`);
                }
                else if (r === 'seducer' && actions.seduce) {
                    pHist[pId].push(`${dayCount}일차 밤: ${window.players[actions.seduce].name} 유혹`);
                }
                else if (r === 'mafia' && actions.kill) {
                    pHist[pId].push(`${dayCount}일차 밤: ${window.players[actions.kill].name} 암살 시도`);
                }
                else if (r === 'medium' && data.lastDead) {
                    const deadR = data.roles[data.lastDead];
                    const isM = (deadR === 'mafia' || deadR === 'seducer');
                    pHist[pId].push(`${dayCount}일차 밤: 죽은 ${window.players[data.lastDead].name} ➔ ${isM ? '<span style="color:#ef4444">마피아팀</span>' : '<span style="color:#3b82f6">시민팀</span>'}`);
                }
            }
        });
        updates.playerHistory = pHist;
        
        // Seducer logic
        if (actions.seduce) updates.silenced = actions.seduce;
        
        if (killedId && killedId !== healedId) {
            msg = `간밤에 비극적인 일이 일어났습니다.<br><b>${window.players[killedId].name}</b>님이 마피아에게 암살당했습니다. 🩸`;
            alive[killedId] = false;
            updates.alive = alive;
            updates.lastDead = killedId;
            
                // Hunter check
            if (data.roles[killedId] === 'hunter') {
                updates.mafiaState = 'hunter_revenge';
                updates.msg = msg + "<br><br><b>🚨 사냥꾼이 죽었습니다! 사냥꾼은 즉시 길동무를 지목해 주세요!</b>";
                updates.hunterId = killedId;
                updates.hunterTarget = null;
                updates.hunterPendingState = 'day_result';
                
                // Bot hunter logic
                if (window.players[killedId].isBot) {
                    const aliveIds = Object.keys(data.alive).filter(id => data.alive[id] && id !== killedId);
                    if (aliveIds.length > 0) {
                        updates.hunterTarget = aliveIds[Math.floor(Math.random() * aliveIds.length)];
                    }
                }
                
                window.firebaseUpdate(roomRef, updates);
                return;
            }
        }
        updates.mafiaState = 'day_result';
        updates.msg = msg;
        checkWin(updates, alive, data.roles, data.options);
    }
    else if (command === 'start_day') {
        updates = { mafiaState: 'day', msg: '생존자들은 토론을 통해 마피아를 추리해 주세요. 🗣️' };
    }
    else if (command === 'start_vote') {
        updates = { mafiaState: 'vote', msg: '투표 시간입니다! 🗳️<br>가장 의심되는 사람을 투표해 주세요.' };
        // 봇 로직 (투표)
        let botVotes = {};
        const aliveIds = Object.keys(data.alive).filter(id => data.alive[id]);
        Object.keys(window.players).forEach(pId => {
            if (window.players[pId].isBot && data.alive[pId] && data.silenced !== pId) {
                botVotes[pId] = aliveIds[Math.floor(Math.random() * aliveIds.length)];
            }
        });
        if (Object.keys(botVotes).length > 0) updates.votes = botVotes;
    }
    else if (command === 'resolve_vote') {
        updates.isCountingDown = null;
        updates.countdownMsg = null;
        const votes = data.votes || {};
        
        // Tally votes
        let counts = {};
        Object.keys(votes).forEach(voter => {
            const target = votes[voter];
            let weight = 1;
            if (data.roles[voter] === 'politician' && data.options?.pol2Votes) weight = 2;
            counts[target] = (counts[target] || 0) + weight;
        });
        
        let maxVotes = 0;
        let accusedId = null;
        let tie = false;
        
        for (const [id, count] of Object.entries(counts)) {
            if (count > maxVotes) { maxVotes = count; accusedId = id; tie = false; } 
            else if (count === maxVotes) { tie = true; }
        }
        
        // Record history
        let history = data.voteHistory || [];
        history.push({
            votes: votes,
            accused: tie ? null : accusedId,
            maxVotes: tie ? 0 : maxVotes,
            executed: false,
            yesNo: false,
            immunity: false
        });
        updates.voteHistory = history;
        

        if (accusedId && !tie) {
            updates.mafiaState = 'final_plea';
            updates.defendant = accusedId;
            updates.msg = `<b>${window.players[accusedId].name}</b>님이 최다 득표자입니다.<br>최후의 변론을 들어보겠습니다.`;
        } else {
            updates.mafiaState = 'vote_result';
            updates.msg = "동표이거나 기권이 많아 아무도 지목되지 않았습니다. 🤷‍♂️";
        }
    }
    else if (command === 'start_yes_no') {
        updates = { mafiaState: 'yes_no_vote', msg: `<b>${window.players[data.defendant].name}</b>님을 처형하시겠습니까?`, ynVotes: null };
        // 봇 로직
        let botYn = {};
        Object.keys(window.players).forEach(pId => {
            if (window.players[pId].isBot && data.alive[pId] && pId !== data.defendant && data.silenced !== pId) {
                botYn[pId] = Math.random() > 0.5 ? 'yes' : 'no';
            }
        });
        if (Object.keys(botYn).length > 0) updates.ynVotes = botYn;
    }
    else if (command === 'resolve_yes_no') {
        updates.isCountingDown = null;
        updates.countdownMsg = null;
        const ynVotes = data.ynVotes || {};
        let yes = 0, no = 0;
        Object.values(ynVotes).forEach(v => v === 'yes' ? yes++ : no++);
        
        const role = data.roles[data.defendant];
        let history = data.voteHistory || [];
        if (history.length > 0) {
            let lastHist = history[history.length - 1];
            if (lastHist && lastHist.votes) {
                lastHist.yesNo = true;
                if (yes > no) {
                    if (role === 'politician' && data.options?.polImmunity) {
                        lastHist.executed = false;
                        lastHist.immunity = true;
                    } else {
                        lastHist.executed = true;
                    }
                } else {
                    lastHist.executed = false;
                }
                updates.voteHistory = history;
            }
        }
        
        let msg = `찬성 ${yes}표, 반대 ${no}표로<br>`;
        if (yes > no) {
            // 처형 가결
            const role = data.roles[data.defendant];
            const alive = data.alive;
            
            if (role === 'politician' && data.options?.polImmunity) {
                msg += `<b>처형이 확정되었으나, 정치인의 특권으로 면제되었습니다! 😎</b>`;
                updates.mafiaState = 'vote_result';
                updates.msg = msg;
            } 
            else if (role === 'madman') {
                msg += `<b>${window.players[data.defendant].name}</b>님이 처형되었습니다.<br>그런데 그는 🤡 <b>광인</b>이었습니다!!`;
                updates.mafiaState = 'game_over';
                updates.msg = msg + "<br><br>자살에 성공한 광인의 단독 승리입니다!";
                updates.winners = 'madman';
            }
            else {
                msg += `<b>${window.players[data.defendant].name}</b>님이 처형되었습니다. ⚖️<br>그의 정체는 <b>${roleInfosText(role)}</b> 이었습니다!`;
                alive[data.defendant] = false;
                updates.alive = alive;
                updates.lastDead = data.defendant;
                
                // Hunter check
                if (role === 'hunter') {
                    updates.mafiaState = 'hunter_revenge';
                    updates.msg = msg + "<br><br><b>🚨 사냥꾼이 죽었습니다! 사냥꾼은 길동무를 지목해 주세요!</b>";
                    updates.hunterId = data.defendant;
                    updates.hunterTarget = null;
                    updates.hunterPendingState = 'vote_result';
                    
                    // Bot hunter logic
                    if (window.players[data.defendant].isBot) {
                        const aliveIds = Object.keys(data.alive).filter(id => data.alive[id] && id !== data.defendant);
                        if (aliveIds.length > 0) {
                            updates.hunterTarget = aliveIds[Math.floor(Math.random() * aliveIds.length)];
                        }
                    }
                    
                    window.firebaseUpdate(roomRef, updates);
                    return;
                }
                
                updates.mafiaState = 'vote_result';
                updates.msg = msg;
                checkWin(updates, alive, data.roles, data.options);
            }
        } else {
            msg += `<b>처형이 부결되었습니다.</b> 😅`;
            updates.mafiaState = 'vote_result';
            updates.msg = msg;
        }
    }
    else if (command === 'resolve_hunter') {
        const alive = data.alive;
        let msg = `사냥꾼이 마지막 발악으로 `;
        if (data.hunterTarget) {
            alive[data.hunterTarget] = false;
            updates.alive = alive;
            updates.lastDead = data.hunterTarget;
            msg += `<b>${window.players[data.hunterTarget].name}</b>님을 쏘고 장렬히 전사했습니다. 🩸`;
        } else {
            msg += `아무도 쏘지 않고 조용히 눈을 감았습니다.`;
        }
        
        updates.mafiaState = data.hunterPendingState; // day_result or vote_result
        updates.msg = msg;
        checkWin(updates, alive, data.roles, data.options);
    }
    else if (command === 'reset') {
        updates = {
            mafiaState: null,
            msg: null,
            alive: null,
            roles: null,
            votes: null,
            ynVotes: null,
            defendant: null,
            nightActions: null,
            silenced: null,
            winners: null,
            voteHistory: null,
            lastDead: null,
            hunterPendingState: null,
            hunterId: null,
            hunterTarget: null,
            options: null
        };
        if (window.firebaseSet) {
            window.firebaseSet(window.firebaseChild(roomRef, 'mafiaChat'), null);
        }
    }
    
    window.firebaseUpdate(roomRef, updates);
};

function roleInfosText(role) {
    if(role==='mafia' || role==='seducer') return '마피아팀';
    return '선량한 시민/특수직업';
}

function checkWin(updates, aliveObj, rolesObj, options) {
    let mafiaCount = 0;
    let citizenTeamCount = 0;
    
    Object.keys(aliveObj).forEach(id => {
        if (aliveObj[id]) { 
            if (rolesObj[id] === 'mafia' || rolesObj[id] === 'seducer') mafiaCount++;
            else citizenTeamCount++;
        }
    });
    
    if (mafiaCount === 0) { updates.mafiaState = 'game_over'; updates.winners = 'citizen'; }
    else if (mafiaCount >= citizenTeamCount) { updates.mafiaState = 'game_over'; updates.winners = 'mafia'; }
}
