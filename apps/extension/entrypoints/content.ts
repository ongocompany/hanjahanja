export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("한자한자 Content Script 로드됨");
    // TODO: 한자 변환 엔진 구현
    // 1. 페이지 텍스트 스캔
    // 2. 사전 매칭 (최장일치)
    // 3. 사용자 레벨 필터링
    // 4. HTML 변환 (<ruby> 태그)
    // 5. 이벤트 리스너 등록 (hover, 우클릭)
  },
});
