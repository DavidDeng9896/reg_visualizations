@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if %ERRORLEVEL%==0 (
  set PY=python
) else (
  where py >nul 2>nul
  if %ERRORLEVEL%==0 (
    set PY=py -3
  ) else (
    echo [python-worker] Python not found. Install Python 3.11+ and re-run.
    exit /b 1
  )
)

echo [python-worker] installing requirements...
%PY% -m pip install -r requirements.txt
if errorlevel 1 exit /b 1

echo [python-worker] starting on http://127.0.0.1:8091
%PY% -m uvicorn app.main:app --host 127.0.0.1 --port 8091
