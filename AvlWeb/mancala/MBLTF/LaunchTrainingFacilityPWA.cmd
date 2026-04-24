@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "APP_SCRIPT=%ROOT_DIR%MultiPlatform\Start-MBTFDLPWA.ps1"

if not exist "%APP_SCRIPT%" (
  echo The PWA launcher script was not found.
  echo Expected path:
  echo   %APP_SCRIPT%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo The PWA launcher exited with code %EXIT_CODE%.
  echo Review the message above, fix the issue, then try again.
  pause
)

exit /b %EXIT_CODE%
