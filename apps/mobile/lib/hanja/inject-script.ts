/**
 * WebView에 주입할 한자 변환 스크립트 생성
 *
 * 흐름:
 * 1. 페이지 로드 → 텍스트 노드 수집 → RN에 전송
 * 2. RN에서 매칭 결과 수신 → DOM 변환 적용
 * 3. 한자 탭 → RN에 상세 이벤트 전송
 * 4. 한자 꾹 누르기 → RN에 저장 이벤트 전송
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
  var style = document.createElement('style');
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
  \`;
  document.head.appendChild(style);

  // ── 텍스트 노드 수집 ──
  var textNodes = [];
  var nodeId = 0;

  function collectTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && SKIP_TAGS.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.hasAttribute(ATTR)) return NodeFilter.FILTER_REJECT;
        // 한글이 포함된 텍스트만
        if (!/[\\uAC00-\\uD7A3]/.test(node.textContent)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var n;
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

    var batch = textNodes.map(function(node) {
      return { id: node.__hjId, text: node.textContent };
    });

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'EXTRACT_TEXT',
      batch: batch,
    }));
  }

  // ── 문맥 문장 추출 ──
  function getContextSentence(el) {
    // 부모 블록 요소에서 전체 텍스트 가져오기
    var block = el;
    var blockTags = new Set(['P', 'DIV', 'LI', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'ARTICLE', 'SECTION', 'BLOCKQUOTE', 'FIGCAPTION']);
    while (block && block !== document.body) {
      if (blockTags.has(block.tagName)) break;
      block = block.parentElement;
    }
    if (!block || block === document.body) block = el.parentElement;

    var fullText = (block && block.textContent) ? block.textContent.trim() : '';
    if (fullText.length > 200) {
      // 한자 요소 위치 기준으로 앞뒤 100자 자르기
      var elText = el.textContent || '';
      var idx = fullText.indexOf(elText);
      if (idx < 0) idx = 0;
      var start = Math.max(0, idx - 80);
      var end = Math.min(fullText.length, idx + elText.length + 80);
      fullText = (start > 0 ? '…' : '') + fullText.substring(start, end) + (end < fullText.length ? '…' : '');
    }
    return fullText;
  }

  // ── 매칭 결과 수신 & DOM 변환 ──
  function applyConversions(conversions) {
    for (var c = 0; c < conversions.length; c++) {
      var conv = conversions[c];
      var node = textNodes.find(function(n) { return n.__hjId === conv.nodeId; });
      if (!node || !node.parentNode) continue;

      var text = node.textContent;
      if (!text) continue;

      // 매치를 endIdx 역순 정렬
      var matches = conv.matches.sort(function(a, b) { return b.startIdx - a.startIdx; });

      var frag = document.createDocumentFragment();
      var lastIdx = text.length;

      for (var i = 0; i < matches.length; i++) {
        var m = matches[i];

        if (m.endIdx < lastIdx) {
          frag.insertBefore(document.createTextNode(text.substring(m.endIdx, lastIdx)), frag.firstChild);
        }

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

      if (lastIdx > 0) {
        frag.insertBefore(document.createTextNode(text.substring(0, lastIdx)), frag.firstChild);
      }

      node.parentNode.replaceChild(frag, node);
    }
  }

  // ── 동음이의어 선택 시 DOM 업데이트 ──
  function updateHanja(word, newHanja, newMeaning, newReading, newLevel) {
    var spans = document.querySelectorAll('[' + ATTR + '="' + word + '"]');
    for (var i = 0; i < spans.length; i++) {
      var span = spans[i];
      span.setAttribute('data-hanja', newHanja);
      span.setAttribute('data-meaning', newMeaning);
      span.setAttribute('data-reading', newReading);
      span.setAttribute('data-level', String(newLevel));
      span.textContent = newHanja;
    }
  }

  // ── 한자 탭 (click 이벤트만, 네이티브 충돌 없음) ──
  document.addEventListener('click', function(e) {
    var el = e.target.closest ? e.target.closest('[' + ATTR + ']') : null;
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    var context = getContextSentence(el);
    var entries = [];
    try { entries = JSON.parse(el.getAttribute('data-entries') || '[]'); } catch(err) {}

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'HANJA_TAP',
      word: el.getAttribute(ATTR),
      hanja: el.getAttribute('data-hanja'),
      meaning: el.getAttribute('data-meaning'),
      reading: el.getAttribute('data-reading'),
      context: context,
      entries: entries,
    }));
  }, true);

  // ── RN → WebView 메시지 수신 ──
  function handleRNMessage(e) {
    try {
      var data = JSON.parse(typeof e.data === 'string' ? e.data : '');
      if (data.type === 'APPLY_CONVERSIONS') {
        applyConversions(data.conversions);
      } else if (data.type === 'UPDATE_HANJA') {
        updateHanja(data.word, data.hanja, data.meaning, data.reading, data.level);
      }
    } catch(err) {}
  }

  document.addEventListener('message', handleRNMessage);
  window.addEventListener('message', handleRNMessage);

  // ── MutationObserver: 동적 콘텐츠 감지 ──
  var debounceTimer = null;
  var observer = new MutationObserver(function(mutations) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
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
  function init() {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PAGE_LOADED',
      url: window.location.href,
      title: document.title,
    }));

    setTimeout(function() {
      extractAndSend();
      textNodes.forEach(function(n) { n.__hjSent = true; });

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
