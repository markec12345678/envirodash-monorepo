# EnviroDash Monorepo

**Real-time Environmental Monitoring Platform** — air quality, wildfires, tsunamis, volcanoes, glaciers and 120+ climate indicators on an interactive 3D map.

## 🏗️ Architecture

This is a **Turborepo + Bun workspaces monorepo** where each of the 867+ monitor panels is an independent npm package that can be:
- Developed in isolation
- Built independently
- Published to npm as `@envirodash/monitor-*`
- Installed as plugins in any EnviroDash instance

```
envirodash-monorepo/
├── apps/
│   └── web/                          # Main Next.js 16 app
├── packages/
│   ├── core/                         # Shared types, utilities, map client
│   └── ui/                           # Shared shadcn/ui components
└── monitors/                         # 867+ independent monitor packages
    ├── air-quality/                  # Real data (Open-Meteo Air Quality API)
    ├── wildfire/                     # Real data (Open-Meteo Fire Weather)
    ├── tsunami/                      # Real data (NOAA NTWC feed)
    ├── volcano/                      # Real data (USGS Volcano API)
    ├── earthquake/                   # Real data (USGS Earthquake API)
    ├── glacier/                      # Demo data (SAMPLE_LOCATIONS)
    ├── office-supply-chain/          # Demo data
    └── ... (861 more)
```

## 🚀 Quick Start

```bash
# Install all workspace dependencies
bun install

# Run the web app in development
bun run dev:web

# Build everything
bun run build

# Build only the web app
bun run build:web
```

## 📦 Adding a New Monitor

```bash
mkdir -p monitors/my-new-monitor/src
cd monitors/my-new-monitor
# Create package.json, manifest.json, and src/MyNewMonitor.tsx
```

Each monitor package follows this structure:
- `package.json` — npm package metadata (`@envirodash/monitor-<name>`)
- `manifest.json` — EnviroDash metadata (category, icon, data source, free/pro)
- `src/` — React component(s) and API client
- `README.md` — Documentation

## 🌍 Real Data Sources

| Monitor | API | Status |
|---|---|---|
| Air Quality | Open-Meteo Air Quality (CAMS) | ✅ Real |
| Wildfire (FWI) | Open-Meteo Forecast | ✅ Real |
| Tsunami | NOAA NTWC RSS | ✅ Real |
| Volcano | USGS Volcano Hazards | ✅ Real |
| Earthquake | USGS Earthquake Hazards | ✅ Real |
| Weather | Open-Meteo Forecast | ✅ Real |
| Glacier | GLIMS database | 🚧 Planned |
| Coral Reef | NOAA Coral Reef Watch | 🚧 Planned |
| ... 800+ others | Demo data (SAMPLE_LOCATIONS) | 📋 Demo |

## 📄 License

MIT — see [LICENSE](LICENSE)
