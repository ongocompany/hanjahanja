# 코딩 컨벤션 상세

## 일반 규칙
- TypeScript 사용, strict 모드 활성화
- 함수형 컴포넌트 + React hooks 사용
- 네이밍: 컴포넌트는 PascalCase, 함수/변수는 camelCase, 상수는 UPPER_SNAKE_CASE
- 파일명: 컴포넌트는 PascalCase.tsx, 유틸리티는 camelCase.ts
- 한글 주석 사용 (한국어 프로젝트)

## Next.js (apps/web)
- App Router 사용 (pages 디렉토리 사용하지 않음)
- 서버 컴포넌트 우선, 필요한 경우만 'use client' 사용
- Supabase 클라이언트: 브라우저용(client.ts)과 서버용(server.ts) 분리
- shadcn/ui 컴포넌트는 components/ui/ 디렉토리에 배치

## 크롬 확장 (apps/extension)
- WXT Framework 사용 (Manifest V3)
- Content Script: 한자 변환 핵심 로직
- Background Script: 인증 상태 관리, API 호출
- Popup: 설정 패널 UI
- 사전 JSON은 assets/dict/ 에 급수별로 분리

## Supabase
- RLS(Row Level Security) 항상 활성화
- 사용자 데이터는 반드시 user_id 기반 접근 제어
- 환경 변수로 키 관리 (.env.local)
