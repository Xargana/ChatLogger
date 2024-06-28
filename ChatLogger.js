const fs = require('fs');
const path = require('path');
const mineflayer = require('mineflayer');
const Vec3 = require('vec3'); // Import vec3 module for vector operations

// Read configuration from config.txt
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

// Function to send a command and handle the response
function sendCommand(bot, command) {
    return new Promise((resolve, reject) => {
        bot.chat(command);
        const listener = (message) => {
            const rawMessage = message.toString().trim();
            if (rawMessage.startsWith('TPS:')) {
                bot.removeListener('message', listener); // Remove listener once TPS response is received
                const tps = rawMessage.split(':')[1].trim();
                resolve(tps);
            }
        };
        bot.on('message', listener);

        // Timeout to handle if no response is received within a reasonable time
        setTimeout(() => {
            bot.removeListener('message', listener);
            reject(new Error('Timeout while waiting for response'));
        }, 5000); // 5 seconds timeout
    });
}

// Function to simulate a click action (send a chat message)
function simulateClick(bot) {
    bot.chat('/spawn'); // Replace with an actual command recognized by your server
}

// Function to move the bot
function moveBot(bot, distance, direction) {
    const yaw = bot.entity.yaw;
    let movementVec;

    switch (direction) {
        case 'forward':
        case 'fw':
            movementVec = new Vec3(-Math.sin(yaw) * distance, 0, Math.cos(yaw) * distance);
            break;
        case 'back':
        case 'bk':
            movementVec = new Vec3(Math.sin(yaw) * distance, 0, -Math.cos(yaw) * distance);
            break;
        case 'left':
        case 'l':
            movementVec = new Vec3(Math.cos(yaw) * distance, 0, Math.sin(yaw) * distance);
            break;
        case 'right':
        case 'r':
            movementVec = new Vec3(-Math.cos(yaw) * distance, 0, -Math.sin(yaw) * distance);
            break;
        default:
            throw new Error(`Unknown direction: ${direction}`);
    }

    const currentPos = bot.entity.position;
    const targetPos = currentPos.plus(movementVec);

    bot.physics.onGround = true; // Ensure the bot is on the ground to move

    // Set the bot's control state to move in the specified direction
    bot.setControlState(direction.includes('forward') ? 'forward' : direction.includes('back') ? 'back' : direction.includes('left') ? 'left' : 'right', true);

    // Stop the bot's movement after it has moved the desired distance
    const interval = setInterval(() => {
        const distanceMoved = bot.entity.position.distanceTo(currentPos);
        if (distanceMoved >= distance) {
            bot.setControlState(direction.includes('forward') ? 'forward' : direction.includes('back') ? 'back' : direction.includes('left') ? 'left' : 'right', false);
            clearInterval(interval);
            console.log(`Bot has moved ${direction} by ${distance} blocks.`);
        }
    }, 50); // Check every 50 milliseconds
}

// Main bot logic
function startBot(config) {
    // Configuration variables
    const serverAddress = config['Server Address'];
    const serverPort = parseInt(config['Server Port']);
    const botUsername = config['Bot Username'];
    const registerPassword = config['Register Password'];
    const loginPassword = config['Login Password'];
    const keywordsToMonitor = config['Keywords to Monitor'].split(',').map(keyword => keyword.trim());

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

    // Create a bot instance
    const bot = mineflayer.createBot({
        host: serverAddress,
        port: serverPort,
        username: botUsername,
    });

    // Log server status and uptime every 25 seconds
    setInterval(() => {
        const serverStatus = bot.players ? `${Object.keys(bot.players).length} players online` : 'No players online';
        log(`Server Status - ${serverStatus}`);
    }, 25000);  // 25000 milliseconds = 25 seconds

    // Log chat messages and filter keywords
    bot.on('message', async (message) => {
        const rawMessage = message.toString();
        log(`${rawMessage}`);

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

                // Move the bot forward by 1.5 blocks after 2 seconds
                setTimeout(() => {
                    moveBot(bot, 1.5, 'forward');

                    // Start the 15-minute cycle of moving forward and backward
                    let movingForward = false;
                    setInterval(() => {
                        moveBot(bot, 1.5, movingForward ? 'forward' : 'back');
                        movingForward = !movingForward; // Toggle the direction for the next move
                    }, 15 * 60 * 1000); // Repeat every 15 minutes
                }, 2000); // 2000 milliseconds = 2 seconds delay before moving forward
            }, 5000); // 5000 milliseconds = 5 seconds delay after registration command
        }, 3000); // 3000 milliseconds = 3 seconds delay before sending the registration command
    });

    // Handle disconnection
    bot.on('end', () => {
        log('Bot disconnected from the server.');
    });

    // Periodically simulate a click action to prevent inactivity kick
    setInterval(() => {
        simulateClick(bot);
    }, 60 * 1000); // Click every 60 seconds

    // Handle console input
    process.stdin.on('data', (data) => {
        const input = data.toString().trim();
        const [command, ...args] = input.split(' ');

        if (command.startsWith('!')) {
            const mainCommand = command.substring(1).replace('fw', 'forward').replace('bk', 'back').replace('l', 'left').replace('r', 'right');
            if (mainCommand === 'forward' || mainCommand === 'back' || mainCommand === 'left' || mainCommand === 'right') {
                const direction = mainCommand;
                const distance = parseFloat(args[0]);
                if (!isNaN(distance)) {
                    moveBot(bot, distance, direction);
                } else {
                    console.log(`Invalid distance for ${command} command.`);
                }
            } else if (command === '!tps') {
                sendCommand(bot, '/tps')
                    .then(tps => {
                        bot.chat(`Current TPS: ${tps}`);
                        log(`Sent TPS to chat: ${tps}`);
                    })
                    .catch(err => {
                        log(`Error while fetching TPS: ${err.message}`);
                    });
            } else if (command === '!help') {
                console.log('Available commands:\n!forward <distance>\n!back <distance>\n!left <distance>\n!right <distance>\n!tps\n!help');
            } else {
                console.log('Command not found. Type !help for the list of available commands.');
            }
        } else {
            bot.chat(input);
            log(`Console message sent to server: ${input}`);
        }
    });

    // Gracefully close log streams on process exit
    process.on('exit', () => {
        logStream.end();
        keywordLogStream.end();
    });
}

// Read configuration from config.txt
const config = readConfig();

if (config) {
    startBot(config);
} else {
    console.error('Configuration could not be loaded. Check your config.txt file.');
}
