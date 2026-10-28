@echo off
chcp 65001 >nul
cd /d "%~dp0"
title World Brief

rem ---- Optional proxy: uncomment and set your local proxy port to reach BBC / Al Jazeera etc. ----
rem set HTTPS_PROXY=http://127.0.0.1:7890
rem set HTTP_PROXY=http://127.0.0.1:7890
rem set NODE_USE_ENV_PROXY=1

start "" http://localhost:4318
node server.mjs
pause
