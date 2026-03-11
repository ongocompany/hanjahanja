# 개발 환경 (서버 구성)

## 역할 분담

```
GitHub (소스 관리) ←→ jinserver (개발/빌드/테스트) ──→ VPS (배포)
```

| 역할 | 서버 | 접속 |
|------|------|------|
| 소스 관리 | GitHub | https://github.com/ongocompany/hanjahanja.git |
| 개발/빌드 | jinserver (집 리눅스) | ssh jinwoo@100.68.25.79 (Tailscale) |
| 배포 | VPS (Vultr) | 158.247.225.152 / hanjahanja.co.kr |
| 백업 | NAS | 100.115.194.12 (Tailscale) |

## jinserver (메인 개발 서버)
- **IP**: 100.68.25.79 (Tailscale)
- **유저**: jinwoo
- **SSH**: 맥북 키 등록 완료
- **Node**: v22.22.0
- **OS**: Ubuntu 24.04 (Linux 6.17)
- **도구**: http://100.68.25.79:8787 (사전 뷰어)

## VPS (Vultr) - 배포 전용
- **IP**: 158.247.225.152
- **도메인**: hanjahanja.co.kr
- **스펙**: 4 CPU / 8GB RAM (Ubuntu 24.04)
- **구성**: Docker + Nginx 리버스 프록시 (3100→3000)
- **SSL**: Cloudflare Flexible 모드 (Cloudflare↔사용자: HTTPS, Cloudflare↔VPS: HTTP)
- **프로젝트 경로**: /root/hanjahanja
- **SSH 키**: GitHub 배포용 등록 완료 (ed25519, hanjahanja-vps)

## 맥북 (로컬)
- **Node**: v24.13.1
- **pnpm**: v10.30.3
- 보조 개발용 (jinserver가 메인)

## 참고
- sudo 필요시 형(진)에게 비밀번호 요청
