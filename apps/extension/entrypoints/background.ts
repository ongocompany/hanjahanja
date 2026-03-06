const WSD_API_URL = 'http://100.68.25.79:8079';

export default defineBackground(() => {
  console.log("한자한자 Background Script 로드됨");

  // WSD API 프록시 — content script의 Mixed Content 우회
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'wsd-health') {
      fetch(`${WSD_API_URL}/health`, { signal: AbortSignal.timeout(3000) })
        .then(res => res.json())
        .then(data => sendResponse({ ok: true, data }))
        .catch(() => sendResponse({ ok: false }));
      return true; // 비동기 응답
    }

    if (message.type === 'wsd-predict') {
      fetch(`${WSD_API_URL}/wsd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: message.sentence, words: message.words }),
        signal: AbortSignal.timeout(5000),
      })
        .then(res => res.json())
        .then(data => sendResponse({ ok: true, data }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
  });

  // 우클릭 컨텍스트 메뉴: 단어장에 추가
  browser.contextMenus.create({
    id: "add-to-vocabulary",
    title: "한자한자 단어장에 추가",
    contexts: ["selection"],
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "add-to-vocabulary" && info.selectionText) {
      // TODO: 선택된 텍스트를 단어장에 저장하는 로직
      console.log("단어장 저장 요청:", info.selectionText);
    }
  });
});
