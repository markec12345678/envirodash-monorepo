#!/bin/bash
# Watchdog for EnviroDash monorepo web dev server
LOG_FILE="/tmp/web-dev.log"
MAX_RESTARTS=20
PORT=3000

cd /home/z/my-project/monorepo/apps/web

pkill -9 -f "next dev" 2>/dev/null
sleep 2

for i in $(seq 1 $MAX_RESTARTS); do
  echo "[$(date)] Starting web dev (attempt $i/$MAX_RESTARTS)..." >> "$LOG_FILE"
  NODE_OPTIONS="--max-old-space-size=1024" \
    node node_modules/.bin/next dev -p $PORT --turbopack >> "$LOG_FILE" 2>&1
  echo "[$(date)] Server exited with code $? (attempt $i)" >> "$LOG_FILE"
  sleep 3
done
