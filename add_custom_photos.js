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

const newCelebrities = [
    {q: "이 사람은 누구일까요?", a: "성룡", img: "images/jackie_chan.png"},
    {q: "이 사람은 누구일까요?", a: "임원희", img: "images/im_won_hee.png"},
    {q: "이 사람은 누구일까요?", a: "이재용", img: "images/lee_jae_yong.png"},
    {q: "이 사람은 누구일까요?", a: "라미란", img: "images/ra_mi_ran.png"},
    {q: "이 사람은 누구일까요?", a: "배성재", img: "images/bae_sung_jae.png"}
];

if (!QUIZ_DB.person_image) QUIZ_DB.person_image = {};
if (!QUIZ_DB.person_image['유명인 (사진)']) QUIZ_DB.person_image['유명인 (사진)'] = [];

QUIZ_DB.person_image['유명인 (사진)'] = QUIZ_DB.person_image['유명인 (사진)'].concat(newCelebrities);

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
console.log('Successfully appended custom photos to quiz_db.js');
