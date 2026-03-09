import { saveToVocabulary } from '@/lib/sync';

const WSD_API_URL = 'http://100.68.25.79:8079';

export default defineBackground(() => {
  console.log("한자한자 Background Script 로드됨");

  // 웹 로그인 → 확장 세션 동기화
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'save-session') {
      browser.storage.local.set({ supabaseSession: message.session })
        .then(() => {
          console.log('[한자한자] 웹 로그인 세션 저장 완료:', message.session.user?.email);
          sendResponse({ ok: true });
        })
        .catch((err) => {
          console.error('[한자한자] 세션 저장 실패:', err);
          sendResponse({ ok: false });
        });
      return true;
    }
  });

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

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "add-to-vocabulary" && info.selectionText) {
      const selectedText = info.selectionText.trim();
      console.log("단어장 저장 요청:", selectedText);

      if (tab?.id) {
        try {
          // content script에 한자 정보 요청
          const response = await browser.tabs.sendMessage(tab.id, {
            type: 'get-hanja-info',
            text: selectedText,
          });

          if (response?.found) {
            // 로컬 단어장에 저장
            const result = await browser.storage.local.get('localVocabulary');
            const vocab = (result.localVocabulary as Array<Record<string, unknown>>) ?? [];
            vocab.push({
              word: response.word,
              hanja: response.hanja,
              meaning: response.meaning ?? '',
              contextSentence: response.context ?? '',
              sourceUrl: tab.url ?? '',
              sourceTitle: tab.title ?? '',
              savedAt: new Date().toISOString(),
            });
            await browser.storage.local.set({ localVocabulary: vocab });
            console.log(`단어장 저장 완료: ${response.word} → ${response.hanja}`);

            // Supabase에도 동기화 (로그인 시에만, 실패해도 로컬은 이미 저장됨)
            saveToVocabulary(
              response.word,
              response.hanja,
              response.context ?? '',
              tab.url ?? '',
              tab.title ?? '',
            ).catch(() => {});
          } else {
            console.log("한자 정보를 찾을 수 없음:", selectedText);
          }
        } catch (e) {
          console.log("content script 통신 실패:", e);
        }
      }
    }
  });
});
