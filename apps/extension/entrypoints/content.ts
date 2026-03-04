import { loadDict, clearCache } from '@/lib/dictionary';
import { convertPage, setupMutationObserver } from '@/lib/converter';
import { initMecab } from '@/lib/tokenizer';

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
  const dict = await loadDict();
  await convertPage(dict, settings.level, settings.darkTooltip);
  observer = setupMutationObserver(dict, settings.level);
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
