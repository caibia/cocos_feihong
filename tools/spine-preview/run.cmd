@echo off
rem ASCII-only on purpose: cmd misparses UTF-8 (non-ASCII) batch files.
setlocal
rem Port: default 8970, override with first arg, e.g. run.cmd 9000
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8970"

rem cd to this script's folder (serve.py lives here)
cd /d "%~dp0"

rem Require python on PATH
where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] python not found on PATH. Install Python and add it to PATH.
  pause
  exit /b 1
)

set "URL=http://127.0.0.1:%PORT%/"
echo Starting Spine preview server...
echo URL: %URL%
echo Server runs in a separate window; close it or press Ctrl+C there to stop.

rem Server runs in its own window so logs stay visible
start "Spine Preview (port %PORT%)" python serve.py --port %PORT%

rem Wait ~2s for the server to come up (ping, not timeout: works under redirected stdin)
ping -n 3 127.0.0.1 >nul
start "" "%URL%"

endlocal
