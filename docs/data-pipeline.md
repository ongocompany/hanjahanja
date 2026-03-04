# 데이터 파이프라인 & 환경 변수

## 데이터 흐름

1. PM의 개별 한자 CSV → hanja_characters 테이블
2. 우리말샘 XML → 한자어 추출 → hanja_words 테이블
3. 급수 교차 매칭 (hanja_characters × 우리말샘 데이터)
4. 국립국어원 API로 부족 데이터 보완
5. hanja_words → 급수별 JSON 사전 → 크롬 확장 번들

## 환경 변수

```
# .env.local (웹)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# .env (크롬 확장)
WXT_SUPABASE_URL=
WXT_SUPABASE_ANON_KEY=

# 데이터 구축용
NIKL_API_KEY=
KRDICT_API_KEY=
OPENAI_API_KEY=
```

## 스크립트 명령어

```bash
pnpm --filter scripts import-characters  # PM CSV → DB
pnpm --filter scripts parse-urimalsaem   # 우리말샘 XML 파싱
pnpm --filter scripts build-words        # 급수 교차 매칭
pnpm --filter scripts supplement-api     # 국립국어원 API 보완
pnpm --filter scripts enrich-ai          # AI 데이터 보강
pnpm --filter scripts generate-dict      # 급수별 JSON 사전 생성
```

## 배포

- Vultr 서버: Docker + Nginx (포트 3100→3000)
- 도메인: hanjahanja.kr
- SSL: Let's Encrypt
