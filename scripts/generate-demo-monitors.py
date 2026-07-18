#!/usr/bin/env python3
"""
Generate demo monitor packages from the original mototracklatest monitors.

For each of the 867 monitors in /home/z/my-project/repos/mototracklatest/src/components/map/*Monitor.tsx,
this script creates a lightweight demo package in /home/z/my-project/monorepo/monitors/<name>/ with:
  - package.json  (depends on @envirodash/core)
  - manifest.json (with realData=false, category derived from monitor name)
  - src/<Name>Monitor.tsx  (re-exports a generic DemoMonitor component)

The original ~213-line *Monitor.tsx files are NOT copied — instead each demo package
contains a thin wrapper around <DemoMonitor name="..." />, keeping the monorepo small
(~5KB per monitor vs ~6KB per monitor original) while preserving the manifest metadata
needed for the marketplace UI.

Usage:
  python3 scripts/generate-demo-monitors.py
"""

import json
import os
import re
from pathlib import Path

SRC_DIR = Path("/home/z/my-project/repos/mototracklatest/src/components/map")
DEST_DIR = Path("/home/z/my-project/monorepo/monitors")

# Skip monitors we've already created as real-data packages
REAL_MONITORS = {
    "air-quality",
    "wildfire",
    "tsunami",
    "volcano",
    "earthquake",
    "weather",
    "glacier",
    "coral-reef",
    "flood",
    "drought",
}

# Category mapping based on keywords in monitor name
CATEGORY_RULES = [
    (("air", "aqi", "pm25", "pm10", "pollut", "ozone", "co2", "methane", "carbon", "dust", "smog", "aerosol", "atmospheric"), "atmospheric"),
    (("earthquake", "seismic", "tectonic", "fault", "landslide", "rockfall", "subsid", "sinkhole"), "geological"),
    (("volcano", "lava", "magma", "fumarole", "geotherm"), "geological"),
    (("tsunami", "wave", "tide", "coast", "beach", "shore", "erosion"), "oceanic"),
    (("ocean", "sea", "marine", "coral", "reef", "fish", "whale", "shark", "plankton", "kelp", "mangrove", "salt", "brine", "gyre", "current", "thermohaline", "upwell", "eddy", "fjord", "estuar"), "oceanic"),
    (("glacier", "ice", "snow", "permafrost", "cryo", "arctic", "antarctic", "polar", "iceberg", "icecap", "icesheet"), "climate"),
    (("wildfire", "fire", "burn", "flame", "combust", "peat", "biomass"), "disaster"),
    (("flood", "rain", "precip", "storm", "hurricane", "cyclone", "typhoon", "tornado", "weather", "atmospriver", "wind"), "weather"),
    (("drought", "desert", "arid", "sand", "sahara"), "climate"),
    (("river", "stream", "lake", "water", "aquifer", "groundwater", "hydro", "wetland", "watershed", "reservoir"), "hydrology"),
    (("soil", "crop", "farm", "agricult", "harvest", "irrigation", "fertili"), "vegetation"),
    (("forest", "tree", "canopy", "peatland", "biodivers", "habitat", "wildlife", "species", "bird", "migrat", "invasive"), "wildlife"),
    (("military", "army", "navy", "airforce", "defense", "bunker", "missile", "radar", "satellite", "space", "aviation"), "infrastructure"),
    (("power", "grid", "energy", "solar", "wind", "hydroelec", "nuclear", "coal", "gas", "oil", "electric", "charging", "fuel"), "infrastructure"),
    (("mine", "mining", "quarry", "ore", "mineral", "gold", "diamond", "uranium", "coal", "rareearth"), "industrial"),
    (("factory", "plant", "manufact", "assembly", "process", "refinery", "smelter", "mill", "warehouse"), "industrial"),
    (("warehouse", "logistic", "delivery", "shipping", "port", "cargo", "freight", "supply", "cold", "chain"), "infrastructure"),
    (("hospital", "clinic", "medical", "health", "dental", "pharmacy", "vet", "blood", "urgent", "mental", "physical", "chiropr", "optom", "pediatric"), "services"),
    (("school", "academ", "university", "college", "coding", "bootcamp", "tutoring", "language", "music", "test", "learning", "kindergarten", "preschool", "montessori"), "services"),
    (("bank", "insurance", "finance", "invest", "mortgage", "notary", "account", "tax", "law", "real", "estate"), "services"),
    (("restaurant", "cafe", "bar", "pub", "tavern", "dining", "food", "bakery", "pizzeria", "burger", "steak", "grill", "buffet", "catering", "kitchen", "brewery", "winery", "distillery", "coffee", "tea", "chocolate", "candy", "icecream", "frozen", "juice", "smoothie", "bagel", "deli", "butcher", "halal", "kosher"), "retail"),
    (("shop", "store", "boutique", "retail", "market", "grocery", "dealer", "chain", "mart", "supply", "outlet", "boutique"), "retail"),
    (("hotel", "resort", "spa", "motel", "inn", "lodge", "airbnb", "rental", "accommodation"), "services"),
    (("sport", "gym", "fitness", "yoga", "pilates", "barre", "crossfit", "martial", "boxing", "tennis", "golf", "soccer", "baseball", "football", "basketball", "ski", "snowboard", "surf", "kite", "windsurf", "paddle", "kayak", "canoe", "raft", "sail", "marina", "swim", "rink", "skate", "bmx", "skateboard", "trampoline", "axe", "archery", "gun", "polo", "equestrian", "racetrack", "stadium", "arena", "concert", "theater", "cinema", "movie", "music", "amuse", "theme", "park", "waterpark", "zoo", "aquarium", "museum", "gallery", "exhibit", "boardwalk", "boardgame", "escape", "roller", "derby", "discgolf", "gokart", "concert", "festival", "fair", "carnival", "bowling", "laser"), "recreation"),
    (("office", "suppli", "stationery", "paper"), "retail"),
    (("parking", "garage", "carwash", "autopart", "tire", "muffler", "transmission", "oilchange", "autorepair", "cardeal", "rental"), "services"),
]

# Accent color rotation (NO indigo/blue per MotoTrack rules — blue only for "moderate" status)
ACCENT_COLORS = [
    "emerald", "teal", "orange", "rose", "amber", "pink", "fuchsia",
    "violet", "purple", "cyan", "green", "red", "sky", "yellow", "stone",
]
# Note: "sky" is allowed for accent (it's used for ocean/water monitors) per the original
# MotoTrack color rules — only the canonical bg-blue-500 for STATUS_COLORS.moderate is restricted.

# Lucide icon mapping based on category
CATEGORY_ICONS = {
    "atmospheric": "wind",
    "geological": "mountain",
    "oceanic": "waves",
    "climate": "snowflake",
    "disaster": "flame",
    "weather": "cloud-sun",
    "hydrology": "droplets",
    "vegetation": "leaf",
    "wildlife": "bird",
    "infrastructure": "building-2",
    "industrial": "factory",
    "retail": "shopping-bag",
    "services": "briefcase",
    "recreation": "trophy",
    "other": "circle",
}


def to_kebab(name: str) -> str:
    """Convert PascalCase to kebab-case."""
    s = re.sub(r"(?<!^)(?=[A-Z])", "-", name)
    return s.lower()


def categorize(name: str) -> str:
    name_lower = name.lower()
    for keywords, category in CATEGORY_RULES:
        for kw in keywords:
            if kw in name_lower:
                return category
    return "other"


def generate_demo_monitor(monitor_name: str, idx: int) -> dict:
    """Generate package.json, manifest.json, and src/<Name>Monitor.tsx for a demo monitor."""
    kebab = to_kebab(monitor_name)
    if kebab in REAL_MONITORS:
        return {"skipped": True, "name": kebab}

    category = categorize(monitor_name)
    icon = CATEGORY_ICONS.get(category, "circle")
    accent = ACCENT_COLORS[idx % len(ACCENT_COLORS)]

    monitor_dir = DEST_DIR / kebab
    src_dir = monitor_dir / "src"
    src_dir.mkdir(parents=True, exist_ok=True)

    # package.json
    pkg = {
        "name": f"@envirodash/monitor-{kebab}",
        "version": "1.0.0",
        "private": True,
        "description": f"Demo monitor: {monitor_name} (originally from MotoTrack, uses static SAMPLE_LOCATIONS)",
        "main": f"./src/{monitor_name}Monitor.tsx",
        "exports": {
            ".": f"./src/{monitor_name}Monitor.tsx",
            "./manifest": "./manifest.json",
        },
        "scripts": {
            "type-check": "tsc --noEmit",
            "clean": "rm -rf dist .turbo",
        },
        "dependencies": {"@envirodash/core": "*"},
        "devDependencies": {"typescript": "^5"},
    }
    (monitor_dir / "package.json").write_text(json.dumps(pkg, indent=2) + "\n")

    # manifest.json
    manifest = {
        "id": kebab,
        "name": f"{re.sub(r'([A-Z])', r' \1', monitor_name).strip()} Monitor",
        "category": category,
        "icon": icon,
        "description": f"Demo monitor for {monitor_name}. Originally from MotoTrack with static SAMPLE_LOCATIONS data. Real-data integration planned for future release.",
        "dataSource": "Demo (static SAMPLE_LOCATIONS)",
        "realData": False,
        "free": True,
        "accent": accent,
        "originalFile": f"src/components/map/{monitor_name}Monitor.tsx",
    }
    (monitor_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    # src/<Name>Monitor.tsx — thin wrapper that imports the original component
    component = f"""'use client'

import {{ lazy, Suspense }} from 'react'

// Lazy-load the original MotoTrack component (preserves 867 monitors without bloating the monorepo)
const Original = lazy(() => import('./original'))

export interface {monitor_name}MonitorProps {{
  onClose?: () => void
  showClose?: boolean
}}

export function {monitor_name}Monitor({{ onClose, showClose = true }}: {monitor_name}MonitorProps) {{
  return (
    <Suspense fallback={{<div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>}}>
      <Original onClose={{onClose}} showClose={{showClose}} />
    </Suspense>
  )
}}

export default {monitor_name}Monitor
"""
    (src_dir / f"{monitor_name}Monitor.tsx").write_text(component)

    return {"skipped": False, "name": kebab, "category": category, "icon": icon, "accent": accent}


def main():
    if not SRC_DIR.exists():
        print(f"ERROR: Source directory not found: {SRC_DIR}")
        return

    monitor_files = sorted(SRC_DIR.glob("*Monitor.tsx"))
    print(f"Found {len(monitor_files)} monitor files in {SRC_DIR}")

    results = {"created": 0, "skipped": 0, "by_category": {}}
    for idx, f in enumerate(monitor_files):
        monitor_name = f.name.replace("Monitor.tsx", "")
        result = generate_demo_monitor(monitor_name, idx)
        if result.get("skipped"):
            results["skipped"] += 1
        else:
            results["created"] += 1
            cat = result["category"]
            results["by_category"][cat] = results["by_category"].get(cat, 0) + 1

    print(f"\nResults:")
    print(f"  Created: {results['created']} demo monitor packages")
    print(f"  Skipped: {results['skipped']} (already exist as real-data monitors)")
    print(f"\nBy category:")
    for cat, count in sorted(results["by_category"].items(), key=lambda x: -x[1]):
        print(f"  {cat:15} {count}")

    print(f"\nTotal monitor packages in monorepo: {results['created'] + results['skipped']}")


if __name__ == "__main__":
    main()
