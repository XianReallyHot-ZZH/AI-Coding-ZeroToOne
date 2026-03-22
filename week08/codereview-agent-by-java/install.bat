@echo off
REM Install yy-codereview to system PATH (Windows)

setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set INSTALL_DIR=%LOCALAPPDATA%\Programs\yy-codereview

echo Installing yy-codereview...

REM Build the project first
echo Building project...
cd /d "%SCRIPT_DIR%"
call mvn package -DskipTests -q

REM Create installation directory
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)

REM Copy files
echo Copying files to %INSTALL_DIR%...
copy /Y "%SCRIPT_DIR%yy-codereview.bat" "%INSTALL_DIR%\yy-codereview.bat" >nul
xcopy /E /I /Y "%SCRIPT_DIR%target" "%INSTALL_DIR%\target" >nul

REM Add to PATH (user level)
echo Adding to PATH...
powershell -Command "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';%INSTALL_DIR%', 'User')"

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo The 'yy-codereview' command is now available.
echo.
echo IMPORTANT: Please restart your terminal for PATH changes to take effect.
echo.
echo Usage:
echo   cd C:\path\to\your-project
echo   yy-codereview "review current branch"
echo.
echo Make sure to set your API key:
echo   set AI_API_KEY=your-key
echo.

endlocal
