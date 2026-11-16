@echo off
cd /d "%~dp0"
rem The installer tools unpack files that contain links, and Windows only lets an administrator create links
rem (unless Developer Mode is on). So this script asks for administrator rights once, then carries on.
net session >nul 2>&1
if errorlevel 1 (
  echo This build needs administrator rights to unpack its tools.
  echo Windows will ask for permission in a moment. Choose Yes.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
  if errorlevel 1 goto :noadmin
  exit /b 0
)
echo Building Arcanum for Windows. The first time takes a few minutes.
echo (Yellow "npm warn deprecated" lines are normal and can be ignored.)
where node >nul 2>&1 || goto :nonode
call npm install || goto :fail
call npm run dist:win || goto :fail
echo.
echo Done. The installer is in the "dist" folder.
start "" dist
pause
exit /b 0
:nonode
echo.
echo Node.js is not installed. Get the LTS version from nodejs.org, install it, then run this again.
pause
exit /b 1
:noadmin
echo.
echo Administrator rights were not given, so the build cannot unpack its tools.
echo Either run this file again and choose Yes, or turn on Developer Mode
echo (Settings, System, For developers, Developer Mode) and run it again.
pause
exit /b 1
:fail
echo.
echo The build stopped. Scroll up to the first line marked with a red x or "npm error".
echo  - "Cannot create symbolic link": run this file as administrator, or turn on Developer Mode.
echo  - Anything about downloading: check the internet connection and run this again.
echo If it is something else, copy the red lines and send them with your problem report.
pause
exit /b 1
