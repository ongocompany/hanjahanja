# 한자한자 워크로그

## 2025-03-03

### 세션 1: 프로젝트 초기 세팅
- CLAUDE.md 생성 및 AI 페르소나(한철) 추가
- pnpm 모노레포 구조 세팅 (root, pnpm-workspace.yaml)
- **apps/web**: Next.js 15 + Tailwind CSS v4 + Supabase SSR 클라이언트 → 빌드 확인 ✅
- **apps/extension**: WXT + React 19 (popup, content, background) → 빌드 확인 ✅
- **packages/shared**: 한자/사용자 타입 정의, 급수 상수
- **scripts/**: 데이터 파이프라인 스크립트 6개 placeholder
- 배포 설정: Dockerfile, docker-compose.yml, nginx.conf
- .env.example, .gitignore, Git 초기화
- docs 정리: 기획서/계획서 → docs/ 이동
- CLAUDE.md 경량화 (130줄→42줄), 상세 내용 docs/로 분리
- 개발 환경 문서화 (docs/dev-environment.md)

**현재 상태**: 기본 세팅 완료, Git 미커밋, 다음 작업 대기 중

## 2025-03-04

### 세션 2: Supabase 스키마 생성
- `supabase/migrations/001_initial_schema.sql` 작성
  - 6개 테이블: profiles, hanja_characters, hanja_words, user_vocabulary, diagnostic_questions, diagnostic_results
  - RLS 정책: 사용자별 접근 제어 + 사전/문제 데이터는 비로그인도 읽기 허용
  - 트리거: 신규 유저 profiles 자동 생성, updated_at 자동 갱신
  - 개발계획서 대비 개선: current_level/target_level을 NUMERIC(3,1)로 변경 (준급 지원)

**현재 상태**: SQL 파일 생성 완료, 형이 Supabase Dashboard에서 실행 필요 + .env.local 설정 필요
