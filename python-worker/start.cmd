@echo off
setlocal
cd /d "%~dp0"

if exist "%~dp0.venv\Scripts\python.exe" (
  set "PY=%~dp0.venv\Scripts\python.exe"
  echo [python-worker] using project venv: %PY%
) else (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 (
    set PY=python
  ) else (
    where py >nul 2>nul
    if %ERRORLEVEL%==0 (
      set PY=py -3
    ) else (
      echo [python-worker] Python not found (no .venv and none on PATH).
      echo Create one: python -m venv .venv
      echo Then: .venv\Scripts\python.exe -m pip install -r requirements.txt
      exit /b 1
    )
  )
)

echo [python-worker] installing requirements...
%PY% -m pip install -r requirements.txt
if errorlevel 1 exit /b 1

echo [python-worker] starting on http://127.0.0.1:8091
%PY% -m uvicorn app.main:app --host 127.0.0.1 --port 8091
