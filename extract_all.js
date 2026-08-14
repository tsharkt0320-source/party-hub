const fs = require('fs');

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

let md = '# 🎮 단체게임 모음집 전체 정답 리스트\n\n';
md += '현재 등록된 모든 퀴즈 게임의 카테고리별 정답 및 힌트 목록입니다.\n\n';

const modeNames = {
    'initial': '🔠 초성 퀴즈',
    'words4': '🗣️ 4글자 이어말하기',
    'charades': '🕺 몸으로 말해요',
    'person_image': '📸 인물/캐릭터 사진 맞추기',
    'person_text': '🕵️ 인물 퀴즈 (스무고개)',
    'proverb_meaning': '📖 속담 뜻 맞추기'
};

for (const mode in QUIZ_DB) {
    if (!modeNames[mode]) continue;

    md += `## ${modeNames[mode]}\n\n`;

    for (const cat in QUIZ_DB[mode]) {
        if (cat === '랜덤') continue;
        md += `### 📂 ${cat}\n\n`;
        const items = QUIZ_DB[mode][cat];
        
        let list = '';
        items.forEach(item => {
            if (mode === 'initial') {
                list += `- **${item.q}** 👉 ${item.a}\n`;
            } else if (mode === 'words4') {
                list += `- **${item.q}** 👉 ${item.a}\n`;
            } else if (mode === 'charades') {
                list += `- ${item.q}\n`;
            } else if (mode === 'person_image') {
                // Handle arrays in answers (due to fuzzy matching aliases if any, though currently strings or arrays)
                const ans = Array.isArray(item.a) ? item.a.join(', ') : item.a;
                list += `- **${ans}** (이미지 파일: ${item.img})\n`;
            } else if (mode === 'person_text') {
                list += `- **${item.a}**\n  - 힌트: ${item.hints.join(', ')}\n`;
            } else if (mode === 'proverb_meaning') {
                list += `- **${item.a}** 👉 ${item.q}\n`;
            }
        });
        md += list + '\n';
    }
}

fs.writeFileSync('C:/Users/admin/.gemini/antigravity/brain/846d08e7-c586-4f56-a657-9707aeb98458/quiz_answers_list.md', md, 'utf8');
console.log('Artifact created.');
