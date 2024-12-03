const mineflayer = require('mineflayer');
const fs = require('fs');

// Get server details from environment variables
const serverIP = process.env.SERVER_IP;
const serverPort = process.env.SERVER_PORT || 25565;
const username = process.env.USERNAME || 'ChatLoggerBot';

// Validate input
if (!serverIP) {
  console.error('Error: SERVER_IP environment variable is required.');
  process.exit(1);
}

// Create a log directory
const logDir = `logs/${serverIP}`;
fs.mkdirSync(logDir, { recursive: true });

// Create a write stream for logging chat messages
const chatLogStream = fs.createWriteStream(`${logDir}/chat.log`, { flags: 'a' });

// Create the bot
const bot = mineflayer.createBot({
  host: serverIP,
  port: parseInt(serverPort, 10),
  username,
});

// Log messages to file and console
bot.on('chat', (username, message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${username}: ${message}\n`;

  console.log(logEntry.trim());
  chatLogStream.write(logEntry);
});

// Handle bot events
bot.on('spawn', () => {
  console.log(`Connected to ${serverIP}:${serverPort} as ${username}`);
});

bot.on('error', (err) => {
  console.error(`Bot encountered an error:`, err);
  process.exit(1);
});

bot.on('end', () => {
  console.log(`Disconnected from ${serverIP}:${serverPort}`);
  process.exit(0);
});
