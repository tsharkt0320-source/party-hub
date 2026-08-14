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

const newCharacters = [
    {q: "이 캐릭터는 누구일까요?", a: "스폰지밥", img: "images/spongebob.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "펭수", img: "images/pengsoo.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "도라에몽", img: "images/doraemon.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "피카츄", img: "images/pikachu.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "뽀로로", img: "images/pororo.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "보노보노", img: "images/bonobono.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "호빵맨", img: "images/anpanman.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "스누피", img: "images/snoopy.jpg"},
    {q: "이 캐릭터는 누구일까요?", a: "가필드", img: "images/garfield.jpg"}
];

if (!QUIZ_DB.person_image) QUIZ_DB.person_image = {};
if (!QUIZ_DB.person_image['캐릭터 (사진)']) QUIZ_DB.person_image['캐릭터 (사진)'] = [];

QUIZ_DB.person_image['캐릭터 (사진)'] = QUIZ_DB.person_image['캐릭터 (사진)'].concat(newCharacters);

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
console.log('Successfully appended 9 new character photos to quiz_db.js');
