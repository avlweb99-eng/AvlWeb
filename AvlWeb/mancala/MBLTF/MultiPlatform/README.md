# MultiPlatform PWA

This folder contains the portable web app version of the Mancala Bot Lab Training Facility.

## What It Preserves

- The same seven-screen information architecture as the Windows WPF shell:
  - `Overview`
  - `Train`
  - `Jobs`
  - `Outputs`
  - `Learn`
  - `Bots`
  - `Support`
- The same training modes:
  - Weighted Bot
  - Minimax Dataset
  - Policy Model
  - League Fine-Tune
- Dense workflow guidance, benchmark notes, diagnostics, and artifact explanations.

## Closest-Equivalent Browser Replacements

Because a PWA cannot directly launch local PowerShell or Node processes the way the WPF app does, this version uses browser-native equivalents:

- Detached desktop jobs -> browser-local async jobs
- Runtime files and folders -> virtual browser paths plus downloadable artifacts
- Local file picker paths -> reusable imported JSON artifacts in browser storage
- WPF output folder navigation -> Outputs hub plus JSON downloads

## Run

Double-click:

- `LaunchTrainingFacilityPWA.cmd`
  - Starts a local static server for `MultiPlatform`
  - Opens the app in the default browser
  - Keeps serving until the console window is closed or `Ctrl+C` is pressed

Or serve this folder manually from any static web server. Example:

```powershell
cd E:\Dev\Web\MancalaBotTrainerPWA\MBTDFL\MultiPlatform
python -m http.server 4173
```

Then open:

- `http://localhost:4173/`

Opening `index.html` directly from disk may work for basic UI testing, but service worker and install behavior require an HTTP server.
