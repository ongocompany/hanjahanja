import { loadDict, loadHomonymFreq, clearCache } from '@/lib/dictionary';
import { convertPage, setupMutationObserver } from '@/lib/converter';
import { initMecab } from '@/lib/tokenizer';
import { initWSD } from '@/lib/wsd';

const DEFAULT_LEVEL = 8;

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
  await initMecab();
  const [dict, homonymFreq] = await Promise.all([loadDict(), loadHomonymFreq()]);

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
  },
});
