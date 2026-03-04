# 한자한자 Phase 1 MVP 체크리스트

> 담당: 🧑 진 형 / 🤖 한철 / 🤝 같이
> 상태: ⬜ 미시작 / 🔄 진행중 / ✅ 완료 / ⏸️ 대기 (선행작업 필요)

---

## Week 0: 사전 준비 (진 형 중심)

### 데이터 준비 🧑
- ✅ 개별 한자 CSV 파일 정리 → `docs/reference/hanja_characters.csv` (5,978자)
- ✅ 우리말샘 오픈 API 키 발급 → `120a24d0-4598-4567-948d-653f61b460b3`
- ✅ 국립국어원 오픈 API 키 발급 → `C822A15091C0A8A2218553923DD925D7`
- ⬜ (선택) 한국어기초사전 API 키 발급 (https://krdict.korean.go.kr/openApi/openApiInfo)
- ⬜ 우리말샘 오픈 데이터(XML) 벌크 다운로드 (https://ithub.korean.go.kr) — 사이트 장애 중, API 수집으로 대체 가능

### 외부 서비스 세팅 🧑
- ✅ Supabase 프로젝트 생성 → URL, anon key, service role key 확보
- ✅ Kakao Developers 앱 생성 + REST API 키 발급
- ⏸️ Google Cloud Console OAuth 클라이언트 ID 발급 (사업자등록번호 대기)
- ⏸️ Chrome Web Store 개발자 계정 등록 (한국 주소 인증 문제, 사업자 계정으로 재시도 예정)

---

## Week 1: 기반 구축 + 데이터 파이프라인

### Day 1-2: 프로젝트 초기 설정
- ✅ pnpm 모노레포 세팅 (root, workspace) 🤖
- ✅ Next.js 15 웹 프로젝트 생성 (apps/web) 🤖
- ✅ WXT 크롬 확장 프로젝트 생성 (apps/extension) 🤖
- ✅ 공유 패키지 생성 (packages/shared - 타입, 상수) 🤖
- ✅ 데이터 스크립트 구조 생성 (scripts/) 🤖
- ✅ 배포 설정 (Dockerfile, docker-compose.yml, nginx.conf) 🤖
- ⬜ Supabase 테이블 생성 (6개 테이블 + RLS) 🤖
- ⬜ .env.local 환경변수 설정 🤝
- ⬜ NAS에 Git 리모트 연결 + 첫 커밋 🤝

### Day 3-4: 한자 데이터 파이프라인 (★ 핵심)
- ⬜ PM 한자 CSV → hanja_characters 임포트 스크립트 🤖
- ⬜ CSV 데이터 실제 임포트 실행 🤝
- ⬜ 우리말샘 XML 파싱 → 한자어 추출 스크립트 🤖
- ⬜ 한자어 + 급수 교차 매칭 → hanja_words 구축 🤖
- ⬜ 국립국어원 API 보완 스크립트 🤖

### Day 5-6: 데이터 품질 + JSON 생성
- ⬜ hanja_words 데이터 검증 (급수 분포, 누락 확인) 🤝
- ⬜ AI API 데이터 보강 (뜻풀이, 한자 분해) 🤖
- ⬜ 급수별 JSON 사전 파일 생성 스크립트 🤖
- ⬜ 크롬 확장용 JSON 번들링 확인 🤖

### Day 7: 인증 시스템
- ⬜ Supabase Auth 설정 (구글 + 카카오 OAuth) 🤝
- ⬜ 웹 로그인/로그아웃 UI + 기능 🤖
- ⬜ profiles 자동 생성 트리거 (Supabase Function) 🤖
- ⬜ 미들웨어 인증 처리 🤖

---

## Week 2: 크롬 확장 개발

### Day 8-10: 한자 변환 엔진 (핵심)
- ⬜ 사전 데이터 로더 (dictionary.ts) 🤖
- ⬜ 토크나이저 - 최장일치 알고리즘 (tokenizer.ts) 🤖
- ⬜ 한자 변환 엔진 (converter.ts) 🤖
- ⬜ Content Script: DOM 텍스트 스캔 + HTML 변환 🤖
- ⬜ MutationObserver 동적 콘텐츠 대응 🤖
- ⬜ 변환 제외 요소 처리 (script, input, textarea 등) 🤖

### Day 11-12: 루비 모드
- ⬜ Hover 툴팁 UI (HanjaTooltip.tsx) 🤖
- ⬜ 툴팁 위치 계산 로직 🤖
- ⬜ 다크모드 대응 스타일링 🤖

### Day 13-14: 팝업 + 설정
- ⬜ Popup UI 개선 (ON/OFF, 레벨 선택, 통계) 🤖
- ⬜ chrome.storage 설정 저장/불러오기 🤖
- ⬜ 확장 프로그램 내 Supabase 로그인 연동 🤖

---

## Week 3: 웹 서비스 개발

### Day 15-16: 랜딩 페이지
- ⬜ shadcn/ui 설치 + 기본 컴포넌트 세팅 🤖
- ⬜ Hero 섹션 (메인 카피 + CTA) 🤖
- ⬜ Before/After 데모 섹션 🤖
- ⬜ 기능 소개 + 사용 방법 섹션 🤖
- ⬜ Footer 🤖
- ⬜ 반응형 디자인 + SEO 메타 태그 🤖

### Day 17-19: 진단 테스트
- ⬜ 테스트 문제 데이터 구축 (급수당 10문제) 🤝
- ⬜ 테스트 UI (문제 카드, 진행률 바, 정답/오답) 🤖
- ⬜ 레벨 판정 알고리즘 🤖
- ⬜ 결과 페이지 + SNS 공유 버튼 🤖

### Day 20-21: 마이페이지 + 단어장
- ⬜ 단어장 CRUD UI (목록, 검색, 필터, 삭제) 🤖
- ⬜ "외웠어요" 체크 기능 🤖
- ⬜ 레벨 설정 변경 🤖
- ⬜ 계정 설정 (닉네임, 로그아웃) 🤖

---

## Week 4: 연동 + 배포 + QA

### Day 22-23: 크롬 확장 ↔ 웹 연동
- ⬜ 우클릭 메뉴 단어장 저장 기능 🤖
- ⬜ 문맥(문장) 자동 캡처 로직 🤖
- ⬜ 저장 성공 토스트 알림 🤖

### Day 24-25: 배포
- ⬜ Docker 이미지 빌드 + Vultr 배포 🤝
- ⬜ hanjahanja.kr SSL 인증서 설정 🤝
- ⬜ 크롬 웹 스토어 등록 신청 🧑

### Day 26-28: QA 및 버그 수정
- ⬜ 주요 사이트 변환 테스트 (네이버 뉴스, 에펨코리아 등) 🤝
- ⬜ 한자어 변환 정확도 검증 🤝
- ⬜ 성능 테스트 (대용량 페이지 변환 속도) 🤖
- ⬜ 버그 수정 + UX 개선 🤖

---

## 마일스톤 추적

| # | 마일스톤 | 목표 | 상태 |
|---|----------|------|------|
| M0 | PM 사전 준비 완료 | CSV, 우리말샘, API키 | 🔄 (Google OAuth, Chrome Web Store 보류) |
| M1 | 프로젝트 세팅 + 데이터 | hanja_words 3,000개+, JSON 사전 | 🔄 |
| M2 | 한자 변환 작동 | 뉴스에서 한자 변환 확인 | ⬜ |
| M3 | 루비 모드 작동 | Hover 시 툴팁 표시 | ⬜ |
| M4 | 진단 테스트 완성 | 테스트→레벨 판정→결과 | ⬜ |
| M5 | MVP 통합 완성 | 웹+확장 전체 플로우 | ⬜ |
| M6 | 배포 완료 | hanjahanja.kr 라이브 | ⬜ |
