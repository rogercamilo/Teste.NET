@echo off
title App Formativo — Dom Bosco
cd /d "%~dp0frontend"

echo.
echo  ============================================
echo    App Formativo — Comunidade Dom Bosco
echo  ============================================
echo.
echo  Iniciando servidor de desenvolvimento...
echo  Acesse: http://localhost:3000
echo.

set PATH=%PATH%;C:\Program Files\nodejs

REM Abre o navegador automaticamente apos 4 segundos (em segundo plano)
start /min "" cmd /c "timeout /t 4 /nobreak > nul && start http://localhost:3000"

REM Inicia o servidor (mantém o terminal aberto com os logs)
"C:\Program Files\nodejs\npm.cmd" run dev
pause
