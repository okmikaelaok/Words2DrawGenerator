@echo off
echo Stopping Words2DrawGenerator on port 4173...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue; if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }; Write-Host 'Stopped Words2DrawGenerator.' } else { Write-Host 'No Words2DrawGenerator server is running on port 4173.' }"
echo.
pause
