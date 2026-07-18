# EnviroDash Alerts WebSocket Service
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Copy package files
COPY mini-services/alerts-ws/package.json mini-services/alerts-ws/bun.lock ./
RUN bun install --production

# Copy source
COPY mini-services/alerts-ws/src ./src

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

CMD ["bun", "src/index.ts"]
