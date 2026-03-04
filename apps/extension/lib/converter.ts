import type { DictEntry, HanjaDict } from './dictionary';
import { findHanjaWords } from './tokenizer';
import { recordChoice, getWordPrefs } from './preference';

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE', 'KBD',
  'SVG', 'MATH', 'CANVAS',
]);

const HANJAHANJA_ATTR = 'data-hanjahanja';
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
      cursor: help;
      position: relative;
    }
    .hjhj-tooltip {
      visibility: hidden;
      opacity: 0;
      position: absolute;
      left: 50%;
      background: #1a1a2e;
      color: #eee;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14.5px;
      line-height: 1.6;
      white-space: nowrap;
      z-index: 2147483647;
      box-shadow: 0 6px 24px rgba(0,0,0,0.35);
      pointer-events: auto;
      transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
    }
    .hjhj-tooltip.hjhj-above {
      bottom: calc(100% + 8px);
      transform: translateX(-50%) translateY(6px);
    }
    .hjhj-tooltip.hjhj-below {
      top: calc(100% + 8px);
      transform: translateX(-50%) translateY(-6px);
    }
    .hjhj-tooltip::after {
      content: '';
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      border: 7px solid transparent;
    }
    .hjhj-tooltip.hjhj-above::after {
      top: 100%;
      border-top-color: #1a1a2e;
    }
    .hjhj-tooltip.hjhj-below::after {
      bottom: 100%;
      border-bottom-color: #1a1a2e;
    }
    .hjhj-word:hover .hjhj-tooltip {
      visibility: visible;
      opacity: 1;
    }
    .hjhj-word:hover .hjhj-tooltip.hjhj-above {
      transform: translateX(-50%) translateY(0);
    }
    .hjhj-word:hover .hjhj-tooltip.hjhj-below {
      transform: translateX(-50%) translateY(0);
    }
    .hjhj-entry {
      padding: 5px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .hjhj-entry:hover {
      background: rgba(255,255,255,0.1);
    }
    .hjhj-entry.hjhj-active {
      background: rgba(255,215,0,0.15);
    }
    .hjhj-entry + .hjhj-entry {
      border-top: 1px solid #333;
    }
    .hjhj-hanja {
      font-size: 1.4em;
      font-weight: bold;
      color: #ffd700;
    }
    .hjhj-reading {
      color: #aaa;
      margin-left: 8px;
      font-size: 0.95em;
    }
    .hjhj-meaning {
      color: #ccc;
      font-size: 0.95em;
      display: block;
      margin-top: 3px;
    }
    .hjhj-level {
      color: #888;
      font-size: 0.85em;
      margin-left: 6px;
    }
    .hjhj-count {
      color: #666;
      font-size: 0.8em;
      margin-left: 4px;
    }
    .hjhj-entry.hjhj-dim {
      opacity: 0.45;
    }
    .hjhj-entry.hjhj-dim:hover {
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);
}

function shouldSkipNode(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as Element;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.getAttribute(HANJAHANJA_ATTR) !== null) return true;
  if (el.isContentEditable) return true;
  return false;
}

/** 선호도 기반으로 엔트리 정렬 (선택 횟수 > 급수 범위 내 > 표준국어대사전 우선 > 급수 쉬운 순) */
function sortByPreference(entries: DictEntry[], prefs: Record<string, number>, userLevel: number): DictEntry[] {
  return [...entries].sort((a, b) => {
    const countA = prefs[a.hanja] ?? 0;
    const countB = prefs[b.hanja] ?? 0;
    if (countA !== countB) return countB - countA; // 선택 횟수 높은 순
    // 급수 범위 내 엔트리 우선
    const inRangeA = a.level >= userLevel ? 1 : 0;
    const inRangeB = b.level >= userLevel ? 1 : 0;
    if (inRangeA !== inRangeB) return inRangeB - inRangeA;
    // 표준국어대사전(stdict) 우선
    const srcA = a.source === 'stdict' ? 1 : 0;
    const srcB = b.source === 'stdict' ? 1 : 0;
    if (srcA !== srcB) return srcB - srcA;
    return b.level - a.level; // 급수 쉬운 순 (fallback)
  });
}

/** 한자 <span> + 마우스 오버 툴팁 생성 */
function createHanjaElement(word: string, entries: DictEntry[], prefs: Record<string, number>, userLevel: number): HTMLElement {
  const sorted = sortByPreference(entries, prefs, userLevel);

  const wrapper = document.createElement('span');
  wrapper.className = 'hjhj-word';
  wrapper.setAttribute(HANJAHANJA_ATTR, 'converted');

  // 인라인 한자 텍스트 (선호도 1위)
  const inlineText = document.createTextNode(sorted[0].hanja);
  wrapper.appendChild(inlineText);

  const tooltip = document.createElement('span');
  tooltip.className = 'hjhj-tooltip hjhj-above'; // 기본은 위로

  // hover 시 위/아래 공간 판단해서 방향 결정
  wrapper.addEventListener('mouseenter', () => {
    const rect = wrapper.getBoundingClientRect();
    const spaceAbove = rect.top;
    if (spaceAbove < 120) {
      tooltip.classList.remove('hjhj-above');
      tooltip.classList.add('hjhj-below');
    } else {
      tooltip.classList.remove('hjhj-below');
      tooltip.classList.add('hjhj-above');
    }
  });

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

    // 선택 횟수 표시 (1회 이상일 때만)
    const count = prefs[entry.hanja] ?? 0;
    if (count > 0) {
      const countSpan = document.createElement('span');
      countSpan.className = 'hjhj-count';
      countSpan.textContent = `×${count}`;
      row.appendChild(countSpan);
    }

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
        tooltip.querySelectorAll('.hjhj-entry').forEach((el) => el.classList.remove('hjhj-active'));
        row.classList.add('hjhj-active');

        // 선호도 저장
        recordChoice(word, entry.hanja);

        // 카운트 표시 업데이트
        let countEl = row.querySelector('.hjhj-count') as HTMLElement | null;
        const newCount = (prefs[entry.hanja] ?? 0) + 1;
        prefs[entry.hanja] = newCount;
        if (countEl) {
          countEl.textContent = `×${newCount}`;
        } else {
          countEl = document.createElement('span');
          countEl.className = 'hjhj-count';
          countEl.textContent = `×${newCount}`;
          // level 뒤에 삽입
          const levelEl = row.querySelector('.hjhj-level');
          if (levelEl?.nextSibling) {
            row.insertBefore(countEl, levelEl.nextSibling);
          } else {
            row.appendChild(countEl);
          }
        }
      });
    }

    tooltip.appendChild(row);
  }

  wrapper.appendChild(tooltip);
  return wrapper;
}

/** 선호도를 미리 로드한 후 텍스트 노드 변환 */
async function convertTextNode(textNode: Text, dict: HanjaDict, prefsCache: Map<string, Record<string, number>>, userLevel: number): Promise<void> {
  const text = textNode.textContent;
  if (!text || text.trim().length === 0) return;

  const matches = findHanjaWords(text, dict);
  if (matches.length === 0) return;

  // 필요한 단어들의 선호도를 배치 로드
  for (const match of matches) {
    if (!prefsCache.has(match.word)) {
      prefsCache.set(match.word, await getWordPrefs(match.word));
    }
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of matches) {
    if (match.position > lastIndex) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.position)));
    }

    const prefs = prefsCache.get(match.word) ?? {};
    fragment.appendChild(createHanjaElement(match.word, match.entries, prefs, userLevel));
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

export async function convertPage(dict: HanjaDict, userLevel: number): Promise<number> {
  injectStyles();
  const textNodes = collectTextNodes(document.body);
  let convertedCount = 0;
  const prefsCache = new Map<string, Record<string, number>>();

  for (const textNode of textNodes) {
    await convertTextNode(textNode, dict, prefsCache, userLevel);
    if (textNode.parentNode === null) convertedCount++;
  }

  console.log(`[한자한자] ${convertedCount}개 텍스트 노드 변환`);
  return convertedCount;
}

export async function convertSubtree(root: Node, dict: HanjaDict, userLevel: number): Promise<void> {
  const textNodes = collectTextNodes(root);
  const prefsCache = new Map<string, Record<string, number>>();
  for (const textNode of textNodes) {
    await convertTextNode(textNode, dict, prefsCache, userLevel);
  }
}

export function setupMutationObserver(dict: HanjaDict, userLevel: number): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of mutation.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE) {
          const el = added as Element;
          if (el.getAttribute(HANJAHANJA_ATTR) !== null) continue;
          if (shouldSkipNode(added)) continue;
          convertSubtree(added, dict, userLevel);
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
            convertTextNode(text, dict, prefsCache, userLevel);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[한자한자] MutationObserver 활성화');
  return observer;
}
