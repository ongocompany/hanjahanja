/**
 * 웹 로그인 → 확장 세션 동기화 content script
 *
 * /auth/extension-sync 페이지에서만 실행됨
 * DOM에서 세션 데이터를 읽어 background로 전달
 */
export default defineContentScript({
  matches: ["*://hanjahanja.co.kr/auth/extension-sync*"],
  runAt: "document_idle",

  main() {
    const el = document.getElementById("hanjahanja-session");
    if (!el) return;

    const raw = el.getAttribute("data-session");
    if (!raw) return;

    try {
      const session = JSON.parse(raw);

      // background에 세션 저장 요청
      browser.runtime.sendMessage({
        type: "save-session",
        session,
      }).then(() => {
        // 성공 시 3초 후 탭 닫기
        setTimeout(() => window.close(), 3000);
      });
    } catch (err) {
      console.error("[한자한자] 세션 파싱 실패:", err);
    }
  },
});
