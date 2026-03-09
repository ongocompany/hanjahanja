import type { DictEntry, HanjaDict, HomonymFreq } from './dictionary';
import { findHanjaWords } from './tokenizer';
import { recordChoice, getWordPrefs } from './preference';
import { predictHanjaBatch, hasWSDHead } from './wsd';
import { trackExposure, trackClick } from './tracker';

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE', 'KBD',
  'SVG', 'MATH', 'CANVAS',
]);

const HANJAHANJA_ATTR = 'data-hanjahanja';

/**
 * 순우리말 차단 목록: 한자 사전에 동음 한자가 있지만 실제로는 한자어가 아닌 단어
 *
 * 생성 기준:
 * - 수동 큐레이션: 일상적으로 한자어가 아닌 순우리말 (대명사, 동물, 신체 등)
 * - 자동 필터링: 표준국어대사전 고유어 중, stdict에 한자어 항목이 없고,
 *   한자 사전 동음 항목이 모두 3급 이하(level ≤ 3)인 단어
 *   → scripts/build-native-blocklist.ts로 생성
 */
const NATIVE_KOREAN_BLOCKLIST = new Set([
  // ── 수동 큐레이션 (일상 순우리말) ──
  // 대명사·지시어·부사
  '우리', '너희', '여기', '거기', '어디', '이리', '저리',
  '서로', '다시', '미리', '모두',
  // 가족·사람 (동생은 同生 한자어 유래이므로 제외)
  '아버지', '어머니', '오빠', '언니', '누나',
  '아기', '아우', '사위',
  // 신체
  '머리', '허리', '이마',
  // 자연
  '바다', '바람', '노을', '서리', '이슬',
  // 동물
  '여우', '오리', '개미', '모기', '거미', '하마',
  // 식물·음식
  '고추', '감자', '배추', '가지', '열매', '보리', '가루', '고기', '무우',
  // 도구·물건
  '가위', '호미', '수저', '비누', '고리',
  // 수·단위
  '하나', '마리',
  // 흔한 순우리말
  '사이', '여보', '나라', '아이', '소리', '나이',
  '자리', '무리', '누리', '노래', '이루', '어리',
  '가리', '도리', '수리', '구리', '부리',
  '모습', '거리',
  '사내', '재미', '나중', '사랑',
  // ── 고유어 지명 (한자 변환 금지) ──
  '서울',  // 暑鬱 — 현대에서 절대 한자로 쓰지 않음
  // ── WSD 미지원 동음이의어 (학습 데이터 확보 후 제거 예정) ──
  '통사',  // 統辭(구문론) vs 通史(역사) vs 通事(통역) — 빈도 데이터 부정확

  // ── 자동 생성 (stdict 고유어 × 한자사전 3급이하) ──
  '가사리', '갈매', '감다', '개암', '개울', '건지', '고마리', '곤두',
  '구기다', '기화리', '다미', '도담', '도막', '동거리', '두가리', '두두',
  '두순', '두어', '둔덕', '마련', '마루', '만도리', '모도리', '모로',
  '모로리', '무수다', '무수리', '문척', '미사리', '발랑', '방아', '보라',
  '비역', '빈지', '사마치', '사치기', '살미', '삼부리', '삼사미', '상막',
  '상수리', '소래', '수리치', '슬치', '시루', '신주부', '아서', '양판',
  '어우리', '여치', '역삼', '염통', '오가리', '오사리', '왕창', '울대',
  '이응', '자게', '자두', '장도리', '장만', '정엽', '지가리', '지화리',
  '차랑', '초고리', '초고지', '추근', '칠봉', '팔랑', '피륙', '회창',
]);

/**
 * 접미사로 자주 쓰이는 단어: 앞 글자에 바로 붙어있으면(공백 없음) 변환 건너뜀
 * 예: "먹을거리" → 거리는 접미사(-거리), "거리를 두다" → 거리는 距離
 */
const SUFFIX_WORDS = new Set<string>([
  // 거리 → 블록리스트로 이동 (오변환 > 미변환)
  // 자리 → 이미 블록리스트에 있음
  // 향후 접미사/명사 양용 단어 추가용
]);

/** 한글 음절 범위 체크 */
function isKorean(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xAC00 && code <= 0xD7A3;
}

/** 두음법칙: 단어 첫머리에서 ㄹ→ㄴ/ㅇ, ㄴ→ㅇ */
const DUEUM: Record<string, string> = {
  '라': '나', '락': '낙', '란': '난', '랄': '날', '람': '남', '랍': '납',
  '랑': '낭', '래': '내', '랭': '냉',
  '려': '여', '력': '역', '련': '연', '렬': '열', '렴': '염', '렵': '엽',
  '령': '영', '례': '예', '로': '노', '록': '녹', '론': '논', '롱': '농',
  '뢰': '뇌', '료': '요', '류': '유', '륙': '육', '률': '율', '륜': '윤',
  '릉': '능', '리': '이', '린': '인', '립': '입',
  '녀': '여', '뇨': '요', '뉴': '유', '니': '이',
};
function applyDueum(r: string): string {
  for (const [o, c] of Object.entries(DUEUM)) {
    if (r.startsWith(o)) return c + r.slice(o.length);
  }
  return r;
}
const STYLE_ID = 'hanjahanja-styles';

/** 급수를 한글 표기로 변환 */
function levelToString(level: number): string {
  const base = Math.ceil(level);
  const isJun = level % 1 !== 0;
  if (level === 0) return '특급';
  if (level === 0.5) return '준특급';
  return isJun ? `준${base}급` : `${level}급`;
}

/** 툴팁 CSS를 페이지에 한 번만 주입 */
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hjhj-word {
      text-decoration: underline dotted #b8860b;
      text-underline-offset: 3px;
      cursor: default;
    }
    .hjhj-word.hjhj-on-dark {
      text-decoration-color: #ffd54f;
    }
    .hjhj-word-confident {
      text-decoration: underline dotted #2e7d32;
      text-underline-offset: 3px;
      cursor: help;
      color: #1b5e20;
    }
    .hjhj-word-confident.hjhj-on-dark {
      text-decoration-color: #81c784;
      color: #a5d6a7;
    }
    .hjhj-word-ambiguous {
      text-decoration: underline dotted #e65100;
      text-underline-offset: 3px;
      cursor: help;
      color: #bf360c;
    }
    .hjhj-word-ambiguous.hjhj-on-dark {
      text-decoration-color: #ffb74d;
      color: #ffcc80;
    }
    .hjhj-tooltip {
      display: none;
      position: fixed;
      width: 320px;
      max-height: 360px;
      overflow-y: auto;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14.5px;
      line-height: 1.6;
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: break-word;
      z-index: 2147483647;
      pointer-events: auto;
      opacity: 0;
      transition: opacity 0.18s ease;
      /* 라이트 모드 (기본) */
      background: #fff;
      color: #333;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06);
    }
    .hjhj-tooltip.hjhj-dark {
      background: #1a1a2e;
      color: #eee;
      box-shadow: 0 6px 24px rgba(0,0,0,0.35);
    }
    .hjhj-tooltip.hjhj-visible {
      display: block;
      opacity: 1;
    }
    .hjhj-tooltip::after {
      content: '';
      position: absolute;
      left: var(--hjhj-arrow-left, 50%);
      transform: translateX(-50%);
      border: 7px solid transparent;
    }
    .hjhj-tooltip.hjhj-above::after {
      top: 100%;
      border-top-color: #fff;
    }
    .hjhj-tooltip.hjhj-below::after {
      bottom: 100%;
      border-bottom-color: #fff;
    }
    .hjhj-tooltip.hjhj-dark.hjhj-above::after {
      border-top-color: #1a1a2e;
    }
    .hjhj-tooltip.hjhj-dark.hjhj-below::after {
      border-bottom-color: #1a1a2e;
    }
    .hjhj-entry {
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .hjhj-entry:hover {
      background: rgba(0,0,0,0.05);
    }
    .hjhj-dark .hjhj-entry:hover {
      background: rgba(255,255,255,0.1);
    }
    .hjhj-entry.hjhj-active {
      background: rgba(200,160,0,0.1);
    }
    .hjhj-dark .hjhj-entry.hjhj-active {
      background: rgba(255,215,0,0.15);
    }
    .hjhj-entry + .hjhj-entry {
      border-top: 1px solid #e5e5e5;
    }
    .hjhj-dark .hjhj-entry + .hjhj-entry {
      border-top-color: #333;
    }
    .hjhj-hanja {
      font-size: 1.4em;
      font-weight: bold;
      color: #b8860b;
    }
    .hjhj-dark .hjhj-hanja {
      color: #ffd700;
    }
    .hjhj-reading {
      color: #666;
      margin-left: 8px;
      font-size: 0.95em;
    }
    .hjhj-dark .hjhj-reading {
      color: #aaa;
    }
    .hjhj-meaning {
      color: #555;
      font-size: 0.95em;
      display: block;
      margin-top: 3px;
    }
    .hjhj-dark .hjhj-meaning {
      color: #ccc;
    }
    .hjhj-level {
      color: #999;
      font-size: 0.85em;
      margin-left: 6px;
    }
    .hjhj-dark .hjhj-level {
      color: #888;
    }
    .hjhj-count {
      color: #aaa;
      font-size: 0.8em;
      margin-left: 4px;
    }
    .hjhj-dark .hjhj-count {
      color: #666;
    }
    .hjhj-entry.hjhj-dim {
      opacity: 0.45;
    }
    .hjhj-entry.hjhj-dim:hover {
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);

  // 바깥 클릭 시 고정된 툴팁 해제
  document.addEventListener('click', (e) => {
    if (!activeTooltip || !pinnedTooltip) return;
    const target = e.target as Node;
    if (activeTooltip.contains(target)) return;
    if (activeWord?.contains(target)) return;
    hideTooltipNow();
  });
}

function shouldSkipNode(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as Element;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.getAttribute(HANJAHANJA_ATTR) !== null) return true;
  if (el.classList.contains('hjhj-tooltip')) return true;
  if (el.isContentEditable) return true;
  return false;
}

/** 선호도 기반으로 엔트리 정렬 (WSD 추천 > 선택 횟수 > 빈도 점수) */
function sortByPreference(entries: DictEntry[], prefs: Record<string, number>, userLevel: number, freqMap?: Record<string, number>, wsdHanja?: string | null): DictEntry[] {
  return [...entries].sort((a, b) => {
    // WSD 모델 추천 한자 — 단, 사용자 급수 범위 내일 때만 우선
    if (wsdHanja) {
      const wsdA = a.hanja === wsdHanja && a.level >= userLevel ? 1 : 0;
      const wsdB = b.hanja === wsdHanja && b.level >= userLevel ? 1 : 0;
      if (wsdA !== wsdB) return wsdB - wsdA;
    }
    // 사용자 선택 횟수
    const countA = prefs[a.hanja] ?? 0;
    const countB = prefs[b.hanja] ?? 0;
    if (countA !== countB) return countB - countA;
    // 빈도 점수 (stdict + 속기록 병합 데이터)
    if (freqMap) {
      const freqA = freqMap[a.hanja] ?? 0;
      const freqB = freqMap[b.hanja] ?? 0;
      if (freqA !== freqB) return freqB - freqA;
    }
    // 급수는 정렬 기준에서 제외 (급수 ≠ 사용빈도)
    return 0;
  });
}

/** 현재 활성 툴팁 (하나만 표시) */
let activeTooltip: HTMLElement | null = null;
let activeWord: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let pinnedTooltip = false;

/** 숨기기 타이머 취소 */
function cancelHideTimer(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

/** 툴팁 즉시 숨기기 */
function hideTooltipNow(): void {
  cancelHideTimer();
  if (activeTooltip) {
    activeTooltip.classList.remove('hjhj-visible', 'hjhj-above', 'hjhj-below');
    activeTooltip = null;
    activeWord = null;
    pinnedTooltip = false;
  }
}

/** 툴팁 숨기기 (200ms 딜레이, 고정 시 무시) */
function hideTooltip(): void {
  if (pinnedTooltip) return;
  cancelHideTimer();
  hideTimer = setTimeout(hideTooltipNow, 200);
}

/** 툴팁 위치 계산 + 표시 */
function showTooltip(wrapper: HTMLElement, tooltip: HTMLElement): void {
  // 고정된 툴팁이 있고 같은 단어면 위치만 갱신
  if (pinnedTooltip && activeWord === wrapper) return;
  // 고정된 툴팁이 있고 다른 단어면 무시 (고정 유지)
  if (pinnedTooltip && activeWord !== wrapper) return;
  // 이전 툴팁 즉시 숨기기 (딜레이 없이)
  hideTooltipNow();

  activeTooltip = tooltip;
  activeWord = wrapper;

  // body에 없으면 추가
  if (!tooltip.parentNode) {
    document.body.appendChild(tooltip);
  }

  // 일단 보이게 해서 크기 측정
  tooltip.style.visibility = 'hidden';
  tooltip.style.display = 'block';
  tooltip.style.opacity = '0';

  const wrapperRect = wrapper.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const gap = 8;

  // 위/아래 판단
  const spaceAbove = wrapperRect.top;
  const spaceBelow = window.innerHeight - wrapperRect.bottom;
  const placeAbove = spaceAbove >= tipRect.height + gap || spaceAbove > spaceBelow;

  tooltip.classList.remove('hjhj-above', 'hjhj-below');
  tooltip.classList.add(placeAbove ? 'hjhj-above' : 'hjhj-below');

  // 세로 위치
  const top = placeAbove
    ? wrapperRect.top - tipRect.height - gap
    : wrapperRect.bottom + gap;

  // 가로 위치 (단어 중앙 기준, 화면 밖으로 나가지 않게 clamp)
  const centerX = wrapperRect.left + wrapperRect.width / 2;
  let left = centerX - tipRect.width / 2;
  const margin = 8;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

  // 화살표 위치 (단어 중앙 기준)
  const arrowLeft = centerX - left;
  tooltip.style.setProperty('--hjhj-arrow-left', `${arrowLeft}px`);

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.style.visibility = '';
  tooltip.style.display = '';
  tooltip.style.opacity = '';
  tooltip.classList.add('hjhj-visible');
}

/** 현재 다크모드 설정 */
let darkMode = false;

/** 부모 요소의 배경이 어두운지 감지 */
function isOnDarkBackground(el: Element): boolean {
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    const bg = getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      // rgb(r, g, b) 또는 rgba(r, g, b, a) 파싱
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        // 상대 밝기 계산 (ITU-R BT.601)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.4;
      }
    }
    current = current.parentElement;
  }
  return false;
}

/** 한자 <span> + 마우스 오버 툴팁 생성 */
function createHanjaElement(word: string, entries: DictEntry[], prefs: Record<string, number>, userLevel: number, freqMap?: Record<string, number>, wsdHanja?: string | null, onDark?: boolean): HTMLElement {
  const sorted = sortByPreference(entries, prefs, userLevel, freqMap, wsdHanja);

  // 신뢰도 분류: 단독 / 녹색(>50%) / 주황색(≤50%)
  let cssClass = 'hjhj-word'; // 기본: 동음이의어 없음
  if (sorted.length >= 2 && freqMap) {
    const totalFreq = Object.values(freqMap).reduce((sum, v) => sum + v, 0);
    const topFreq = freqMap[sorted[0].hanja] ?? 0;
    const confidence = totalFreq > 0 ? topFreq / totalFreq : 0;
    cssClass = confidence > 0.5 ? 'hjhj-word-confident' : 'hjhj-word-ambiguous';
  } else if (sorted.length >= 2) {
    // 빈도 데이터 없는 동음이의어 → 주황색
    cssClass = 'hjhj-word-ambiguous';
  }

  const wrapper = document.createElement('span');
  wrapper.className = onDark ? `${cssClass} hjhj-on-dark` : cssClass;
  wrapper.setAttribute(HANJAHANJA_ATTR, 'converted');
  wrapper.setAttribute('data-word', word);

  // 인라인 한자 텍스트 (선호도 1위)
  const inlineText = document.createTextNode(sorted[0].hanja);
  wrapper.appendChild(inlineText);

  // 노출 추적 (메모리 버퍼에 누적, 주기적 flush) + 뜻풀이 캐시
  trackExposure(word, sorted[0].hanja, sorted[0].meaning);

  // 호버 추적 중복 방지 (페이지 세션 내 1회만)
  let hoverTracked = false;

  // 툴팁은 body에 붙일 것 — lazy 생성
  let tooltip: HTMLElement | null = null;

  function ensureTooltip(): HTMLElement {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = darkMode ? 'hjhj-tooltip hjhj-dark' : 'hjhj-tooltip';

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const row = document.createElement('div');
      row.className = 'hjhj-entry';
      if (i === 0) row.classList.add('hjhj-active');
      if (entry.level < userLevel) row.classList.add('hjhj-dim');

      const hanjaSpan = document.createElement('span');
      hanjaSpan.className = 'hjhj-hanja';
      hanjaSpan.textContent = entry.hanja;
      row.appendChild(hanjaSpan);

      const readingSpan = document.createElement('span');
      readingSpan.className = 'hjhj-reading';
      if (entry.chars && entry.chars.length > 0) {
        readingSpan.textContent = entry.chars
          .map((c) => `${c.char}(${c.reading})`)
          .join(' ');
      } else {
        readingSpan.textContent = entry.reading;
      }
      row.appendChild(readingSpan);

      const levelSpan = document.createElement('span');
      levelSpan.className = 'hjhj-level';
      levelSpan.textContent = levelToString(entry.level);
      row.appendChild(levelSpan);

      if (entry.meaning) {
        const meaningSpan = document.createElement('span');
        meaningSpan.className = 'hjhj-meaning';
        meaningSpan.textContent = entry.meaning;
        row.appendChild(meaningSpan);
      }

      // 클릭하면 이 한자로 교체
      if (sorted.length > 1) {
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();

          // 인라인 텍스트 교체
          inlineText.textContent = entry.hanja;

          // active 표시 변경
          tooltip!.querySelectorAll('.hjhj-entry').forEach((el) => el.classList.remove('hjhj-active'));
          row.classList.add('hjhj-active');

          // 선호도 저장 (동음이의어 선택은 클릭 추적 불필요)
          recordChoice(word, entry.hanja);
        });
      }

      tooltip.appendChild(row);
    }

    // 툴팁에 마우스 들어오면 숨기기 취소
    tooltip.addEventListener('mouseenter', () => {
      cancelHideTimer();
    });

    // 툴팁 위에서 마우스 나가면 숨기기
    tooltip.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    return tooltip;
  }

  // hover 시 body에 fixed 툴팁 표시 + 호버 추적 (페이지당 1회)
  wrapper.addEventListener('mouseenter', () => {
    cancelHideTimer();
    showTooltip(wrapper, ensureTooltip());
    if (!hoverTracked) {
      hoverTracked = true;
      const parentText = wrapper.closest('p, div, li, td, h1, h2, h3, h4, h5, h6')?.textContent?.trim()?.slice(0, 200);
      trackClick(word, sorted[0].hanja, parentText);
    }
  });

  wrapper.addEventListener('mouseleave', (e) => {
    // 마우스가 툴팁으로 이동하는 중이면 숨기지 않음
    const related = (e as MouseEvent).relatedTarget as Node | null;
    if (tooltip && related && tooltip.contains(related)) return;
    hideTooltip();
  });

  // 클릭하면 툴팁 고정/해제 (링크 안이면 링크 동작 우선)
  wrapper.addEventListener('click', (e) => {
    if (wrapper.closest('a')) return; // 링크 안의 한자어는 클릭 통과
    e.preventDefault();
    e.stopPropagation();
    if (pinnedTooltip && activeWord === wrapper) {
      // 같은 단어 클릭 → 고정 해제
      hideTooltipNow();
    } else {
      // 다른 단어 or 고정 안 된 상태 → 강제로 고정
      const wasPinned = pinnedTooltip;
      if (wasPinned) hideTooltipNow(); // 기존 고정 해제
      showTooltip(wrapper, ensureTooltip());
      pinnedTooltip = true;
    }
  });

  return wrapper;
}

/** 선호도를 미리 로드한 후 텍스트 노드 변환 */
async function convertTextNode(textNode: Text, dict: HanjaDict, prefsCache: Map<string, Record<string, number>>, userLevel: number, homonymFreq: HomonymFreq = {}): Promise<void> {
  const text = textNode.textContent;
  if (!text || text.trim().length === 0) return;

  const rawMatches = findHanjaWords(text, dict);
  if (rawMatches.length === 0) return;

  // chars reading이 단어와 다른 엔트리 필터 (데이터 오류: 반의어/관련어 혼입)
  const matches = rawMatches.map(m => {
    const filtered = m.entries.filter(e => {
      if (!e.chars || e.chars.length === 0) return true; // chars 없으면 통과
      const charsReading = e.chars.map(c => c.reading).join('');
      return charsReading === m.word || applyDueum(charsReading) === m.word;
    });
    return filtered.length > 0 ? { ...m, entries: filtered } : null;
  }).filter((m): m is NonNullable<typeof m> => m !== null);

  // 순우리말 차단: 한자어가 아닌 순한글 단어 제외
  const nativeFiltered = matches.filter(m => !NATIVE_KOREAN_BLOCKLIST.has(m.word));

  // 한 글자 단어 차단: 문맥 판별이 어렵고 오변환 위험이 높음
  const lengthFiltered = nativeFiltered.filter(m => m.word.length >= 2);

  // 급수 필터: 최소 하나의 엔트리가 userLevel 범위 내인 단어만 변환
  // (급수 숫자 높을수록 쉬움: 8급=가장쉬움, 특급(0)=가장어려움 → entry.level >= userLevel이면 범위 내)
  const levelFiltered = lengthFiltered.filter(m =>
    m.entries.some(e => e.level >= userLevel)
  );
  if (levelFiltered.length === 0) return;

  // 빈도 필터: 실사용 빈도가 극히 낮은 단어 변환 제외
  // 줄임말(과방→果房), 고어, 사실상 안 쓰이는 한자어 등 걸러냄
  // 빈도 데이터 없는 단어(단일 의미)는 그대로 통과
  const MIN_CONVERT_FREQ = 7;
  const freqFiltered = levelFiltered.filter(m => {
    const freqMap = homonymFreq[m.word];
    if (!freqMap) return true; // 빈도 데이터 없으면 통과 (단일 의미 단어)
    const maxFreq = Math.max(...Object.values(freqMap));
    return maxFreq >= MIN_CONVERT_FREQ;
  });

  // 접미사 필터: "먹을거리"처럼 앞 한글에 바로 붙은 접미사형 단어 제외
  const suffixFiltered = freqFiltered.filter(m => {
    if (!SUFFIX_WORDS.has(m.word)) return true;
    if (m.position === 0) return true; // 문장 맨 앞이면 접미사 아님
    const prevChar = text[m.position - 1];
    return !isKorean(prevChar); // 앞에 한글이면 접미사 → 제외
  });
  if (suffixFiltered.length === 0) return;

  // 필요한 단어들의 선호도를 배치 로드
  for (const match of suffixFiltered) {
    if (!prefsCache.has(match.word)) {
      prefsCache.set(match.word, await getWordPrefs(match.word));
    }
  }

  // WSD 예측: 동음이의어(엔트리 2개+)를 배치로 API 호출
  const wsdWords: string[] = [];
  for (const match of suffixFiltered) {
    if (match.entries.length >= 2 && hasWSDHead(match.word) && !wsdWords.includes(match.word)) {
      wsdWords.push(match.word);
    }
  }
  const wsdResults = wsdWords.length > 0
    ? await predictHanjaBatch(text, wsdWords)
    : new Map<string, string | null>();

  // 디버그: WSD 결과 확인
  if (wsdWords.length > 0) {
    const debugEntries: string[] = [];
    for (const [w, h] of wsdResults.entries()) {
      debugEntries.push(`${w}→${h ?? '(null)'}`);
    }
    console.log(`[한자한자 WSD] 배치 결과: ${debugEntries.join(', ') || '(빈 결과)'}`);
  }

  // 부모 요소의 배경 밝기 감지 (텍스트 노드의 부모는 이미 DOM에 있음)
  const parentIsDark = textNode.parentElement ? isOnDarkBackground(textNode.parentElement) : false;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of suffixFiltered) {
    if (match.position > lastIndex) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.position)));
    }

    const prefs = prefsCache.get(match.word) ?? {};
    const freqMap = homonymFreq[match.word];
    const wsdHanja = wsdResults.get(match.word) ?? null;
    fragment.appendChild(createHanjaElement(match.word, match.entries, prefs, userLevel, freqMap, wsdHanja, parentIsDark));
    lastIndex = match.position + match.word.length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
}

function collectTextNodes(root: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || node.textContent.trim().length === 0) {
        return NodeFilter.FILTER_REJECT;
      }
      let parent = node.parentNode;
      while (parent) {
        if (shouldSkipNode(parent)) return NodeFilter.FILTER_REJECT;
        parent = parent.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }
  return textNodes;
}

/** 스크롤/리사이즈 시 툴팁 숨기기 (한 번만 등록) */
let globalListenersAttached = false;
function attachGlobalListeners(): void {
  if (globalListenersAttached) return;
  globalListenersAttached = true;
  window.addEventListener('scroll', hideTooltip, { passive: true, capture: true });
  window.addEventListener('resize', hideTooltip, { passive: true });
}

export async function convertPage(dict: HanjaDict, userLevel: number, isDarkMode = false, homonymFreq: HomonymFreq = {}): Promise<number> {
  darkMode = isDarkMode;
  injectStyles();
  attachGlobalListeners();
  const textNodes = collectTextNodes(document.body);
  let convertedCount = 0;
  const prefsCache = new Map<string, Record<string, number>>();

  for (const textNode of textNodes) {
    await convertTextNode(textNode, dict, prefsCache, userLevel, homonymFreq);
    if (textNode.parentNode === null) convertedCount++;
  }

  console.log(`[한자한자] ${convertedCount}개 텍스트 노드 변환`);
  return convertedCount;
}

export async function convertSubtree(root: Node, dict: HanjaDict, userLevel: number, homonymFreq: HomonymFreq = {}): Promise<void> {
  const textNodes = collectTextNodes(root);
  const prefsCache = new Map<string, Record<string, number>>();
  for (const textNode of textNodes) {
    await convertTextNode(textNode, dict, prefsCache, userLevel, homonymFreq);
  }
}

export function setupMutationObserver(dict: HanjaDict, userLevel: number, homonymFreq: HomonymFreq = {}): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE) {
          const el = added as Element;
          if (el.getAttribute(HANJAHANJA_ATTR) !== null) continue;
          if (shouldSkipNode(added)) continue;
          convertSubtree(added, dict, userLevel, homonymFreq);
        } else if (added.nodeType === Node.TEXT_NODE) {
          const text = added as Text;
          if (!text.textContent?.trim()) continue;
          let parent = text.parentNode;
          let skip = false;
          while (parent) {
            if (shouldSkipNode(parent)) { skip = true; break; }
            parent = parent.parentNode;
          }
          if (!skip) {
            const prefsCache = new Map<string, Record<string, number>>();
            convertTextNode(text, dict, prefsCache, userLevel, homonymFreq);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[한자한자] MutationObserver 활성화');
  return observer;
}
