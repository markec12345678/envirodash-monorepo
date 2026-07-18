# 🌍 EnviroDash — Real-time Environmental Monitoring Platform

> **867 monitor packages · 10 real-time data sources · 7 languages · Web + Mobile + PWA**

[![CI](https://github.com/markec12345678/envirodash-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/markec12345678/envirodash-monorepo/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React Native](https://img.shields.io/badge/React%20Native-0.76-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Bun](https://img.shields.io/badge/Bun-1.3-fbf2e8?logo=bun)
![License](https://img.shields.io/badge/License-MIT-green)

EnviroDash is a production-ready, real-time environmental monitoring platform built as a **Turborepo monorepo**. It aggregates data from Open-Meteo, NOAA, and USGS to provide live air quality, wildfire risk, earthquake, tsunami, volcano, weather, glacier, coral reef, flood, and drought monitoring — with AI-powered natural-language queries, satellite imagery analysis, and multi-channel alerting.

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Real-time Data Sources](#-real-time-data-sources)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🌍 Real-time Environmental Monitoring (10 data sources)

| Monitor | Data Source | Coverage | Update Frequency |
|---|---|---|---|
| **Air Quality** | Open-Meteo Air Quality (CAMS) | Global (~10km) | Hourly |
| **Wildfire Risk** | Open-Meteo Forecast (FWI proxy) | Europe, California, Australia | Hourly |
| **Earthquakes** | USGS Earthquake Hazards | Global (M2.5+) | Real-time |
| **Tsunami** | NOAA NTWC RSS | Global | Real-time |
| **Volcano** | USGS Volcano Hazards | Global | Real-time |
| **Weather** | Open-Meteo Forecast | Global | Hourly |
| **Glacier** | Open-Meteo Forecast (snowfall/temp) | 12 major glaciers | Hourly |
| **Coral Reef** | Open-Meteo Marine (SST) | 10 major reefs | Hourly |
| **Flood Risk** | Open-Meteo Forecast (precip) | 14 river basins | Hourly |
| **Drought** | Open-Meteo Forecast (soil moisture) | 14 regions (D0-D4) | Hourly |

### 🤖 AI Features

- **Natural-language AI Assistant** — Ask "Kakšna je kakovost zraka v Ljubljani?" and the AI opens the right monitor
- **AI Vision (VLM)** — Upload satellite imagery for AI-powered wildfire, volcano, flood, glacier, and coral reef analysis
- Powered by ZAI SDK (`z-ai-web-dev-sdk`)

### 🔔 Multi-channel Alerting

| Channel | Mechanism | Use Case |
|---|---|---|
| **WebSocket** | Socket.IO (port 3003) | Real-time in-browser alerts |
| **Push Notifications** | Expo Push API | Mobile device alerts |
| **Email** | Nodemailer (any SMTP) | Critical alert emails with HTML template |
| **Webhooks** | HMAC-SHA256 signed POST | Slack, IFTTT, Zapier, custom integrations |
| **Desktop Notifications** | Browser Notification API | OS-level notifications |
| **Geofence Alerts** | Per-location thresholds | "Notify when AQI > 100 in Ljubljana" |

### 📊 Data & Analytics

- **Historical trends** with Recharts visualizations (24h / 7d / 30d)
- **CSV / JSON export** for all monitor types
- **PDF reports** with pdf-lib (2-page A4 environmental summary)
- **Interactive map** with MapLibre GL JS (color-coded status circles)
- **Analytics dashboard** (privacy-first, optional PostHog/Plausible forwarding)
- **Custom dashboards** (per-user monitor selection and ordering)

### 🛠️ Developer Platform

- **REST API v1** with API key authentication (`/api/v1?type=air-quality&country=SI`)
- **Rate limiting** (4 tiers: anonymous 100/h, free 1K/h, pro 10K/h, enterprise 100K/h)
- **API key management** with SHA-256 hashing
- **Marketplace** with 874 monitor packages (10 real + 864 demo)
- **Webhook system** with HMAC signatures and retry logic

### 🌐 Platform & Infrastructure

- **Web app** — Next.js 16 with App Router, Turbopack
- **Mobile app** — Expo + React Native (iOS + Android)
- **PWA** — Installable, offline mode, push notifications, app shortcuts
- **7 languages** — Slovenian (default), English, German, Italian, French, Spanish, Croatian
- **Auth** — NextAuth v4 with multi-tenant support (role, tenantId, plan)
- **Database** — SQLite (dev) / PostgreSQL + PostGIS (production)
- **Docker** — Multi-stage build, docker-compose with health checks
- **CI/CD** — 3 GitHub Actions workflows (CI, deploy, quality)
- **156 tests** — Vitest with 100% pass rate
- **Sentry** — Error tracking with session replay (optional)
- **Real-time chat** — Socket.IO with 11 rooms (global + per-monitor)

---

## 🏗️ Architecture

```
envirodash-monorepo/
├── apps/
│   ├── web/                          # Next.js 16 web app
│   │   ├── src/app/
│   │   │   ├── api/                  # 33 API routes
│   │   │   ├── _components/          # 20 React components
│   │   │   └── page.tsx              # Main dashboard
│   │   ├── prisma/schema.prisma      # Database schema (SQLite/PostgreSQL)
│   │   ├── sentry.{client,server,edge}.config.ts
│   │   └── Dockerfile
│   └── mobile/                       # Expo + React Native
│       ├── src/screens/              # 5 screens (Dashboard, Monitors, AI, Marketplace, Profile)
│       └── src/api/client.ts         # REST API client
├── packages/
│   └── core/                         # @envirodash/core (shared types, utilities)
├── monitors/                         # 874 monitor packages
│   ├── air-quality/                  # ✅ Real (Open-Meteo AQ)
│   ├── wildfire/                     # ✅ Real (Open-Meteo FWI)
│   ├── tsunami/                      # ✅ Real (NOAA NTWC)
│   ├── volcano/                      # ✅ Real (USGS)
│   ├── earthquake/                   # ✅ Real (USGS)
│   ├── weather/                      # ✅ Real (Open-Meteo)
│   ├── glacier/                      # ✅ Real (Open-Meteo)
│   ├── coral-reef/                   # ✅ Real (Open-Meteo Marine)
│   ├── flood/                        # ✅ Real (Open-Meteo)
│   ├── drought/                      # ✅ Real (Open-Meteo)
│   └── ... 864 demo monitors
├── mini-services/
│   ├── alerts-ws/                    # WebSocket alerts (port 3003)
│   └── chat-ws/                      # Real-time chat (port 3004)
├── scripts/
│   ├── deploy.sh                     # Docker deployment
│   ├── watchdog-web.sh              # Auto-restart web server
│   └── generate-demo-monitors.py    # Generate demo monitor packages
├── .github/workflows/
│   ├── ci.yml                        # Lint + typecheck + test + build
│   ├── deploy.yml                    # Production deployment
│   └── quality.yml                   # Security audit + bundle size
├── docker-compose.yml                # Web + alerts-ws + optional PostgreSQL
├── Dockerfile                        # Multi-stage production build
├── turbo.json                        # Turborepo build orchestration
├── vitest.config.ts                  # Test configuration
└── package.json                      # Bun workspaces root
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ or **Bun** 1.3+
- **MapTiler API key** (free at [cloud.maptiler.com](https://cloud.maptiler.com/))

### 1. Clone & Install

```bash
git clone https://github.com/markec12345678/envirodash-monorepo.git
cd envirodash-monorepo
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env:
#   NEXT_PUBLIC_MAPTILER_KEY=your_key_here
#   NEXTAUTH_SECRET=openssl rand -base64 32
#   DATABASE_URL=file:./db/envirodash.db
```

### 3. Run Development

```bash
# Start web app (port 3000)
bun run dev:web

# Start alerts WebSocket (port 3003) — in another terminal
cd mini-services/alerts-ws && bun run dev

# Start chat WebSocket (port 3004) — in another terminal
cd mini-services/chat-ws && bun run dev

# Start mobile app — in another terminal
cd apps/mobile && bun run dev
```

### 4. Production (Docker)

```bash
# Build and start all services
./scripts/deploy.sh

# Or manually:
docker compose up -d --build
```

### Demo Credentials

```
Email:    demo@envirodash.si
Password: envirodash
```

---

## 🌍 Real-time Data Sources

| Source | Data | URL |
|---|---|---|
| **Open-Meteo** | Weather, Air Quality, Fire Weather, Marine, Soil Moisture | [open-meteo.com](https://open-meteo.com) |
| **USGS** | Earthquakes (M2.5+, 24h), Volcano alerts | [earthquake.usgs.gov](https://earthquake.usgs.gov) |
| **NOAA** | Tsunami warnings (NTWC + PTWC) | [tsunami.gov](https://www.tsunami.gov) |

All data sources are **free** and require **no API key**.

---

## 📡 API Reference

### Public API (no auth required)

| Endpoint | Method | Description |
|---|---|---|
| `/api/air-quality` | GET | Air quality (PM2.5, AQI) — `?country=SI` or `?lat=&lng=` |
| `/api/wildfire` | GET | Fire Weather Index — `?area=europe` |
| `/api/earthquake` | GET | Recent earthquakes — `?minMagnitude=5&limit=20` |
| `/api/tsunami` | GET | Active tsunami warnings |
| `/api/volcano` | GET | USGS volcano alerts |
| `/api/weather` | GET | Current weather — `?lat=46.05&lng=14.50` |
| `/api/glacier` | GET | Glacier conditions — `?region=alps` |
| `/api/coral-reef` | GET | Coral reef SST — `?region=pacific` |
| `/api/flood` | GET | Flood risk — `?region=europe` |
| `/api/drought` | GET | Drought severity — `?region=slovenia` |
| `/api/map/locations` | GET | Aggregated GeoJSON for map |
| `/api/marketplace` | GET | Browse 874 monitor packages |
| `/api/air-quality/history` | GET | Historical AQI (24h / 7d) |
| `/api/weather/history` | GET | Historical weather (24h / 7d) |
| `/api/export` | GET | CSV/JSON export — `?format=csv&type=air-quality` |
| `/api/report` | GET | PDF report download |
| `/api/health` | GET | Health check |
| `/api/analytics` | GET/POST | Analytics tracking and summary |

### Authenticated API (NextAuth session)

| Endpoint | Method | Description |
|---|---|---|
| `/api/user` | GET | Current session info |
| `/api/user/monitors` | GET/POST/DELETE | Installed monitors |
| `/api/user/geofences` | GET/POST/DELETE | Geofence management |
| `/api/user/dashboard` | GET/POST/DELETE | Custom dashboard config |
| `/api/user/api-keys` | GET/POST/DELETE | API key management |
| `/api/user/webhooks` | GET/POST/DELETE/PATCH | Webhook management |
| `/api/user/email-subscriptions` | GET/POST/DELETE/PATCH | Email alert subscriptions |
| `/api/user/push-tokens` | GET/POST/DELETE/PATCH | Mobile push token management |

### Developer API (API key required)

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1` | GET | REST API — `?type=air-quality&country=SI` |

```bash
curl -H "Authorization: Bearer ed_live_xxx" \
  "http://localhost:3000/api/v1?type=earthquake&limit=10"
```

### AI Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/ai-chat` | POST | Natural-language environmental queries |
| `/api/vision` | POST | Satellite imagery analysis (VLM) |

---

## 🚢 Deployment

### Docker (recommended)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your MapTiler key, NextAuth secret, etc.

# 2. Build and start
./scripts/deploy.sh

# 3. Verify
curl http://localhost:3000/api/health
```

### With PostgreSQL (production)

1. Uncomment `db` service in `docker-compose.yml`
2. Change `DATABASE_URL` to `postgresql://...`
3. Change provider in `prisma/schema.prisma` to `postgresql`
4. Run `bun run db:push`

### Services

| Service | Port | Description |
|---|---|---|
| Web (Next.js) | 3000 | Main web application |
| Alerts WS (Socket.IO) | 3003 | Real-time environmental alerts |
| Chat WS (Socket.IO) | 3004 | Community chat |
| PostgreSQL (optional) | 5432 | Production database |

---

## 🧪 Testing

```bash
# Run all tests
bun test

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage

# UI mode
bun run test:ui
```

**156 tests, 100% pass rate, 87ms runtime**

Test files:
- `packages/core/src/__tests__/api-client.test.ts` — Status calculation, colors, labels
- `apps/web/src/__tests__/i18n.test.ts` — 7-language translation completeness
- `apps/web/src/__tests__/i18n-completeness.test.ts` — 42 required keys in all languages
- `apps/web/src/__tests__/monitors.test.ts` — Monitor manifest validation

---

## 🌐 Languages

| Code | Language | Flag |
|---|---|---|
| `sl` | Slovenščina (default) | 🇸🇮 |
| `en` | English | 🇬🇧 |
| `de` | Deutsch | 🇩🇪 |
| `it` | Italiano | 🇮🇹 |
| `fr` | Français | 🇫🇷 |
| `es` | Español | 🇪🇸 |
| `hr` | Hrvatski | 🇭🇷 |

---

## 📊 Monitor Categories

| Category | Count | Examples |
|---|---|---|
| Other | 198 | AbyssalSedimentFlux, ContinentalDrift |
| Retail | 100 | BakeryPastryShop, ElectronicsRetail |
| Oceanic | 90 | CoralBleaching, MangroveRestoration |
| Industrial | 85 | AutomobileAssemblyPlant, AluminumSmelter |
| Climate | 67 | PermafrostThaw, IceSheetVelocity |
| Services | 65 | HospitalCafe, BankBranch |
| Infrastructure | 62 | PowerGridLoad, EvChargingNetwork |
| Atmospheric | 45 | AirPollution, OzoneLayer |
| Hydrology | 40 | AquiferDepletion, WatershedPollution |
| Recreation | 30 | ThemeParkQueue, GolfTournament |
| Geological | 29 | VolcanoThermal, FaultLineActivity |
| Weather | 21 | AtmosphericRiver, JetStream |
| Vegetation | 14 | CropHealth, SoilPhosphorus |
| Wildlife | 13 | BirdMigration, WhaleMigration |
| Disaster | 5 | Wildfire, Tsunami, Earthquake, Flood, Drought |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `bun test`
4. Commit with conventional commits
5. Open a Pull Request against `main`

### Adding a New Monitor

```bash
mkdir -p monitors/my-new-monitor/src
```

Create `package.json`, `manifest.json`, `src/api.ts`, and `src/MyNewMonitor.tsx`.

See `monitors/air-quality/` for a reference implementation.

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- [Open-Meteo](https://open-meteo.com/) — Free weather, air quality, and marine APIs
- [USGS](https://www.usgs.gov/) — Earthquake and volcano hazard data
- [NOAA](https://www.noaa.gov/) — Tsunami warning center
- [MapLibre GL JS](https://maplibre.org/) — Open-source map rendering
- [ZAI SDK](https://z.ai) — AI chat and vision capabilities
- [Expo](https://expo.dev/) — Mobile app framework
- [Turborepo](https://turbo.build/) — Monorepo build system
- [Bun](https://bun.sh/) — JavaScript runtime and package manager
