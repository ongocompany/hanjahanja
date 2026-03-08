import type { HanjaDict } from '@/lib/dictionary';
import { loadDict, loadHomonymFreq, clearCache } from '@/lib/dictionary';
import { convertPage, setupMutationObserver } from '@/lib/converter';
import { initMecab } from '@/lib/tokenizer';
import { initWSD } from '@/lib/wsd';
import { initTracker, flushExposures } from '@/lib/tracker';

const DEFAULT_LEVEL = 8;

// 사전 참조 (단어장 저장용 메시지 핸들러에서 사용)
let dictRef: HanjaDict | null = null;

interface Settings {
  enabled: boolean;
  level: number;
  darkTooltip: boolean;
}

async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(['enabled', 'level', 'darkTooltip']);
  return {
    enabled: result.enabled ?? true,
    level: result.level ?? DEFAULT_LEVEL,
    darkTooltip: result.darkTooltip ?? false,
  };
}

let observer: MutationObserver | null = null;

async function run() {
  const settings = await getSettings();
  if (!settings.enabled) {
    console.log('[한자한자] 비활성화 상태');
    return;
  }

  console.log(`[한자한자] 변환 시작 (${settings.level}급)`);
  await initTracker();
  await initMecab();
  const [dict, homonymFreq] = await Promise.all([loadDict(), loadHomonymFreq()]);
  dictRef = dict;

  // WSD API 서버 연결 확인 (빠른 헬스체크, 실패해도 변환은 진행)
  const wsdOk = await initWSD();
  console.log(`[한자한자] WSD: ${wsdOk ? 'API 연결' : '비활성화 (폴백 모드)'}`);

  await convertPage(dict, settings.level, settings.darkTooltip, homonymFreq);
  observer = setupMutationObserver(dict, settings.level, homonymFreq);
}

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.enabled || changes.level || changes.darkTooltip) {
    console.log('[한자한자] 설정 변경 감지, 페이지 새로고침 필요');
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    clearCache();

    const settings = await getSettings();
    if (changes.enabled?.newValue === false) {
      location.reload();
      return;
    }
    if (settings.enabled) {
      location.reload();
    }
  }
});

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    run();

    // 메시지 핸들러
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      // 팝업 sync 전 flush 요청
      if (message.type === 'flush-tracker') {
        flushExposures().then(() => sendResponse({ ok: true }));
        return true; // 비동기 응답
      }

      // background에서 단어장 저장 시 한자 정보 요청
      if (message.type === 'get-hanja-info' && dictRef) {
        const text = message.text as string;
        const selection = window.getSelection();
        let context = selection?.anchorNode?.parentElement?.closest('p, li, td, h1, h2, h3, h4, h5, h6')?.textContent?.trim()?.slice(0, 300) ?? '';
        // CSS/코드 텍스트 필터
        if (context.includes('{') || context.includes('}') || context.includes('function ')) context = '';

        // 1) 한글 단어로 직접 조회
        let entries = dictRef[text];
        let word = text;
        let hanja = entries?.[0]?.hanja ?? '';

        // 2) 한자로 선택한 경우 → data-word 속성에서 원본 한글 찾기
        if (!entries || entries.length === 0) {
          const span = document.querySelector(`[data-hanjahanja="converted"]`)
            ? Array.from(document.querySelectorAll('[data-hanjahanja="converted"]'))
                .find(el => el.textContent?.includes(text)) as HTMLElement | undefined
            : undefined;
          if (span) {
            const koreanWord = span.getAttribute('data-word') ?? '';
            entries = dictRef[koreanWord];
            if (entries && entries.length > 0) {
              word = koreanWord;
              hanja = text; // 선택한 한자 그대로 사용
            }
          }
        }

        if (entries && entries.length > 0) {
          const meaning = entries.find(e => e.hanja === hanja)?.meaning ?? entries[0].meaning ?? '';
          sendResponse({ found: true, word, hanja, meaning, context });
        } else {
          sendResponse({ found: false });
        }
        return false; // 동기 응답
      }
    });
  },
});
