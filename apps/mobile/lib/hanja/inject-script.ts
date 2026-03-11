/**
 * WebView에 주입할 한자 변환 스크립트 생성
 *
 * 흐름:
 * 1. 페이지 로드 → 텍스트 노드 수집 → RN에 전송
 * 2. RN에서 매칭 결과 수신 → DOM 변환 적용
 * 3. 한자 탭 → RN에 이벤트 전송
 */
export function getInjectScript(): string {
  return `
(function() {
  'use strict';

  // 이미 주입되었으면 스킵
  if (window.__HANJAHANJA_INJECTED__) return;
  window.__HANJAHANJA_INJECTED__ = true;

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
    'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE', 'KBD',
    'SVG', 'MATH', 'CANVAS',
  ]);
  const ATTR = 'data-hanjahanja';

  // ── 스타일 주입 ──
  const style = document.createElement('style');
  style.textContent = \`
    [data-hanjahanja] {
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-color: #DAA520;
      text-underline-offset: 3px;
      cursor: pointer;
      position: relative;
    }
    [data-hanjahanja]:active {
      background-color: rgba(218, 165, 32, 0.15);
      border-radius: 2px;
    }
    .hjhj-tooltip {
      position: fixed;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 10px 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      z-index: 999999;
      font-size: 14px;
      line-height: 1.5;
      max-width: 280px;
      color: #333;
      pointer-events: auto;
    }
    .hjhj-tooltip-hanja {
      font-size: 22px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 4px;
    }
    .hjhj-tooltip-reading {
      font-size: 13px;
      color: #666;
      margin-bottom: 2px;
    }
    .hjhj-tooltip-meaning {
      font-size: 13px;
      color: #888;
    }
    .hjhj-tooltip-close {
      position: absolute;
      top: 4px;
      right: 8px;
      font-size: 18px;
      color: #aaa;
      cursor: pointer;
      padding: 4px;
    }
  \`;
  document.head.appendChild(style);

  // ── 텍스트 노드 수집 ──
  let textNodes = [];
  let nodeId = 0;

  function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && SKIP_TAGS.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.hasAttribute(ATTR)) return NodeFilter.FILTER_REJECT;
        // 한글이 포함된 텍스트만
        if (!/[\\uAC00-\\uD7A3]/.test(node.textContent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while (n = walker.nextNode()) {
      n.__hjId = nodeId++;
      nodes.push(n);
    }
    return nodes;
  }

  // ── 페이지 텍스트 추출 & RN 전송 ──
  function extractAndSend() {
    textNodes = collectTextNodes(document.body);
    if (textNodes.length === 0) return;

    // 텍스트를 배치로 묶어서 전송 (성능)
    const batch = textNodes.map(function(node) {
      return { id: node.__hjId, text: node.textContent };
    });

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'EXTRACT_TEXT',
      batch: batch,
    }));
  }

  // ── 매칭 결과 수신 & DOM 변환 ──
  function applyConversions(conversions) {
    // conversions: [{ nodeId, matches: [{ word, hanja, meaning, reading, level, startIdx, endIdx, entries }] }]
    for (const conv of conversions) {
      const node = textNodes.find(function(n) { return n.__hjId === conv.nodeId; });
      if (!node || !node.parentNode) continue;

      const text = node.textContent;
      if (!text) continue;

      // 매치를 endIdx 역순 정렬 (뒤에서부터 치환해야 인덱스 안 꼬임)
      const matches = conv.matches.sort(function(a, b) { return b.startIdx - a.startIdx; });

      // DocumentFragment로 교체
      const frag = document.createDocumentFragment();
      let lastIdx = text.length;

      for (let i = 0; i < matches.length; i++) {
        var m = matches[i];

        // 매치 뒤 텍스트
        if (m.endIdx < lastIdx) {
          frag.insertBefore(document.createTextNode(text.substring(m.endIdx, lastIdx)), frag.firstChild);
        }

        // 한자 span 생성
        var span = document.createElement('span');
        span.setAttribute(ATTR, m.word);
        span.setAttribute('data-hanja', m.hanja);
        span.setAttribute('data-meaning', m.meaning);
        span.setAttribute('data-reading', m.reading);
        span.setAttribute('data-level', String(m.level));
        span.setAttribute('data-entries', JSON.stringify(m.entries));
        span.textContent = m.hanja;
        frag.insertBefore(span, frag.firstChild);

        lastIdx = m.startIdx;
      }

      // 첫 번째 매치 앞 텍스트
      if (lastIdx > 0) {
        frag.insertBefore(document.createTextNode(text.substring(0, lastIdx)), frag.firstChild);
      }

      node.parentNode.replaceChild(frag, node);
    }
  }

  // ── 툴팁 ──
  let activeTooltip = null;

  function showTooltip(el) {
    hideTooltip();

    const hanja = el.getAttribute('data-hanja');
    const meaning = el.getAttribute('data-meaning');
    const reading = el.getAttribute('data-reading');
    const word = el.getAttribute(ATTR);

    const tooltip = document.createElement('div');
    tooltip.className = 'hjhj-tooltip';
    tooltip.innerHTML =
      '<div class="hjhj-tooltip-close">&times;</div>' +
      '<div class="hjhj-tooltip-hanja">' + hanja + '</div>' +
      '<div class="hjhj-tooltip-reading">' + word + ' [' + reading + ']</div>' +
      '<div class="hjhj-tooltip-meaning">' + meaning + '</div>';

    document.body.appendChild(tooltip);

    // 위치 계산
    const rect = el.getBoundingClientRect();
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let top = rect.top - th - 8;
    let left = rect.left + (rect.width - tw) / 2;

    // 화면 밖 방지
    if (top < 0) top = rect.bottom + 8;
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';

    // 닫기 버튼
    tooltip.querySelector('.hjhj-tooltip-close').addEventListener('click', function(e) {
      e.stopPropagation();
      hideTooltip();
    });

    activeTooltip = tooltip;

    // RN에 탭 이벤트 전송 (동음이의어 엔트리 포함)
    var entriesStr = el.getAttribute('data-entries');
    var entries = [];
    try { entries = JSON.parse(entriesStr || '[]'); } catch(e) {}

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'HANJA_TAP',
      word: word,
      hanja: hanja,
      meaning: meaning,
      reading: reading,
      entries: entries,
    }));
  }

  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }

  // 한자 요소 클릭/탭 이벤트
  document.addEventListener('click', function(e) {
    const el = e.target.closest('[' + ATTR + ']');
    if (el) {
      e.preventDefault();
      e.stopPropagation();
      showTooltip(el);
    } else if (activeTooltip && !e.target.closest('.hjhj-tooltip')) {
      hideTooltip();
    }
  }, true);

  // ── RN → WebView 메시지 수신 ──
  // React Native에서 window.postMessage로 보내면 여기서 받음
  document.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'APPLY_CONVERSIONS') {
        applyConversions(data.conversions);
      }
    } catch(err) {}
  });

  // window.onmessage도 등록 (RN WebView는 이쪽으로 보냄)
  window.addEventListener('message', function(e) {
    try {
      var data = JSON.parse(e.data);
      if (data.type === 'APPLY_CONVERSIONS') {
        applyConversions(data.conversions);
      }
    } catch(err) {}
  });

  // ── MutationObserver: 동적 콘텐츠 감지 ──
  let debounceTimer = null;
  const observer = new MutationObserver(function(mutations) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      // 새로 추가된 노드만 재수집
      textNodes = collectTextNodes(document.body);
      var newNodes = textNodes.filter(function(n) { return !n.__hjSent; });
      if (newNodes.length === 0) return;

      newNodes.forEach(function(n) { n.__hjSent = true; });

      var batch = newNodes.map(function(n) {
        return { id: n.__hjId, text: n.textContent };
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'EXTRACT_TEXT',
        batch: batch,
      }));
    }, 500);
  });

  // ── 초기화 ──
  // 페이지 로드 완료 대기
  function init() {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PAGE_LOADED',
      url: window.location.href,
      title: document.title,
    }));

    // 약간의 지연 후 텍스트 추출 (페이지 렌더링 완료 대기)
    setTimeout(function() {
      extractAndSend();
      textNodes.forEach(function(n) { n.__hjSent = true; });

      // 동적 콘텐츠 감시 시작
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }, 800);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
true;
`;
}
