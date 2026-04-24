# MBTDFL V2 Layout

This folder is a new copy of the application layout for the V2 refactor.

## Structure

- `MultiPlatform/`
  - Copy of the cross-platform web assets and package metadata.
- `COMMON/`
  - Shared scripts and server content used by the WPF shell.
  - Includes a compatibility `js/` copy so the unmodified scripts can still resolve `../js/...`.
- `Windows/`
  - `powershell/` contains the PowerShell + WPF shell files.
  - Runtime folders are created under `Windows/runtime` when the shell runs.
- `output/`
  - Shared output root for V2 runs.

## Launch

Run:

- `Windows\\LaunchTrainingFacilityWpf.cmd`
  - Launches `Windows\\powershell\\Start-MBTFDL.ps1`

or:

- `Windows\\powershell\\Start-MBTFDL.ps1`

The original `MBTFDL` and `MBTFDL.Wpf` folders remain unchanged so the existing setup continues to work.
