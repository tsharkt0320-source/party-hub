const fs = require('fs');
const content = fs.readFileSync('quiz_db.js', 'utf8');
const matchPerson = content.match(/'유명인 \(사진\)': \[([\s\S]*?)\],/);
const matchChar = content.match(/'캐릭터 \(사진\)': \[([\s\S]*?)\],/);
const getNames = (match) => {
  if(!match) return [];
  const arr = match[1].split('\n').filter(l => l.includes('a:'));
  return arr.map(l => {
    const m = l.match(/a:\s*['"\[]([^'"\]]+)['"\]]/);
    return m ? m[1] : '';
  }).filter(Boolean);
};
console.log('=== 유명인 (사진) ===');
console.log(getNames(matchPerson).join(', '));
console.log('\n=== 캐릭터 (사진) ===');
console.log(getNames(matchChar).join(', '));
