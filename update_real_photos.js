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

const celebs = QUIZ_DB.person_image['유명인 (사진)'];

// 1. Update extensions for existing ones
const mappings = {
    '유재석': 'images/yoo.png',
    '강호동': 'images/kanghodong.png',
    '박명수': 'images/parkmyungsoo.png',
    '문희준': 'images/moonheejun.png'
};

celebs.forEach(item => {
    if (mappings[item.a]) {
        item.img = mappings[item.a];
    }
});

// 2. Add Shin Dong-yup
const hasShin = celebs.some(c => c.a === '신동엽');
if (!hasShin) {
    celebs.splice(1, 0, {q: "이 사람은 누구일까요?", a: "신동엽", img: "images/shin.png"}); // Insert at index 1 to keep order similar to text quizzes
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
console.log('Successfully updated 5 photos in quiz_db.js');
