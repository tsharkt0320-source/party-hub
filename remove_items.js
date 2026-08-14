const fs = require('fs');

let content = fs.readFileSync('quiz_db.js', 'utf8');

const wordsToRemove = [
    '아이러브스쿨', '플로피디스크', '비디오테이프', '카세트테이프', '필름카메라',
    '훼미리마트', '프로스펙스', '배스킨라빈스', '파리바게뜨', '피자헛매장',
    '비비탄총', '학교앞문구점', '동네오락실', '휴대용게임기'
];

wordsToRemove.forEach(word => {
    // Regex to match the entire line containing the word
    const regex = new RegExp(`\\s*\\{q:[^\\}]*full:\\s*['"]${word}['"]\\},?`, 'g');
    content = content.replace(regex, '');
});

// Since removing the last item might leave a trailing comma on the new last item, let's fix trailing commas before brackets.
// This handles any stray commas at the end of an array.
content = content.replace(/,(\s*\])/g, '$1');

fs.writeFileSync('quiz_db.js', content, 'utf8');
console.log('Successfully removed items.');
