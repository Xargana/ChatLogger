@echo off
:: Go to manager folder
cd manager
:: Check if Node.js exists
where node >nul 2>nul
if %errorlevel%==0 (
    title ChatLogger Console
    echo Node.js installation confirmed, launching ChatLogger.
    echo Please do not close this window while ChatLogger is running.
    :sleep
    ping 127.0.0.1 -n 2 -w 1000 > NUL
    ping 127.0.0.1 -n %1 -w 1000 > NUL
    :: Run initializer
    node run.js
) else (
    :: Rage quit
    echo Node.js is not installed. Please install Node.js to continue.
    pause
)