// 오늘 뭐 입지 - 오프라인 실행용 서비스 워커
// 화면 파일을 바꿨다면 아래 VERSION 숫자를 올려 주세요 (휴대폰에 새 버전이 반영됨)
const VERSION = "v1";
const APP = "app-" + VERSION, LIB = "lib-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== APP && k !== LIB).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 날씨와 AI 모델 파일은 항상 네트워크 (모델은 브라우저 자체 캐시 사용)
  if (url.hostname.includes("open-meteo.com") || url.hostname.includes("staticimgly.com")) return;
  // 화면 파일: 네트워크 우선, 오프라인이면 저장본
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(APP).then(c => c.put("./index.html", cp)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  // 같은 사이트 파일: 저장본 우선
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // 글꼴·라이브러리: 저장본을 먼저 보여주고 뒤에서 갱신
  if (/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.hostname)) {
    e.respondWith(caches.open(LIB).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
