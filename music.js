// music.js — 🎵 노래 듣고 맞추기
//
// 이 파일이 존재하는 이유는 하나다.
// quiz.js 는 파이어베이스에서 신호가 올 때마다 #quiz-content 를 통째로 다시 그린다.
// 유튜브 플레이어를 그 안에 넣으면 신호가 올 때마다 iframe 이 새로 만들어져
// 듣던 노래가 처음으로 되감긴다. 그래서 플레이어는 #quiz-content 바깥의
// #music-stage 에 두고, 여기서 명령형으로만 손댄다.

let apiPromise = null;
let player = null;          // YT.Player 인스턴스 (한 번 만들면 계속 쓴다)
let playerReady = false;
let curVid = null;          // 지금 올라가 있는 영상
let pausedFor = null;       // 어떤 부저 승자 때문에 멈췄는지 (중복 정지 방지)

function ensureApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(resolve => {
        if (window.YT && window.YT.Player) return resolve();
        // 다른 곳에서 이미 콜백을 걸어 뒀을 수도 있으니 이어 붙인다
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
            if (typeof prev === 'function') prev();
            resolve();
        };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => resolve();   // 실패해도 앱이 멈추지는 않게
        document.head.appendChild(s);
    });
    return apiPromise;
}

// 노래를 트는 사람 = 출제자, 지정 안 했으면 방장.
// 이 사람 화면에만 플레이어가 뜬다. 여러 기기에서 동시에 틀면 소리가 겹친다.
window.musicAmDJ = function (data) {
    if (!data) return false;
    const judge = (data.buzzerJudge && window.players && window.players[data.buzzerJudge])
        ? data.buzzerJudge : null;
    return judge ? (judge === window.myPlayerId) : !!window.isHost;
};

function stageEl() { return document.getElementById('music-stage'); }

function hideStage() {
    const st = stageEl();
    if (st) st.style.display = 'none';
    // 화면에서 감춰도 iframe 은 계속 소리를 낸다. 반드시 멈춰 준다.
    if (player && playerReady) { try { player.pauseVideo(); } catch (e) {} }
}

// quiz.js 가 매 렌더 끝에 부른다
window.musicSync = function (data) {
    const st = stageEl();
    if (!st) return;

    const on = data && data.gameMode === 'music' && data.quizState === 'playing' && window.musicAmDJ(data);
    if (!on) { hideStage(); return; }

    st.style.display = 'block';

    ensureApi().then(() => {
        if (!window.YT || !window.YT.Player) {
            st.innerHTML = '<div class="music-fallback">유튜브를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</div>';
            return;
        }
        if (!player) {
            // 이 div 는 YT.Player 가 iframe 으로 갈아치운다
            st.innerHTML = '<div class="music-frame"><div id="music-player"></div></div>' +
                           '<div class="music-tip">▶ 를 누르고, <b>재생바를 드래그</b>해 원하는 부분부터 들려주세요</div>';
            curVid = data.musicVid || null;
            player = new window.YT.Player('music-player', {
                videoId: curVid || undefined,
                playerVars: { playsinline: 1, rel: 0, controls: 1 },
                events: { onReady: () => { playerReady = true; } }
            });
            return;
        }
        if (!playerReady) return;

        // 문제가 바뀌었으면 새 곡을 올린다.
        // cue 는 '올려만 두기' — 방장이 ▶ 를 눌러야 소리가 난다.
        if (data.musicVid && data.musicVid !== curVid) {
            curVid = data.musicVid;
            pausedFor = null;
            try { player.cueVideoById(data.musicVid); } catch (e) {}
            return;
        }

        // 부저가 눌리면 자동으로 멈춘다 — 답을 말하는 동안 노래가 겹치지 않게.
        // 오답 처리로 승자가 지워지면 다시 틀 준비만 하고, 재생은 방장이 직접 한다.
        if (data.buzzer_winner) {
            if (pausedFor !== data.buzzer_winner) {
                pausedFor = data.buzzer_winner;
                try { player.pauseVideo(); } catch (e) {}
            }
        } else {
            pausedFor = null;
        }
    });
};

// 게임 화면을 떠날 때 (app.js 에서 부른다)
window.musicStop = function () {
    hideStage();
};
