import { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { WebView, type WebViewNavigation, type WebViewMessageEvent } from 'react-native-webview';

import { Text, View } from '@/components/Themed';
import HanjaDetailModal, { type HanjaTapData } from '@/components/HanjaDetailModal';
import { loadDict, loadHomonymFreq, type HanjaDict, type HomonymFreq } from '@/lib/hanja/dictionary';
import { findMatches, buildWordSet } from '@/lib/hanja/matcher';
import { getInjectScript } from '@/lib/hanja/inject-script';
import { trackExposure, trackClick, addToVocab, startAutoFlush, stopAutoFlush, rotateDailyData, flushExposures } from '@/lib/hanja/tracker';

const DEFAULT_URL = 'https://news.naver.com';

export default function BrowserScreen() {
  const webViewRef = useRef<WebView>(null);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // 한자 변환 상태
  const dictRef = useRef<HanjaDict | null>(null);
  const freqRef = useRef<HomonymFreq | null>(null);
  const wordSetRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [convertEnabled, setConvertEnabled] = useState(true);
  const [modalData, setModalData] = useState<HanjaTapData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 사전 로드 + 트래커 초기화 (앱 시작 시 1회)
  useEffect(() => {
    async function initDict() {
      try {
        // 테스트: 8급만 (335KB, 가볍게 시작)
        const [dict, freq] = await Promise.all([loadDict(8), loadHomonymFreq()]);
        dictRef.current = dict;
        freqRef.current = freq;
        wordSetRef.current = buildWordSet(dict);
        setDictReady(true);
      } catch (error) {
        console.warn('사전 로드 실패:', error);
      }
    }
    initDict();
    // tracker 초기화 (AsyncStorage 에러 방지용 try-catch)
    try { rotateDailyData(); } catch {}
    try { startAutoFlush(); } catch {}

    return () => {
      try { stopAutoFlush(); } catch {}
    };
  }, []);

  // URL 정규화 (https:// 자동 추가)
  const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return DEFAULT_URL;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    // 검색어처럼 보이면 구글 검색
    if (!trimmed.includes('.')) return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    return `https://${trimmed}`;
  };

  const handleGo = () => {
    Keyboard.dismiss();
    const normalized = normalizeUrl(inputUrl);
    setCurrentUrl(normalized);
    setInputUrl(normalized);
  };

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    if (navState.url) {
      setInputUrl(navState.url);
    }
  }, []);

  // 텍스트 매칭 처리 (RN 측)
  const processTextBatch = useCallback(
    (batch: Array<{ id: number; text: string }>) => {
      if (!dictRef.current || !wordSetRef.current || !freqRef.current) return;

      const conversions: Array<{
        nodeId: number;
        matches: ReturnType<typeof findMatches>;
      }> = [];

      for (const item of batch) {
        const matches = findMatches(
          item.text,
          dictRef.current,
          wordSetRef.current,
          freqRef.current,
        );
        if (matches.length > 0) {
          conversions.push({ nodeId: item.id, matches });
        }
      }

      // 노출 추적: 매칭된 단어들 기록
      for (const conv of conversions) {
        for (const m of conv.matches) {
          trackExposure(m.word, m.hanja);
        }
      }

      if (conversions.length > 0) {
        // WebView에 변환 결과 전송
        const message = JSON.stringify({
          type: 'APPLY_CONVERSIONS',
          conversions,
        });
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(message)} }));
          true;
        `);
      }

      setIsConverting(false);
    },
    [],
  );

  // WebView → RN 메시지 핸들러
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case 'PAGE_LOADED':
            // 페이지 로드 완료
            break;

          case 'EXTRACT_TEXT':
            // 페이지 텍스트 수신 → 매칭 수행
            if (convertEnabled && dictReady && data.batch) {
              setIsConverting(true);
              // 비동기로 처리 (UI 블록 방지)
              setTimeout(() => processTextBatch(data.batch), 0);
            }
            break;

          case 'HANJA_TAP':
            // 클릭 추적
            trackClick(data.word, data.hanja, data.meaning || '', currentUrl);
            // 한자 탭 → 상세 모달 표시
            setModalData({
              word: data.word,
              hanja: data.hanja,
              meaning: data.meaning,
              reading: data.reading,
              entries: data.entries,
            });
            setModalVisible(true);
            break;
        }
      } catch {
        // JSON이 아닌 메시지 무시
      }
    },
    [convertEnabled, dictReady, processTextBatch],
  );

  // 한자 변환 주입 스크립트
  const injectedScript = convertEnabled ? getInjectScript() : `
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'PAGE_LOADED',
      url: window.location.href,
      title: document.title,
    }));
    true;
  `;

  return (
    <View style={styles.container}>
      {/* 주소창 */}
      <View style={styles.addressBar}>
        <TextInput
          style={styles.urlInput}
          value={inputUrl}
          onChangeText={setInputUrl}
          onSubmitEditing={handleGo}
          placeholder="URL 또는 검색어 입력"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          selectTextOnFocus
        />
        {isLoading ? (
          <ActivityIndicator style={styles.goButton} />
        ) : (
          <Pressable style={styles.goButton} onPress={handleGo}>
            <Text style={styles.goText}>이동</Text>
          </Pressable>
        )}
      </View>

      {/* 상태 바: 사전 로딩 / 변환 중 표시 */}
      {(!dictReady || isConverting) && (
        <View style={styles.statusBar}>
          <ActivityIndicator size="small" color="#4A90D9" />
          <Text style={styles.statusText}>
            {!dictReady ? '사전 로딩 중...' : '한자 변환 중...'}
          </Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        injectedJavaScript={injectedScript}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90D9" />
          </View>
        )}
      />

      {/* 한자 상세 모달 */}
      <HanjaDetailModal
        visible={modalVisible}
        data={modalData}
        onClose={() => setModalVisible(false)}
        onAddVocab={(word, hanja) => {
          addToVocab(word, hanja, modalData?.meaning || '');
        }}
      />

      {/* 하단 네비게이션 바 */}
      <View style={styles.navBar}>
        <Pressable
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}>
          <Text style={[styles.navIcon, !canGoBack && styles.navIconDisabled]}>‹</Text>
        </Pressable>

        <Pressable
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}>
          <Text style={[styles.navIcon, !canGoForward && styles.navIconDisabled]}>›</Text>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() => webViewRef.current?.reload()}>
          <Text style={styles.navIcon}>↻</Text>
        </Pressable>

        {/* 한자 변환 토글 */}
        <Pressable
          style={[styles.navButton, convertEnabled && styles.navButtonActive]}
          onPress={() => {
            setConvertEnabled((prev) => !prev);
            if (convertEnabled) {
              // 변환 끄기 → 원본 페이지 리로드
              webViewRef.current?.reload();
            }
          }}>
          <Text style={[styles.navIcon, convertEnabled && styles.navIconActive]}>漢</Text>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() => {
            setCurrentUrl(DEFAULT_URL);
            setInputUrl(DEFAULT_URL);
          }}>
          <Text style={styles.navIcon}>⌂</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addressBar: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  urlInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    fontSize: 14,
  },
  goButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  goText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#d0e8ff',
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#4A90D9',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonActive: {
    backgroundColor: '#e8f4fd',
    borderRadius: 6,
  },
  navIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  navIconDisabled: {
    opacity: 0.3,
  },
  navIconActive: {
    color: '#4A90D9',
  },
});
