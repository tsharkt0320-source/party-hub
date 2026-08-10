// quiz.js
window.updateQuiz = function(data) {
    const content = document.getElementById('quiz-content');
    
    if (!data.quizState) {
        if (isHost) {
            content.innerHTML = `
                <div class="input-group">
                    <input type="text" id="input-quiz-question" placeholder="초성을 입력하세요 (예: ㅅㄱ)">
                    <input type="text" id="input-quiz-answer" placeholder="정답을 입력하세요 (예: 사과)">
                </div>
                <button id="btn-start-quiz" class="btn primary">문제 출제하기</button>
            `;
            document.getElementById('btn-start-quiz').onclick = () => {
                const q = document.getElementById('input-quiz-question').value.trim();
                const a = document.getElementById('input-quiz-answer').value.trim();
                if (!q || !a) { alert("문제와 정답을 모두 입력하세요."); return; }
                
                window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
                    quizState: 'playing',
                    question: q,
                    answer: a,
                    winner: null
                });
            };
        } else {
            content.innerHTML = '<p style="text-align:center;">방장이 문제를 출제하고 있습니다...</p>';
        }
        return;
    }

    // Quiz playing
    let html = `
        <div class="card">
            <h3 style="color:var(--text-muted)">초성 퀴즈</h3>
            <div style="font-size: 3rem; font-weight: 900; color: var(--primary); letter-spacing: 10px; margin: 20px 0;">
                ${data.question}
            </div>
        </div>
    `;

    if (data.winner) {
        html += `
            <div class="card" style="background:var(--success)">
                <h3 style="color:white">🎉 정답! 🎉</h3>
                <p style="font-size:1.2rem; color:white;">정답: <strong>${data.answer}</strong></p>
                <p style="font-size:1.1rem; color:white; margin-top:10px;">맞힌 사람: <strong>${players[data.winner].name}</strong></p>
            </div>
        `;
        if (isHost) {
            html += `<button class="btn primary" style="margin-top:20px;" onclick="resetQuiz()">다음 문제 내기</button>`;
        }
    } else {
        if (!isHost) {
            html += `
                <div class="input-group">
                    <input type="text" id="input-guess" placeholder="정답을 입력하고 확인을 누르세요">
                </div>
                <button class="btn secondary" onclick="submitGuess('${data.answer}')">정답 확인</button>
            `;
        } else {
            html += `<p style="text-align:center; color:var(--warning);">사람들이 정답을 맞히기를 기다리고 있습니다...</p>`;
            html += `<button class="btn secondary" style="margin-top:20px;" onclick="resetQuiz()">문제 취소</button>`;
        }
    }

    content.innerHTML = html;
};

window.submitGuess = function(correctAnswer) {
    const guess = document.getElementById('input-guess').value.trim();
    if (guess === correctAnswer) {
        // I won!
        window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
            winner: myPlayerId
        });
    } else {
        alert("틀렸습니다! 다시 시도하세요.");
        document.getElementById('input-guess').value = '';
    }
};

window.resetQuiz = function() {
    window.firebaseUpdate(window.firebaseRef(window.db, 'rooms/' + myRoom), {
        quizState: null,
        question: null,
        answer: null,
        winner: null
    });
};
