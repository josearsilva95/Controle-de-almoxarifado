@echo off
cd /d "%~dp0"
set NODE_EXTRA_CA_CERTS=%~dp0kaspersky-root.pem
"C:\Users\jose.silva\AppData\Local\nodejs-portable\node-v24.18.1-win-x64\node.exe" watch.mjs >> watch.log 2>&1
