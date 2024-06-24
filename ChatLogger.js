//Made by Xargana and ChatGPT
const fs = require('fs');
const path = require('path');
const mineflayer = require('mineflayer');

// Create write streams for logging
const logFilePath = path.join(__dirname, 'log.txt');
const keywordLogFilePath = path.join(__dirname, 'log2.txt');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' }); // 'a' means append
const keywordLogStream = fs.createWriteStream(keywordLogFilePath, { flags: 'a' }); // 'a' means append

// Function to log messages to console and log.txt
function log(message) {
    const logEntry = `[${new Date().toLocaleString()}] ${message}`;
    console.log(logEntry);
    logStream.write(logEntry + '\n');
}

// Function to log messages containing specific keywords to log2.txt
function logKeyword(message) {
    const logEntry = `[${new Date().toLocaleString()}] ${message}`;
    keywordLogStream.write(logEntry + '\n');
}

// Function to read configuration from config.txt
function readConfig() {
    try {
        const configPath = path.join(__dirname, 'config.txt');
        const configData = fs.readFileSync(configPath, 'utf8');
        const configLines = configData.split('\n');

        let config = {};
        configLines.forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const key = parts[0].trim();
                const value = parts[1].trim();
                config[key] = value;
            }
        });

        return config;
    } catch (err) {
        console.error(`Error reading config file: ${err}`);
        return null;
    }
}

// Read configuration from config.txt
const config = readConfig();

if (config) {
    // Configuration variables
    const serverAddress = config['Server Address'];
    const serverPort = parseInt(config['Server Port']);
    const botUsername = config['Bot Username'];
    const registerPassword = config['Register Password'];
    const loginPassword = config['Login Password'];
    const keywordsToMonitor = config['Keywords to Monitor'].split(',').map(keyword => keyword.trim());

    // Create a bot instance
    const bot = mineflayer.createBot({
        host: serverAddress,
        port: serverPort,
        username: botUsername,
    });

    // Log server status and uptime every minute
    setInterval(() => {
        const serverStatus = bot.players ? `${Object.keys(bot.players).length} players online` : 'No players online';
        log(`Server Status - ${serverStatus}`);
    }, 25000);  // 25000 milliseconds = 25 seconds

    // Log chat messages and filter keywords
    bot.on('message', (message) => {
        const rawMessage = message.toString();
        log(`Received message event - raw message: ${rawMessage}`);

        // Check for specific keywords
        const lowerCaseMessage = rawMessage.toLowerCase();
        const foundKeywords = keywordsToMonitor.filter(keyword => lowerCaseMessage.includes(keyword));

        if (foundKeywords.length > 0) {
            foundKeywords.forEach(keyword => {
                logKeyword(`Keyword message - ${rawMessage}`);
            });
        }
    });

    // Log errors
    bot.on('error', (err) => {
        log(`Bot encountered an error: ${err}`);
    });

    // Log login status
    bot.on('login', () => {
        log('Bot has logged in.');
    });

    // Handle bot initialization
    bot.once('spawn', () => {
        log('Bot spawned and ready to connect.');

        // Send the registration command after a brief delay
        setTimeout(() => {
            log('Sending /register command...');
            bot.chat(`/register ${registerPassword} ${registerPassword}`);

            // Send the login command after an additional 5-second delay
            setTimeout(() => {
                log('Sending /login command...');
                bot.chat(`/login ${loginPassword}`);
            }, 5000); // 5000 milliseconds = 5 seconds delay
        }, 3000); // 3000 milliseconds = 3 seconds delay before sending the registration command
    });

    // Handle disconnection
    bot.on('end', () => {
        log('Bot disconnected from the server.');
    });

    // Gracefully close log streams on process exit
    process.on('exit', () => {
        logStream.end();
        keywordLogStream.end();
    });
} else {
    console.error('Configuration could not be loaded. Check your config.txt file.');
}
