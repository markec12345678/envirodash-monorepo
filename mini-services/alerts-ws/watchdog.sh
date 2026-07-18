#!/bin/bash
# Watchdog for EnviroDash alerts WebSocket service
LOG_FILE="/tmp/alerts-ws.log"
MAX_RESTARTS=20
PORT=3003

cd /home/z/my-project/monorepo/mini-services/alerts-ws

pkill -9 -f "alerts-ws" 2>/dev/null
pkill -f "bun src/index.ts" 2>/dev/null
sleep 2

for i in $(seq 1 $MAX_RESTARTS); do
  echo "[$(date)] Starting alerts-ws (attempt $i/$MAX_RESTARTS)..." >> "$LOG_FILE"
  bun src/index.ts >> "$LOG_FILE" 2>&1
  echo "[$(date)] Service exited with code $? (attempt $i)" >> "$LOG_FILE"
  sleep 3
done
