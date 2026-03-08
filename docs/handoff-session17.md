# 세션 17 핸드오프

## 완료 작업

### 1. 확장 팝업 빈 화면 수정
- **원인**: `loadSession()`에 `.catch()` 없어서 에러 시 `setLoaded(true)` 미호출 → 영원히 로딩
- **수정**: `apps/extension/entrypoints/popup/App.tsx` — `.catch()` + `.finally(() => setLoaded(true))` 추가
- **추가**: `apps/extension/lib/auth.ts`, `sync.ts` — `chrome.storage.local` → `browser.storage.local` (WXT 호환)

### 2. 한 글자 단어 변환 차단
- **파일**: `apps/extension/lib/converter.ts`
- 순우리말 필터 이후 `m.word.length >= 2` 필터 추가
- 한 글자는 문맥 판별이 어렵고 오변환 위험이 높아 전면 차단

### 3. WSD 수동 리뷰 + 데이터 정제 + 재학습
- `scripts/wsd-reviewer.html` — 759개 동음이의어 리뷰 웹 UI 구현
- 형이 321개 단어 수동 리뷰 → `docs/remove_senses (2).json` 저장
- **서버 작업** (jinserver):
  - `apply_removals.py` → label_map 759→561 단어로 정리 (0-1개 의미만 남은 단어 제거)
  - `fix_val_test.py` → val/test.jsonl도 동일 필터 적용
  - label 인덱스 재매핑 (3,969건 수정)
  - train: 43,908→29,616 / val: 4,979→3,363 / test: 4,979→3,363
- **v3 모델 학습 결과**: val_acc=96.25%, test_acc=95.81% (v2 대비 +1.4%p)
- ONNX 변환 + API 서버 배포 완료

### 4. 툴팁 클릭 고정 UX 수정
- **파일**: `apps/extension/lib/converter.ts`
- **문제**: `showTooltip()`이 `hideTooltipNow()` 호출 → `pinnedTooltip = false` 리셋
- **수정**:
  - `showTooltip()`에 고정 상태 보호 로직 추가 (고정 중이면 hover로 풀리지 않음)
  - 클릭 핸들러에서 다른 단어 클릭 시 기존 고정 해제 후 새 단어 고정
- 빌드 확인 완료

## 서버 상태 (jinserver)

### WSD API 서버
- 포트 8079, FastAPI + ONNX Runtime
- 모델: v3 (561 단어, kcbert-base, test_acc=95.81%)
- 엔드포인트: `POST /wsd` body: `{"words": ["경기"]}`

### 파일 위치
- 모델: `/home/jinwoo/wsd-data/model_v3/best_model.pt`
- ONNX: `/home/jinwoo/wsd-data/onnx/` (v3 배포됨, v2 백업 있음)
- 데이터셋: `/home/jinwoo/wsd-data/dataset/` (v2 백업 *_v2_backup.*)

## 다음 작업 (우선순위순)

### 1. 툴팁 클릭 고정 테스트
- 크롬 확장 리로드 후 클릭 고정/해제 동작 확인 필요
- 안 되면 크롬 완전 종료 후 재시작

### 2. 클로즈 베타 준비
- 형이 "이제 슬슬 클로즈 베타 준비해도 되겠어"라고 언급
- 구체적 태스크는 아직 미정

### 3. 미완료 체크리스트
- ⬜ 확장 프로그램 Supabase 로그인 연동
- ⬜ 진단 테스트 문제 데이터 구축 (급수당 10문제)
- ⬜ 마이페이지 (단어장, 계정 설정)
- ⬜ 반응형 디자인 + SEO 메타 태그
- ⬜ 배포 (Docker, SSL, 웹 스토어)

## 주의사항
- 한국어로 응답할 것
- SSH 작업은 직접 실행 (jinserver: `ssh jinwoo@100.68.25.79`)
- 확장 변경 후 크롬 완전 종료→재시작 필요할 수 있음
