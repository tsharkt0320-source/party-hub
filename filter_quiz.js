const fs = require('fs');

const userPrompt = `
🔠 초성 퀴즈
📂 스타크래프트
ㅇㅂㄹㄷ 👉 오버로드
ㅈㄱㄹ 👉 저글링
ㅂㅌㅋㄹㅈ 👉 배틀크루저
ㅅㅈㅌㅋ 👉 시즈탱크
ㅍㅇㅇㅂ 👉 파이어뱃
ㅁㅌㄹㅅㅋ 👉 뮤탈리스크
ㅁㄹ 👉 마린
ㅎㅇㅌㅍㄹ 👉 하이템플러
ㄷㅋㅌㅍㄹ 👉 다크템플러
ㅋㄹㅇ 👉 캐리어
ㄴㅅㅅ 👉 넥서스
ㄷㄹㄱ 👉 드라군
ㅈㄹ 👉 질럿
ㄱㄹㅇ 👉 골리앗
ㅂㅊ 👉 벌처
ㅅㅇㅇㅅㅂㅅ 👉 사이언스베슬
ㅁㄷ 👉 메딕
ㄹㅋ 👉 러커
ㅎㄷㄹㄹㅅㅋ 👉 히드라리스크
ㅍㄹㅂ 👉 프로브
📂 리그오브레전드
ㅌㅁ 👉 티모
ㅇㅅㅇ 👉 야스오
ㄹㅅ 👉 리신
ㅇㄹ 👉 아리
ㅇㅈㄹㅇ 👉 이즈리얼
ㄱㄹ 👉 가렌
ㅂㅇ 👉 베인
ㅁㅅㅌㅇ 👉 마스터이
ㅅㅋ 👉 샤코
ㅈㄷ 👉 제드
ㅇㅁㅁ 👉 아무무
ㅂㄹㅊㅋㄹㅋ 👉 블리츠크랭크
ㅇㅅ 👉 애쉬
ㅅㄴ 👉 소나
ㅇㄹㅅㅌ 👉 알리스타
ㅌㄹㄷㅁㅇ 👉 트린다미어
ㅈㅋㅅ 👉 징크스
ㄷㄹㅇㅅ 👉 다리우스
ㄹㅅ 👉 럭스
ㅇㄹㄹㅇ 👉 이렐리아
📂 한국 영화
ㄱㅁ 👉 괴물
ㅂㅌㄹ 👉 베테랑
ㄱㅅ 👉 관상
ㅇㅈㅆ 👉 아저씨
ㅅㄱㅎㄲ 👉 신과함께
ㄱㅈㅅㅈ 👉 국제시장
ㄱㅎ 👉 광해
ㅂㅅㅎ 👉 부산행
ㄷㄷㄷ 👉 도둑들
ㄱㅎㅈㅇ 👉 극한직업
ㅇㄱㅈㅇㄱㄴ 👉 엽기적인그녀
ㅊㄱ 👉 친구
ㅌㅋㅅ 👉 투캅스
ㅅㄹ 👉 쉬리
ㅅㅁㄷ 👉 실미도
ㅇㄷㅂㅇ 👉 올드보이
ㅌㄱㄱㅎㄴㄹㅁ 👉 태극기휘날리며
ㅅㅇㅇㅊㅇ 👉 살인의추억
ㅌㅉ 👉 타짜
ㅇㅇㄴㅈ 👉 왕의남자
ㄱㅅㅊ 👉 기생충
ㅂㅈㄷㅅ 👉 범죄도시
📂 외국 영화
ㅌㅇㅌㄴ 👉 타이타닉
ㅁㅌㄹㅅ 👉 매트릭스
ㅌㅁㄴㅇㅌ 👉 터미네이터
ㅈㄹㄱㄱㅇ 👉 쥬라기공원
ㅎㄹㅍㅌ 👉 해리포터
ㄴㅎㄹㅈㅇ 👉 나홀로집에
ㅇㅂㅌ 👉 아바타
ㅂㅈㅇㅈㅇ 👉 반지의제왕
ㅁㅅㅇㅍㅅㅂ 👉 미션임파서블
ㅇㅂㅈㅅ 👉 어벤져스
ㅅㅍㅇㄷㅁ 👉 스파이더맨
ㅇㅇㅇㅁ 👉 아이언맨
ㅋㅍㅍㄷ 👉 쿵푸팬더
ㅌㅇㅅㅌㄹ 👉 토이스토리
ㅅㄹ 👉 슈렉
ㅇㅌㅅㅌㄹ 👉 인터스텔라
ㄱㅇㅇㄱ 👉 겨울왕국
ㅈㅋ 👉 조커
📂 과자/아이스크림
ㅅㅇㄲ 👉 새우깡
ㅃㅃㄹ 👉 빼빼로
ㅂㅂㅂ 👉 바밤바
ㅁㄹㄴ 👉 메로나
ㅋㅇㅋ 👉 쿠앤크
ㅎㄹㅂ 👉 홈런볼
ㄷㅈㅂ 👉 돼지바
ㅇㄱㅈ 👉 오감자
ㅁㄷㅅ 👉 맛동산
ㅊㅌㅅ 👉 치토스
ㅇㅅㄹㅌ 👉 엑설런트
ㄱㅂㅇ 👉 거북알
ㄱㄹㅂ 👉 고래밥
ㅋㅊ 👉 칸쵸
ㅇㅍㄹ 👉 아폴로
ㅃㅅㅃㅅ 👉 뿌셔뿌셔
ㅈㅅㅂ 👉 죠스바
ㅇㄷㅋ 👉 월드콘
ㄴㄱㅂ 👉 누가바
ㅃㅃㅋ 👉 빠삐코
📂 추억의 만화
ㅉㄱㄴㅁㅁㄹ 👉 짱구는못말려
ㅇㄱㄱㄹㄷㄹ 👉 아기공룡둘리
ㅍㅋㅁㅅㅌ 👉 포켓몬스터
ㅅㄹㄷㅋ 👉 슬램덩크
ㅇㅎㅇ 👉 유희왕
ㅌㅂㄹㅇㄷ 👉 탑블레이드
ㅋㄷㅋㅌㅊㄹ 👉 카드캡터체리
ㅅㅇㄹㅁ 👉 세일러문
ㄱㅈㄱㅁㅅ 👉 검정고무신
ㄴㅇㄹㅅㅍㅂㄷ 👉 날아라슈퍼보드
ㄷㄹㄹㅎㄴ 👉 달려라하니
ㅇㅅㅇ 👉 영심이
ㅇㅍㅅ 👉 원피스
ㄷㄹㄱㅂ 👉 드래곤볼
ㅁㅌㅈㅋㄴ 👉 명탐정코난
ㅇㄴㅇㅅ 👉 이누야샤
ㅎㅇㅁㅇㅂㄱ 👉 하얀마음백구
📂 추억의 게임
ㄷㅁㄱㅊ 👉 다마고치
ㄷㅇㅂㄹ 👉 디아블로
ㅋㄹㅇㅈㅇㅋㅇㄷ 👉 크레이지아케이드
ㅋㅌㄹㅇㄷ 👉 카트라이더
ㅁㅇㅍㅅㅌㄹ 👉 메이플스토리
ㄷㅈㅇㅍㅇㅌ 👉 던전앤파이터
ㅅㄷㅇㅌ 👉 서든어택
ㅂㄹㅇㄴㄹ 👉 바람의나라
ㅍㅌㄹㅅ 👉 포트리스
ㅌㅌㄹㅅ 👉 테트리스
ㅅㅌㄹㅌㅍㅇㅌ 👉 스트리트파이터
ㅊㄱㅌㄱㅌㄴㅁㅌ 👉 철권태그토너먼트
ㅍㄹㅅㅌㅇ 👉 프리스타일
ㄹㄴㅈ 👉 리니지
ㅅㅌㅋㄹㅍㅌ 👉 스타크래프트
ㅇㅋㄹㅍㅌ 👉 워크래프트
ㄱㄹㄱ 👉 갤러그
📂 추억의 가요
ㅅㅌㅈㅇㅇㅇㄷ 👉 서태지와아이들
ㅈㅅㅋㅅ 👉 젝스키스
ㅍㅋ 👉 핑클
ㅅㅎ 👉 신화
ㅋㅇㅌ 👉 코요태
ㅂㅇㅂㅂㅅ 👉 베이비복스
ㅇㅅㅇㅇㅅ 👉 에스이에스
ㅋㄹ 👉 클론
ㄹㄹ 👉 룰라
ㅌㅂ 👉 터보
ㅈㅇㄷ 👉 지오디
ㅇㅇㅊㅇㅌ 👉 에이치오티
ㅇㅈㅎ 👉 이정현
ㄱㄱㅁ 👉 김건모
ㅈㅅㅁ 👉 조성모
ㅈㅇㄹ 👉 자우림
ㅋ 👉 쿨
ㅇㅅㅈㅇㄴㅂ 👉 에스지워너비
ㅂㅂ 👉 빅뱅
ㅅㄴㅅㄷ 👉 소녀시대
🗣️ 4글자 이어말하기
📂 추억의 물건·브랜드
싸이 👉 월드
버디 👉 버디
세이 👉 클럽
네이 👉 트온
아이 👉 리버
미니 👉 홈피
아디 👉 다스
맥도 👉 날드
코카 👉 콜라
스타 👉 벅스
던킨 👉 도너츠
롯데 👉 리아
📂 추억의 만화·게임
짱구 👉 는못말려
포켓 👉 몬스터
슬램 👉 덩크
탑블 👉 레이드
카드 👉 캡터체리
세일 👉 러문
검정 👉 고무신
날아 👉 라슈퍼보드
달려 👉 라하니
명탐 👉 정코난
드래 👉 곤볼
이누 👉 야샤
크레 👉 이지아케이드
카트 👉 라이더
메이 👉 플스토리
던전 👉 앤파이터
서든 👉 어택
바람 👉 의나라
스타 👉 크래프트
디아 👉 블로
라그 👉 나로크
스트 👉 리트파이터
프리 👉 스타일
포트 👉 리스
테트 👉 리스
📂 사자성어
다다 👉 익선
일석 👉 이조
구사 👉 일생
동문 👉 서답
오매 👉 불망
대기 👉 만성
고진 👉 감래
금상 👉 첨화
유비 👉 무환
전화 👉 위복
결자 👉 해지
설상 👉 가상
새옹 👉 지마
막상 👉 막하
용두 👉 사미
이심 👉 전심
청출 👉 어람
호연 👉 지기
군계 👉 일학
백골 👉 난망
사면 👉 초가
조삼 👉 모사
우유 👉 부단
일취 👉 월장
괄목 👉 상대
과유 👉 불급
유유 👉 상종
전전 👉 긍긍
📂 일상 단어
스마 👉 트폰
아메 👉 리카노
카푸 👉 치노
비밀 👉 번호
놀이 👉 공원
회전 👉 목마
🕺 몸으로 말해요
📂 동물
고릴라
원숭이
코끼리
타조
티라노사우루스
개구리
뱀
나무늘보
사자
토끼
펭귄
캥거루
기린
돼지
호랑이
독수리
상어
거북이
📂 직업
경찰
의사
요리사
교통경찰
마술사
야구선수
수영선수
역도선수
지휘자
발레리나
화가
미용사
권투선수
사진작가
모델
가수
경호원
소방관
📂 영화 명장면
타이타닉 (뱃머리 씬)
매트릭스 (총알 피하기)
아이언맨 (빔 쏘기)
스파이더맨 (거미줄 쏘기)
범죄도시 (진실의 방으로)
터미네이터 (용광로 엄지척)
나홀로집에 (스킨 바르고 비명)
올드보이 (군만두 먹는 최민식)
쥬라기공원 (티렉스 앞 덜덜 떠는 모습)
관상 (내가 왕이 될 상인가)
스타워즈 (내가 니 애비다)
아저씨 (바리깡으로 머리 밀기)
📂 드라마 명장면
오징어게임 (무궁화 꽃이 피었습니다)
야인시대 (김두한 4딸라!)
천국의계단 (부메랑 던지기)
미안하다 사랑한다 (밥 먹을래 나랑 같이 죽을래)
파리의 연인 (애기야 가자)
📂 속담
가는 날이 장날
누워서 침 뱉기
소 잃고 외양간 고친다
원숭이도 나무에서 떨어진다
발 없는 말이 천 리 간다
돌다리도 두들겨 보고 건너라
우물 안 개구리
바늘 도둑이 소 도둑 된다
사공이 많으면 배가 산으로 간다
고래 싸움에 새우 등 터진다
📂 추억의 만화
짱구 (엉덩이 흔들며 부리부리)
둘리 (호이 하고 초능력)
피카츄 (백만볼트)
슬램덩크 (왼손은 거들 뿐)
📸 인물/캐릭터 사진 맞추기
📂 유명인 (사진)
유재석 (이미지 파일: images/yoo.jpg)
아이유 (이미지 파일: images/iu.jpg)
손흥민 (이미지 파일: images/son.jpg)
페이커 (이미지 파일: images/faker.jpg)
백종원 (이미지 파일: images/baek.jpg)
마동석 (이미지 파일: images/ma.jpg)
서태지 (이미지 파일: images/seotaiji.jpg)
이효리 (이미지 파일: images/leehyori.jpg)
강호동 (이미지 파일: images/kanghodong.jpg)
박명수 (이미지 파일: images/parkmyungsoo.jpg)
문희준 (이미지 파일: images/moonheejun.jpg)
원빈 (이미지 파일: images/wonbin.jpg)
전지현 (이미지 파일: images/jeonjihyun.jpg)
이병헌 (이미지 파일: images/leebyunghun.png)
이강인 (이미지 파일: images/leekangin.png)
임영웅 (이미지 파일: images/limyoungwoong.png)
방탄소년단 (이미지 파일: images/bts.png)
김광규 (이미지 파일: images/kimgwanggyu.png)
한석규 (이미지 파일: images/hanseokgyu.png)
허성태 (이미지 파일: images/heoseongtae.png)
곽튜브 (이미지 파일: images/kwaktube.png)
침착맨 (이미지 파일: images/chimchakman.png)
이경규 (이미지 파일: images/leekyungkyu.png)
류현진 (이미지 파일: images/ryuhyunjin.png)
김민재 (이미지 파일: images/kimminjae.png)
도널드 트럼프 (이미지 파일: images/donaldtrump.png)
블랙핑크 (이미지 파일: images/blackpink.png)
톰 크루즈 (이미지 파일: images/tomcruise.png)
레오나르도 디카프리오 (이미지 파일: images/dicaprio.png)
로버트 다우니 주니어 (이미지 파일: images/rdj.png)
일론 머스크 (이미지 파일: images/elonmusk.png)
이재명 (이미지 파일: images/leejaemyung.png)
송은이 (이미지 파일: images/songeuni.png)
📂 캐릭터 (사진)
버터플 (이미지 파일: images/butterfree.png)
아구몬 (이미지 파일: images/agumon.png)
하이바라 아이 (이미지 파일: images/haibara.png)
징징이 (이미지 파일: images/squidward.png)
뚱이 (이미지 파일: images/patrick.png)
마이콜 (이미지 파일: images/michol.png)
이기영 (이미지 파일: images/leekiyoung.png)
어니부기 (이미지 파일: images/wartortle.png)
미키마우스 (이미지 파일: images/mickey.png)
도널드 덕 (이미지 파일: images/donald.png)
엘사 (이미지 파일: images/elsa.png)
차오즈 (이미지 파일: images/chaozu.png)
삼장법사 (이미지 파일: images/samjang.png)
홍두깨 (이미지 파일: images/hongduggae.png)
포로리 (이미지 파일: images/porori.png)
너부리 (이미지 파일: images/neoburi.png)
데몬헌터스 (이미지 파일: images/demonhunters.png)
🕵️ 인물 퀴즈 (스무고개)
📂 역사 인물 (스무고개)
이순신
세종대왕
신사임당
안중근
장영실
유관순
김구
광개토대왕
📂 연예인 (스무고개)
유재석
아이유
마동석
이효리
강호동
박명수
신동엽
김종국
📂 캐릭터/기타 (스무고개)
산타클로스
짱구
둘리
피카츄
도라에몽
세일러문
손오공
📖 속담 뜻 맞추기
📂 속담 뜻 맞추기
시작이 반이다 👉 어떤 일이든 시작하기가 어렵지, 일단 시작하면 끝마치기는 쉽다는 뜻
티끌 모아 태산 👉 작은 노력이라도 꾸준히 계속하면 큰 일을 이룰 수 있다는 뜻
돌다리도 두들겨 보고 건너라 👉 아무리 쉬운 일이라도 세심하게 주의를 기울여야 한다는 뜻
사공이 많으면 배가 산으로 간다 👉 여러 사람이 각자 자기 주장만 내세우면 일이 제대로 되지 않는다는 뜻
빛 좋은 개살구 👉 겉모습만 번지르르하고 실속은 없음을 이르는 말
눈 가리고 아웅 👉 남의 눈에 띄지 않게 하려고 얕은꾀를 쓰지만 결국 다 드러나게 된다는 뜻
똥 묻은 개가 겨 묻은 개 나무란다 👉 자신의 부족함은 모르고 남의 흉만 본다는 뜻
바늘 가는 데 실 간다 👉 몹시 가깝고 친근하여 떼어 놓을 수 없는 사이를 비유하는 말
소 잃고 외양간 고친다 👉 이미 일이 잘못된 뒤에는 손을 써도 소용이 없다는 뜻
누워서 침 뱉기 👉 말이나 행동을 조심하지 않으면 자신에게 해가 돌아온다는 뜻
백지장도 맞들면 낫다 👉 아무리 어려운 일이라도 여럿이 힘을 합치면 해낼 수 있다는 뜻
친구 따라 강남 간다 👉 남이 하니까 덩달아 따라 한다는 뜻
까마귀 날자 배 떨어진다 👉 아무 관계 없는 일이 우연히 같은 때에 일어나 의심받는다는 뜻
귀에 걸면 귀걸이 코에 걸면 코걸이 👉 자기에게 이익이 되는 쪽으로만 말을 바꾼다는 뜻
돼지 목에 진주 목걸이 👉 아무리 좋은 것도 쓸 줄 모르면 소용없다는 뜻
소탐대실 👉 작은 것을 아끼려다 오히려 큰 손해를 본다는 뜻
낮말은 새가 듣고 밤말은 쥐가 듣는다 👉 아무도 안 듣는 것 같아도 말은 반드시 새어 나간다는 뜻
낫 놓고 기역자도 모른다 👉 아주 무식하여 아무것도 모른다는 뜻
모난 돌이 정 맞는다 👉 먼저 나서서 잘난 척하다가 손해를 본다는 뜻
하늘이 무너져도 솟아날 구멍이 있다 👉 어려운 상황에서도 살아날 방법은 있다는 뜻
아니 땐 굴뚝에 연기 나랴 👉 무슨 일이든 원인이 있어야 결과가 있다는 뜻
누워서 떡 먹기 👉 기다리던 일이 뜻밖에 빨리 이루어졌다는 뜻
고생 끝에 낙이 온다 👉 몹시 고생하며 애쓴 끝에 좋은 결과를 얻는다는 뜻
서투른 목수가 연장 탓한다 👉 실력이 없으면서 도구 탓만 한다는 뜻
등잔 밑이 어둡다 👉 가까이 있는 사람이 오히려 소중함을 모른다는 뜻
`;

const lines = userPrompt.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('힌트:'));

const modeMap = {
    '🔠 초성 퀴즈': 'initial',
    '🗣️ 4글자 이어말하기': 'words4',
    '🕺 몸으로 말해요': 'charades',
    '📸 인물/캐릭터 사진 맞추기': 'person_image',
    '🕵️ 인물 퀴즈 (스무고개)': 'person_text',
    '📖 속담 뜻 맞추기': 'proverb_meaning'
};

let currentMode = null;
let currentCat = null;
const whitelist = {};

for (const line of lines) {
    if (modeMap[line]) {
        currentMode = modeMap[line];
        if (!whitelist[currentMode]) whitelist[currentMode] = {};
    } else if (line.startsWith('📂 ')) {
        currentCat = line.replace('📂 ', '');
        if (currentMode && !whitelist[currentMode][currentCat]) {
            whitelist[currentMode][currentCat] = new Set();
        }
    } else if (currentMode && currentCat) {
        let key = line;
        if (line.includes('👉')) {
            if (currentMode === 'proverb_meaning') {
                key = line.split('👉')[0].trim(); 
            } else if (currentMode === 'words4' || currentMode === 'initial') {
                key = line.split('👉')[1].trim(); 
            }
        } else if (line.includes('(이미지 파일:')) {
            key = line.split('(이미지 파일:')[0].trim();
        }
        whitelist[currentMode][currentCat].add(key);
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

// Filter the database
for (const mode in QUIZ_DB) {
    if (!whitelist[mode]) {
        delete QUIZ_DB[mode];
        continue;
    }
    for (const cat in QUIZ_DB[mode]) {
        if (cat === '랜덤') continue;
        if (!whitelist[mode][cat]) {
            delete QUIZ_DB[mode][cat];
            continue;
        }
        
        QUIZ_DB[mode][cat] = QUIZ_DB[mode][cat].filter(item => {
            let keyToMatch = item.a;
            if (Array.isArray(keyToMatch)) keyToMatch = keyToMatch[0];
            if (mode === 'charades') {
                keyToMatch = item.q;
            } else if (mode === 'proverb_meaning') {
                keyToMatch = item.a;
            }
            return whitelist[mode][cat].has(keyToMatch);
        });
        
        if (QUIZ_DB[mode][cat].length === 0) {
            delete QUIZ_DB[mode][cat];
        }
    }
}

// Convert object to formatted JS string
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
console.log('Successfully filtered quiz_db.js');
