#!/bin/bash
# VPS 배포 스크립트 (hanjahanja.co.kr)
# 사용: ./scripts/deploy-vps.sh

set -e

VPS="vps"
REMOTE_DIR="/home/linuxuser/hanjahanja"
WEB_DIR="$REMOTE_DIR/apps/web"

echo "=== 1. VPS에서 git pull ==="
ssh $VPS "cd $REMOTE_DIR && git pull"

echo "=== 2. 의존성 설치 ==="
ssh $VPS "cd $REMOTE_DIR && pnpm install --frozen-lockfile"

echo "=== 3. Next.js 빌드 ==="
ssh $VPS "cd $WEB_DIR && pnpm build"

echo "=== 4. standalone에 static + public 복사 ==="
ssh $VPS "cp -r $WEB_DIR/.next/static $WEB_DIR/.next/standalone/apps/web/.next/static"
ssh $VPS "cp -r $WEB_DIR/public $WEB_DIR/.next/standalone/apps/web/public"

echo "=== 5. pm2 재시작 ==="
ssh $VPS "pm2 restart hanjahanja-web"

echo "=== 6. 헬스체크 ==="
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://hanjahanja.co.kr/)
if [ "$STATUS" = "200" ]; then
  echo "✅ 배포 완료! (HTTP $STATUS)"
else
  echo "⚠️ 응답 코드: $STATUS — pm2 로그 확인 필요"
  ssh $VPS "pm2 logs hanjahanja-web --lines 10 --nostream"
fi
