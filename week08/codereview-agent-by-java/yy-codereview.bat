@echo off
REM yy-codereview - Code Review CLI Tool
REM
REM Usage:
REM   yy-codereview "review current branch"
REM   yy-codereview "review uncommitted changes"
REM   yy-codereview                    (interactive mode)
REM   yy-codereview --server           (start web server)

setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set JAR_FILE=%SCRIPT_DIR%target\codereview-agent-1.0.0-SNAPSHOT.jar

REM Build if JAR doesn't exist
if not exist "%JAR_FILE%" (
    echo Building yy-codereview...
    cd /d "%SCRIPT_DIR%"
    call mvn package -DskipTests -q
)

REM Check if API key is set
if "%AI_API_KEY%"=="" if "%DEEPSEEK_API_KEY%"=="" if "%OPENAI_API_KEY%"=="" (
    echo Warning: No API key found. Please set one of:
    echo   set AI_API_KEY=your-key
    echo   set DEEPSEEK_API_KEY=your-key
    echo   set OPENAI_API_KEY=your-key
    echo.
)

REM Run the CLI
java -jar "%JAR_FILE%" %*

endlocal
