@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=5500; $root='%~dp0'; $health='http://127.0.0.1:5500/api/health'; $healthy=$false; try { $healthy=(Invoke-RestMethod -Uri $health -TimeoutSec 1).ok } catch {}; if (-not $healthy) { $existing=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; foreach ($conn in $existing) { if ($conn.OwningProcess -ne $PID) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue } }; Start-Process -FilePath python -ArgumentList @('server.py') -WorkingDirectory $root -WindowStyle Hidden }"

start "" "http://127.0.0.1:5500/"
