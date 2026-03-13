import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  /** 배경에 흐릿하게 보여줄 한자 */
  guideChar?: string;
  /** 캔버스 크기 (정사각형) */
  size?: number;
  /** 선 색상 */
  strokeColor?: string;
  /** 선 굵기 */
  strokeWidth?: number;
  /** 외부에서 지우기 트리거 */
  clearTrigger?: number;
}

export default function WritingCanvas({
  guideChar = '學',
  size,
  strokeColor = '#0f172a',
  strokeWidth = 6,
  clearTrigger = 0,
}: Props) {
  const canvasSize = size || Dimensions.get('window').width - 40;
  const webViewRef = useRef<WebView>(null);

  // clearTrigger 변경 시 캔버스 초기화
  const lastClearRef = useRef(clearTrigger);
  useEffect(() => {
    if (clearTrigger !== lastClearRef.current) {
      lastClearRef.current = clearTrigger;
      webViewRef.current?.injectJavaScript('clearCanvas(); true;');
    }
  }, [clearTrigger]);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; touch-action: none; background: #f8fafc; }
  canvas { display: block; touch-action: none; }
</style>
</head>
<body>
<canvas id="c" width="${canvasSize * 2}" height="${canvasSize * 2}"
  style="width:${canvasSize}px;height:${canvasSize}px;"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  let drawing = false;

  // 가이드 격자선
  function drawGuide() {
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([8 * dpr, 8 * dpr]);
    // 세로선
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
    // 가로선
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
    ctx.setLineDash([]);
    // 배경 한자
    ctx.fillStyle = 'rgba(226, 232, 240, 0.4)';
    ctx.font = (w * 0.6) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('${guideChar}', w/2, h/2);
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuide();
  }

  drawGuide();

  // 드로잉 설정
  ctx.strokeStyle = '${strokeColor}';
  ctx.lineWidth = ${strokeWidth} * dpr;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - rect.left) * dpr, y: (t.clientY - rect.top) * dpr };
  }

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    ctx.strokeStyle = '${strokeColor}';
    ctx.lineWidth = ${strokeWidth} * dpr;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }, { passive: false });

  canvas.addEventListener('touchend', () => { drawing = false; });
  canvas.addEventListener('touchcancel', () => { drawing = false; });
</script>
</body>
</html>`;

  return (
    <View style={[styles.container, { width: canvasSize, height: canvasSize }]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={{ width: canvasSize, height: canvasSize, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
});
