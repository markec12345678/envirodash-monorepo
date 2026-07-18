# EnviroDash Mobile 📱

**Real-time environmental monitoring on the go** — built with Expo + React Native.

## Features

- 🌍 **Dashboard** with real-time air quality, wildfires, earthquakes, tsunami, and drought data
- 📊 **Monitors** screen with all 10 real-data monitors (air-quality, wildfire, tsunami, volcano, earthquake, weather, glacier, coral-reef, flood, drought)
- ✨ **AI Assistant** with natural-language queries (powered by ZAI SDK)
- 📦 **Marketplace** with 874+ monitor packages (10 real + 864 demo)
- 👤 **Profile** with sign-in, GitHub link, and data source attribution

## Architecture

The mobile app shares code with the web app via the `@envirodash/core` package and calls the same REST APIs hosted by `apps/web`.

```
apps/mobile/
├── src/
│   ├── App.tsx                 # Root component with bottom tab navigator
│   ├── api/
│   │   └── client.ts           # REST API client (calls apps/web)
│   └── screens/
│       ├── DashboardScreen.tsx # Real-time summary cards
│       ├── MonitorsScreen.tsx  # 10 monitor tabs with location lists
│       ├── AIScreen.tsx        # Chat with EnviroDash AI
│       ├── MarketplaceScreen.tsx # Browse 874 monitors
│       └── ProfileScreen.tsx   # Settings and info
├── app.json                    # Expo config
├── package.json
└── tsconfig.json
```

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS/Android) OR an emulator

### Install & Run

```bash
# From the monorepo root, install all workspace dependencies
cd /home/z/my-project/monorepo
bun install

# Start the web API server first (the mobile app calls it)
bun run dev:web

# In a separate terminal, start the mobile app
cd apps/mobile
bun run dev
```

This opens the Expo dev server. Scan the QR code with Expo Go (iOS/Android) to run the app on your phone.

### Build for Production

```bash
# Android APK
eas build -p android --profile preview

# iOS (requires Apple Developer account)
eas build -p ios --profile production
```

## Configuration

Set the API URL in `app.json` under `expo.extra.envirodashApiUrl`:

```json
{
  "expo": {
    "extra": {
      "envirodashApiUrl": "https://your-deployed-api.com"
    }
  }
}
```

Also update `src/api/client.ts` to read this value (currently hardcoded to `http://localhost:3000`).

## Permissions

- **Location** (optional): for showing nearby environmental data
- **Notifications** (optional): for push alerts on critical environmental events

## Sharing Code with Web

Both `apps/web` and `apps/mobile` depend on `@envirodash/core` for:
- `MonitorLocation`, `MonitorStatus`, `MonitorManifest`, `MonitorDataResponse` types
- `fetchJson` API client helper
- `aqiToStatus`, `fwiToStatus` status calculators
- `STATUS_COLORS`, `STATUS_LABELS_EN` constants

The mobile app calls the same REST endpoints as the web app:
- `/api/air-quality`, `/api/wildfire`, `/api/tsunami`, `/api/volcano`, `/api/earthquake`
- `/api/weather`, `/api/glacier`, `/api/coral-reef`, `/api/flood`, `/api/drought`
- `/api/ai-chat`, `/api/marketplace`, `/api/user/monitors`

## License

MIT — see [LICENSE](../../LICENSE) in the monorepo root.
