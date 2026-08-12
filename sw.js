// 파티 허브 서비스 워커
//
// 일부러 아무것도 캐시하지 않습니다.
// 이 앱은 Firebase 실시간 통신이 전제라 오프라인으로는 쓸 수 없고,
// 캐시를 두면 배포해도 옛 화면이 남아 "고쳤는데 그대로"인 문제가 생깁니다.
// 홈 화면 앱으로 설치되려면 fetch 핸들러가 있어야 해서, 그대로 통과만 시킵니다.

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    // 예전 버전이 캐시를 남겼다면 정리한다
    e.waitUntil(
        caches.keys()
            .then(names => Promise.all(names.map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // 네트워크로 그대로 전달 (캐시 없음)
    return;
});
