# WSD 자가 개선 파이프라인 설계

## 개요

유저의 동음이의어 교정 → 자동 수집 → 야간 재학습 → 배포
**매일 더 똑똑해지는 WSD 모델**

## 아키텍처

```
[모바일/익스텐션]                    [Supabase]              [jinserver]

유저가 한자 교정  ──→  AsyncStorage  ──→  error_reports  ──→  야간 cron
 (sentence +           /chrome.storage     테이블             ├─ 새 데이터 pull
  word +                                                     ├─ JSONL 변환
  correct_hanja +                                            ├─ 기존 데이터 merge
  wrong_hanja)                                               ├─ 모델 재학습
                                                             ├─ ONNX 변환
                                                             └─ API 서버 재시작
                                                                  ↓
유저가 다음날 사용 ←────────────── 더 정확한 WSD 예측 ←─── 업데이트된 모델
```

## Phase 1: 데이터 수집 (클라이언트)

### 현재 상태
- [x] 모바일: `trackWSDCorrection()` → AsyncStorage 저장
- [x] 모바일: 마침표 기준 문장 추출 (`extractSentence`)
- [x] 익스텐션: `reportError()` → Supabase `error_reports` 직접 저장
- [ ] **모바일: Supabase 동기화 (error_reports에 업로드)**

### 저장 형식 (error_reports 테이블)
```sql
-- 이미 존재: supabase/migrations/005_error_reports.sql
CREATE TABLE error_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  korean_word TEXT NOT NULL,
  predicted_hanja TEXT NOT NULL,    -- WSD가 예측한 한자 (오답)
  correct_hanja TEXT NOT NULL,      -- 유저가 선택한 한자 (정답)
  context_sentence TEXT,            -- 문맥 문장
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 할 일
1. 모바일 sync 모듈: `syncWSDCorrections()` 구현
   - AsyncStorage `hj_wsdCorrections` → Supabase `error_reports` 배치 INSERT
   - 동기화 후 로컬 데이터 삭제
   - 트리거: 앱 포그라운드 진입 시 + 수동 동기화

## Phase 2: 데이터 집계 (서버)

### 목적
- 노이즈 필터링 (잘못된 교정 제거)
- 학습 가능한 JSONL 포맷 변환
- 기존 학습 데이터와 병합

### 신뢰도 기준
```
단순 신뢰:
- 같은 (word, sentence, correct_hanja) 조합이 2명 이상 → 신뢰
- 1명이라도 다수 교정 이력(10건+) 있으면 → 개인 신뢰

초기 (유저 적을 때):
- 모든 교정 데이터 수용 (노이즈 감수)
- 단, 같은 단어에 대해 서로 다른 교정이 있으면 → 다수결
```

### JSONL 변환
```json
{
  "sentence": "4시부터 회의중이라서 늦을 것 같습니다.",
  "word": "회의",
  "scode": "01",
  "label": 0,
  "num_senses": 2,
  "source": "user_correction",
  "hanja": "會議"
}
```

### 할 일
1. `scripts/wsd/pull_corrections.py` — Supabase에서 새 교정 데이터 pull
2. `scripts/wsd/convert_corrections.py` — error_reports → JSONL 변환
   - scode 매핑: `wsd_scode_hanja_map.json`에서 hanja → scode 역매핑
   - 기존 label_map.json 참조하여 label 할당
3. 기존 train.jsonl + 새 교정 JSONL → train_augmented.jsonl 병합

## Phase 3: 야간 재학습 (jinserver)

### 재학습 조건
- 새 교정 데이터 **50건 이상** 누적 시 실행
- 최소 재학습 간격: **24시간**
- 기존 데이터 + 새 데이터 전체 재학습 (증분 학습 X → catastrophic forgetting 방지)

### 학습 파라미터 (기존과 동일)
```
모델: beomi/kcbert-base
epochs: 5
batch_size: 32
lr: 2e-5
max_len: 128
warmup: 10%
```

### 새 헤드 자동 추가
- 기존에 없는 단어의 교정이 들어오면 → 새 classification head 자동 생성
- 조건: 해당 단어에 대해 5건 이상의 교정 데이터

### 무중단 배포 (핫 리로드)

> **문제**: 재학습 후 pm2 restart 하면 서빙 중단
> **해결**: API 서버에 `/reload` 엔드포인트 추가 → 모델만 메모리에서 교체

```python
# api_server.py에 추가
@app.post("/reload")
async def reload_model():
    global onnx_session, heads, scode_map
    # 새 모델을 메모리에 로드 (기존 모델은 유지)
    new_session = ort.InferenceSession("wsd_encoder_int8_new.onnx")
    new_heads = json.load(open("wsd_heads_new.json"))
    # 원자적 교체 (요청 처리 중에도 안전)
    onnx_session = new_session
    heads = new_heads
    return {"status": "reloaded", "heads": len(heads)}
```

- ONNX 세션 + heads.json 교체: **~2초**
- 교체 중 들어온 요청은 **기존 모델로 처리** (중단 없음)
- 나중에 유저 수만 명 되면 블루-그린 배포(포트 스위칭)로 전환

### 할 일
1. `scripts/wsd/nightly_retrain.sh` — 야간 재학습 스크립트
   ```bash
   # 1. 새 데이터 pull
   python pull_corrections.py
   # 2. JSONL 변환 + 병합
   python convert_corrections.py
   # 3. 재학습 (새 데이터 있을 때만)
   python train_wsd.py --data train_augmented.jsonl
   # 4. ONNX 변환 → _new 파일로 저장
   python export_onnx.py --suffix _new
   # 5. 핫 리로드 (무중단)
   curl -X POST http://localhost:8079/reload
   # 6. 새 파일을 현재 파일로 교체 (다음 cold start 대비)
   mv wsd_encoder_int8_new.onnx wsd_encoder_int8.onnx
   mv wsd_heads_new.json wsd_heads.json
   ```
2. `api_server.py`에 `/reload` 엔드포인트 추가
3. crontab 등록: `0 3 * * * /home/jinwoo/wsd-data/nightly_retrain.sh`
4. 학습 로그 + 정확도 기록 (이전 대비 비교)

## Phase 4: 배포 & 모니터링

### 자동 배포 (Phase 3에 포함)
- ONNX 파일 교체 → pm2 restart
- 클라이언트 업데이트 불필요 (모델은 서버에만 존재)

### 롤백
- 이전 모델 백업: `model_v{N-1}/` 디렉토리 유지
- 정확도가 이전보다 2%+ 하락 시 → 자동 롤백 + 알림

### 모니터링 대시보드 (나중에)
- 일별 교정 건수
- 단어별 오분류 빈도
- 모델 버전별 정확도 추이
- 신규 헤드 추가 이력

### 할 일
1. 모델 버전 관리 (v3 → v4 → ...)
2. 정확도 비교 자동화 (test.jsonl 기준)
3. 롤백 조건 + 자동 롤백 스크립트

---

## 구현 우선순위 체크리스트

### 즉시 (Phase 1 - 데이터 파이프라인 연결)
- [ ] 모바일 `syncWSDCorrections()` 구현 (tracker.ts → Supabase)
- [ ] 앱 포그라운드 복귀 시 자동 동기화 훅
- [ ] 동기화 성공 후 로컬 데이터 클리어

### 단기 (Phase 2 - 서버 집계)
- [ ] `pull_corrections.py` — Supabase → 로컬 JSONL
- [ ] `convert_corrections.py` — hanja → scode 역매핑 + label 할당
- [ ] 기존 train.jsonl과 병합 로직

### 중기 (Phase 3 - 자동 재학습)
- [ ] `nightly_retrain.sh` 통합 스크립트
- [ ] crontab 등록 (매일 새벽 3시)
- [ ] 학습 전후 정확도 비교 로깅
- [ ] 새 단어 헤드 자동 추가 로직

### 장기 (Phase 4 - 안정화)
- [ ] 모델 버전 관리 + 자동 롤백
- [ ] 모니터링 대시보드 (Grafana or 웹)
- [ ] 다수결 투표 기반 노이즈 필터링
- [ ] 익스텐션에도 동일한 WSD 교정 수집 강화
