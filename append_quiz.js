const fs = require('fs');

const userPrompt = `
🔠 1. 초성 퀴즈 (정답에서 초성 정확히 추출)
📂 한국 영화
ㅇㅅㄹ 👉 아수라 (힌트: 정우성, 황정민 주연의 느와르 영화)
ㄱㅅ 👉 곡성 (힌트: 뭣이 중헌디! 곽도원 주연 스릴러)
ㅎㅇㄷ 👉 해운대 (힌트: 쓰나미가 덮치는 재난 영화)
ㅅㄱㅇㅊ 👉 설국열차 (힌트: 꼬리칸 사람들의 반란)
ㄱㅅㅇㅈ 👉 검사외전 (힌트: 황정민과 강동원의 콤비 영화)
ㅁㄹ 👉 명량 (힌트: 최민식 주연, 이순신 장군 해전)
ㅇㅅ 👉 암살 (힌트: 전지현, 이정재, 하정우 주연 독립운동)
ㅌㅅㅇㅈㅅ 👉 택시운전사 (힌트: 송강호 주연, 광주 민주화 운동)
ㅂㄹㄹ 👉 베를린 (힌트: 하정우, 한석규 첩보 액션)

📂 과자/아이스크림
ㄲㄲㅋ 👉 꼬깔콘 (힌트: 손가락에 끼워 먹는 재미)
ㅂㅂㅂ 👉 비비빅 (힌트: 팥이 들어간 막대 아이스크림)
ㅁㅅ 👉 몽쉘 (힌트: 초코파이 라이벌, 부드러운 크림)
ㅅㅋㄹㅂ 👉 스크류바 (힌트: 비비 꼬인 모양, 사과맛 딸기맛)
ㅈㄱㅊ 👉 자갈치 (힌트: 문어 모양, 짭짤한 과자)
ㅇㅍㄹ 👉 양파링 (힌트: 동그란 모양의 양파맛 과자)
ㄲㄲㅂㄱ 👉 꿀꽈배기 (힌트: 꿀이 발라져 있는 달콤한 과자)
ㅊㅋㅍㅇ 👉 초코파이 (힌트: 말하지 않아도 알아요, 정(情))
ㅇㅈㅇㄸㅋ 👉 오징어땅콩 (힌트: 오징어 맛이 나는 둥근 땅콩 과자)

📂 추억의 가요
ㅂㅇ 👉 보아 (힌트: 아시아의 별, No.1, 아틀란티스 소녀)
ㄷㅂㅅㄱ 👉 동방신기 (힌트: 미로틱, 허그, 주문)
ㅂㅈ 👉 버즈 (힌트: 가시, 겁쟁이, 남자를 몰라)
ㅇㅅㅇ 👉 이수영 (힌트: 휠릴리, 라라라, 2000년대 발라드 여왕)
ㅇㅈㅎ 👉 엄정화 (힌트: 초대, 포이즌, 페스티벌)
ㅂㅈㅇ 👉 백지영 (힌트: 총 맞은 것처럼, 사랑 안 해)
ㅇㄷㄱㅅ 👉 원더걸스 (힌트: 텔미, 노바디, 쏘핫)
ㅅㅍㅈㄴㅇ 👉 슈퍼주니어 (힌트: 쏘리쏘리, 13인조 보이그룹)
ㅇㅍㅎㅇ 👉 에픽하이 (힌트: 플라이, 우산, 타블로)
ㄱㄷㄹ 👉 김동률 (힌트: 기억의 습작, 다시 사랑한다 말할까)

🗣️ 2. 4글자 이어말하기
📂 사자성어
십시 👉 일반 (십시일반)
동고 👉 동락 (동고동락)
천고 👉 마비 (천고마비)
안하 👉 무인 (안하무인)
마이 👉 동풍 (마이동풍)

📂 일상 단어
블랙 👉 박스
하이 👉 패스
체크 👉 카드
신용 👉 카드
페이 👉 스북
카카 👉 오톡
커피 👉 머신
드라 👉 이기
후라 👉 이팬
샌드 👉 위치

🕺 3. 몸으로 말해요
📂 동물
하마
악어
카멜레온
대머리독수리
물개
코뿔소
박쥐
거미

🕵️ 4. 인물 퀴즈 (스무고개)
📂 유명인 (스무고개)
손흥민
힌트: 대한민국 국적, 축구선수, 강원도 춘천 출생, 아시아인 최초 프리미어리그 득점왕, 토트넘 홋스퍼 캡틴, 등번호 7번, 찰칵 세리머니
김연아
힌트: 대한민국 국적, 피겨 스케이팅, 올림픽 금메달리스트, 밴쿠버 동계올림픽, 트리플 러츠, 피겨 여왕, 연아의 햅틱
이강인
힌트: 대한민국 국적, 축구선수, 날아라 슛돌이 출신, 왼발잡이, U-20 월드컵 골든볼, 발렌시아 CF, 파리 생제르맹
류현진
힌트: 대한민국 국적, 야구선수, 투수, 한화 이글스, 코리안 몬스터, LA 다저스, 토론토 블루제이스
페이커
힌트: 대한민국 국적, 프로게이머, 본명 이상혁, 리그 오브 레전드, T1 소속, 미드 라이너, 불사대마왕
스티브 잡스
힌트: 미국 국적, 기업인, 검은색 터틀넥, 청바지와 뉴발란스, Stay hungry, stay foolish, 픽사(Pixar) 인수, 애플(Apple) 창업자
빌 게이츠
힌트: 미국 국적, 기업인, 억만장자, 하버드 대학교 중퇴, 자선재단 설립, 윈도우 운영체제, 마이크로소프트 창업자
일론 머스크
힌트: 미국 국적, 기업인, 남아프리카 공화국 출생, 트위터(X) 인수, 도지코인, 스페이스X, 테슬라 CEO
마크 저커버그
힌트: 미국 국적, 기업인, 하버드 대학교 중퇴, 메타(Meta) CEO, 회색 티셔츠, SNS 창업자, 페이스북 창업자
백종원
힌트: 대한민국 국적, 요리연구가 겸 기업인, 충청도 사투리, 더본코리아 대표, 골목식당, 슈가보이, 아내 소유진

📂 연예인 (스무고개)
전현무
힌트: 대한민국 국적, 방송인, 아나운서 출신, 연세대학교 출신, 루시퍼 춤, 팜유 패밀리, 나 혼자 산다, 무무
장도연
힌트: 대한민국 국적, 코미디언, 174cm 장신, KBS 공채 개그맨, Y자 춤, 꼬리에 꼬리를 무는 그날 이야기, 살롱드립
송강호
힌트: 대한민국 국적, 배우, 밀양 출생, 봉준호 감독의 페르소나, 밥은 먹고 다니냐, 살인의 추억, 기생충, 택시운전사
차은우
힌트: 대한민국 국적, 가수 겸 배우, 보이그룹 아스트로 멤버, 만찢남, 얼굴 천재, 최최차차, 여신강림, 본명 이동민
박보검
힌트: 대한민국 국적, 배우, 명지대학교 출신, 뮤직뱅크 MC 출신, 감사하다!, 응답하라 1988, 구르미 그린 달빛, 검보
한소희
힌트: 대한민국 국적, 배우, 울산 출생, 블로그 여신, 부부의 세계, 알고있지만,, 마이 네임, 경성크리처
김수현
힌트: 대한민국 국적, 배우, 중앙대학교 출신, 드림하이, 해를 품은 달, 도민준, 별에서 온 그대, 눈물의 여왕
전지현
힌트: 대한민국 국적, 배우, 본명 왕지현, 테크노 춤 CF, 엽기적인 그녀, 견우야 미안해, 도둑들, 별에서 온 그대 천송이
장원영
힌트: 대한민국 국적, 가수, 프로듀스 48 1위, IZ*ONE 출신, 아이브(IVE) 멤버, 원영적 사고, 럭키비키
임영웅
힌트: 대한민국 국적, 가수, 포천 출생, 실용음악과 출신, 유튜브 구독자 100만 명 돌파, 이제 나만 믿어요, 영웅시대, 미스터트롯 진

📂 역사 인물 (스무고개)
에이브러햄 링컨
힌트: 미국 국적, 정치인, 키가 매우 큼, 수염과 턱시도 모자, 미국 제16대 대통령, 게티즈버그 연설, 노예 해방 선언
나폴레옹
힌트: 프랑스 국적, 군인 겸 황제, 코르시카 섬 출생, 워털루 전투, 세인트헬레나 섬 유배, 내 사전에 불가능은 없다, 프랑스 제1제국 황제
클레오파트라
힌트: 이집트 국적, 프톨레마이오스 왕조, 미인, 카이사르와의 연인 관계, 안토니우스와의 연인 관계, 독사에 물려 자살, 이집트의 마지막 파라오
알베르트 아인슈타인
힌트: 독일 출생, 물리학자, 노벨 물리학상 수상, 헝클어진 머리, 혀를 내민 사진, E=mc², 상대성 이론
윤동주
힌트: 조선 출생, 시인, 연희전문학교 출신, 일본 후쿠오카 형무소에서 옥사, 하늘과 바람과 별과 시, 서시, 별 헤는 밤
허준
힌트: 조선 시대, 의관, 선조와 광해군의 어의, 유네스코 세계기록유산, 소설과 드라마의 주인공, 조선 최고의 명의, 동의보감 집필
이황
힌트: 조선 시대, 문신 겸 학자, 호는 퇴계, 도산서원, 성리학의 대가, 이이와 쌍벽을 이룸, 천원 지폐 인물
정약용
힌트: 조선 시대, 실학자, 호는 다산, 수원 화성 설계, 거중기 발명, 강진에서 18년 유배, 목민심서 집필
`;

const lines = userPrompt.split('\n').map(l => l.trim()).filter(l => l);

const modeMap = {
    '🔠 1. 초성 퀴즈 (정답에서 초성 정확히 추출)': 'initial',
    '🗣️ 2. 4글자 이어말하기': 'words4',
    '🕺 3. 몸으로 말해요': 'charades',
    '🕵️ 4. 인물 퀴즈 (스무고개)': 'person_text'
};

let currentMode = null;
let currentCat = null;
const itemsToAdd = {
    initial: {},
    words4: {},
    charades: {},
    person_text: {}
};

let currentPersonName = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (modeMap[line]) {
        currentMode = modeMap[line];
        continue;
    }
    
    if (line.startsWith('📂 ')) {
        currentCat = line.replace('📂 ', '').replace(' (10개)', '').replace(' (5개)', '').replace(' (국내외 포함 10개)', '').trim();
        if (currentCat === '추억의 가수') currentCat = '추억의 가요'; // Fix mismatch in categories
        if (!itemsToAdd[currentMode][currentCat]) {
            itemsToAdd[currentMode][currentCat] = [];
        }
        continue;
    }

    if (currentMode === 'initial') {
        const parts = line.split('👉');
        if (parts.length === 2) {
            const q = parts[0].trim();
            const aPart = parts[1].trim();
            const aMatch = aPart.match(/^(.*?)\s*\(힌트:\s*(.*?)\)$/);
            if (aMatch) {
                const a = aMatch[1].trim();
                const hints = aMatch[2].split(',').map(h => h.trim());
                itemsToAdd[currentMode][currentCat].push({ q, a, hints });
            } else {
                itemsToAdd[currentMode][currentCat].push({ q, a: aPart });
            }
        }
    } else if (currentMode === 'words4') {
        const parts = line.split('👉');
        if (parts.length === 2) {
            const q = parts[0].trim();
            const aPart = parts[1].trim();
            const aMatch = aPart.match(/^(.*?)\s*\((.*?)\)$/);
            if (aMatch) {
                const a = aMatch[1].trim();
                const full = aMatch[2].trim();
                itemsToAdd[currentMode][currentCat].push({ q, a, full });
            } else {
                itemsToAdd[currentMode][currentCat].push({ q, a: aPart, full: q+aPart });
            }
        }
    } else if (currentMode === 'charades') {
        itemsToAdd[currentMode][currentCat].push({ q: line, a: line });
    } else if (currentMode === 'person_text') {
        if (line.startsWith('힌트:')) {
            if (currentPersonName) {
                const hintsStr = line.replace('힌트:', '').trim();
                const hints = hintsStr.split(',').map(h => h.trim());
                itemsToAdd[currentMode][currentCat].push({
                    q: '이 인물은 누구일까요?',
                    a: currentPersonName,
                    hints: hints
                });
                currentPersonName = null;
            }
        } else {
            currentPersonName = line;
        }
    }
}

const content = fs.readFileSync('quiz_db.js', 'utf8');

let QUIZ_DB;
try {
    const sandbox = { window: {} };
    const vm = require('vm');
    vm.createContext(sandbox);
    vm.runInContext(content, sandbox);
    QUIZ_DB = sandbox.window.QUIZ_DB;
} catch(e) {
    console.error('Error evaluating quiz_db.js', e);
    process.exit(1);
}

// Append new items
for (const mode in itemsToAdd) {
    for (const cat in itemsToAdd[mode]) {
        if (!QUIZ_DB[mode]) QUIZ_DB[mode] = {};
        if (!QUIZ_DB[mode][cat]) QUIZ_DB[mode][cat] = [];
        QUIZ_DB[mode][cat] = QUIZ_DB[mode][cat].concat(itemsToAdd[mode][cat]);
    }
}

// Format back to JS
function stringify(obj, indent = '') {
    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        const innerIndent = indent + '    ';
        let res = '[\n';
        for (let i=0; i<obj.length; i++) {
            if (typeof obj[i] === 'object' && obj[i] !== null && !Array.isArray(obj[i])) {
                let itemStr = '{';
                let keys = Object.keys(obj[i]);
                for (let k=0; k<keys.length; k++) {
                    let key = keys[k];
                    let val = obj[i][key];
                    itemStr += key + ': ' + JSON.stringify(val);
                    if (k < keys.length - 1) itemStr += ', ';
                }
                itemStr += '}';
                res += innerIndent + itemStr;
            } else {
                res += innerIndent + JSON.stringify(obj[i]);
            }
            if (i < obj.length - 1) res += ',\n';
            else res += '\n';
        }
        res += indent + ']';
        return res;
    } else if (typeof obj === 'object' && obj !== null) {
        const innerIndent = indent + '    ';
        let res = '{\n';
        const keys = Object.keys(obj);
        for (let i=0; i<keys.length; i++) {
            const key = keys[i];
            const kStr = key.includes(' ') || key.includes('/') || key.includes('·') ? "'" + key + "'" : key;
            res += innerIndent + kStr + ': ' + stringify(obj[key], innerIndent);
            if (i < keys.length - 1) res += ',\n';
            else res += '\n';
        }
        res += indent + '}';
        return res;
    }
    return JSON.stringify(obj);
}

let newJs = 'window.QUIZ_DB = ' + stringify(QUIZ_DB) + ';\n\n';
newJs += "// Initialize Random categories\n" +
"['initial', 'words4', 'charades', 'person_image', 'person_text', 'proverb_meaning'].forEach(mode => {\n" +
"    let all = [];\n" +
"    Object.keys(window.QUIZ_DB[mode] || {}).forEach(cat => {\n" +
"        if (cat !== '랜덤') all = all.concat(window.QUIZ_DB[mode][cat]);\n" +
"    });\n" +
"    if (window.QUIZ_DB[mode]) window.QUIZ_DB[mode]['랜덤'] = all;\n" +
"});\n";

fs.writeFileSync('quiz_db.js', newJs, 'utf8');
console.log('Successfully appended new items to quiz_db.js');
