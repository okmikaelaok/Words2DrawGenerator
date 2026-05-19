@echo off
cd /d "%~dp0"
echo Starting Words2DrawGenerator...
echo.
echo The app will be available at:
echo http://127.0.0.1:4173
echo.
echo To stop the server, press Ctrl + C in this window.
echo.
start "" "http://127.0.0.1:4173"
node server.js
echo.
echo Server stopped.
pause

