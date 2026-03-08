# 세션 16 핸드오프

## 완료 작업

### 회원가입/로그인 시스템
- 서버 액션: `apps/web/lib/auth/actions.ts` (signup, login, logout)
- 미들웨어: `apps/web/middleware.ts` + `lib/supabase/middleware.ts`
- 이메일 확인 콜백: `apps/web/app/auth/callback/route.ts`
- 회원가입: `apps/web/app/signup/page.tsx` (닉네임/이메일/비번 + 약관동의 3개)
- 로그인: `apps/web/app/login/page.tsx`
- 로그아웃: `apps/web/components/landing/logout-button.tsx`
- 비밀번호: 10자+, 대문자1+, 소문자1+, 특수문자1+
- 네비바: 로그인 링크 추가, 로그인 시 이메일+로그아웃 표시

### 진단 테스트 수정
- 누락 파일 커밋 완료 (page.tsx, diagnostic.ts, components/test/, diagnostic-questions.json)
- "그만하기" → 메인(`/`)으로 이동 (인트로 화면 제거)
- `/test` 직접 접속 → level 없으면 메인 리다이렉트

### 개발 환경
- 포트: 3500 (`-p 3500 -H 0.0.0.0`)
- jinserver에서 운영, `allowedDevOrigins: ["100.68.25.79", "192.168.0.25"]`
- `apps/web/.env.local` → 모노레포 루트 `.env.local` 심볼릭 링크

## jinserver 개발서버 시작 방법
```bash
ssh jinserver
export PATH="/home/jinwoo/.npm-global/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"
cd ~/development/hanjahanja
fuser -k 3500/tcp  # 기존 프로세스 종료
nohup pnpm --filter web dev > /tmp/web-dev.log 2>&1 &
```

## 다음 작업 (우선순위순)

### 1. Gemini 합성 데이터 확인 (jinserver)
```bash
ssh jinserver
ls ~/wsd-data/synthetic/gemini_output/ | wc -l  # 400이면 완료
```
- 완료 시 → 로컬 Claude 결과(`/tmp/wsd_synthetic/`)와 병합 → `train.jsonl`에 추가

### 2. WSD v3 재학습
- 합성 데이터 병합 후 jinserver에서 `train_wsd.py` 재실행
- ONNX 변환 → API 서버 교체

### 3. 미완료 체크리스트
- ⬜ 확장 프로그램 Supabase 로그인 연동
- ⬜ 진단 테스트 문제 데이터 구축 (급수당 10문제)
- ⬜ 마이페이지 (단어장, 계정 설정)
- ⬜ 반응형 디자인 + SEO 메타 태그
- ⬜ 배포 (Docker, SSL, 웹 스토어)

## 주의사항
- 한국어로 응답할 것
- SSH 작업은 직접 실행 (형에게 명령어 전달 X)
- jinserver SSH: `ssh jinserver` (Tailscale), pnpm 경로: `/home/jinwoo/.npm-global/bin/pnpm`
