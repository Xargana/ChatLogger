//Made by Xargana and inon13
const mineflayer = require('mineflayer');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const chalk = require('chalk');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const prefix = '!!';
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Create an interface for reading input from the console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask questions
const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// Helper function to format the current time
const getCurrentTime = () => {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // Returns HH:MM:SS
};

// Function to read and parse the config file
const readConfigFile = (filePath) => {
  const config = {};
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue; // Skip empty or commented lines

    const [key, value] = line.split(':').map((part) => part.trim());
    config[key] = value;
  }

  return config;
};

// Function to get bot settings from user input
const getBotSettingsFromUser = async () => {
  const serverIP = await askQuestion('Enter server IP: ');
  const serverPort = (await askQuestion('Enter server port (25565 if left empty): ')) || '25565';
  const version = await askQuestion('Enter Minecraft version (leave empty for latest): ');

  const useLoginInput = await askQuestion('Use login? (y/n): ');
  const useLogin = useLoginInput.toLowerCase() === 'y';

  let username = '';
  let password = '';
  if (useLogin) {
    username = await askQuestion('Enter username: ');
    password = await askQuestion('Enter password: ');
  }

  const botCount = parseInt(await askQuestion('Enter number of bots: '), 10);
  const useRepetitiveNamesInput = await askQuestion('Use repetitive names? (y/n): ');

  const useRepetitiveNames = useRepetitiveNamesInput.toLowerCase() === 'y';

  const usernames = [];
  
  // Repetitive naming enforced if botCount > 1
  if (botCount > 1) {
    const baseUsername = await askQuestion('Enter base username for bots: ');
    for (let i = 1; i <= botCount; i++) {
      usernames.push(`${baseUsername}${i}`);
    }
  } else {
    usernames.push(await askQuestion('Enter username for the bot: '));
  }

  const useFilteringInput = await askQuestion('Enable chat filtering? (y/n): ');
  const useFiltering = useFilteringInput.toLowerCase() === 'y';

  let whitelistedWords = [];
  if (useFiltering) {
    const whitelistedWordsInput = await askQuestion('Enter whitelisted words (comma-separated): ');
    whitelistedWords = whitelistedWordsInput.split(',').map(word => word.trim());
  }

  const trustedUsersInput = await askQuestion('Enter trusted users (comma-separated): ');
  const trustedUsers = trustedUsersInput.split(',').map(user => user.trim());

  return {
    serverIP,
    serverPort,
    version,
    useLogin,
    username,
    password,
    botCount,
    useRepetitiveNames,
    usernames,
    useFiltering,
    whitelistedWords,
    trustedUsers,
  };
};

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main bot function
const runBot = async () => {
  console.clear();

  // Ask for config file name
  const configFileName = await askQuestion('Enter config file name (leave empty for manual input): ');

  let config;
  let usernames = []; // Initialize usernames array

  if (configFileName) {
    const configPath = path.join(__dirname, 'configs', configFileName);
    if (fs.existsSync(configPath)) {
      config = readConfigFile(configPath);

      // Parse config data properly and set defaults
      const serverIP = config.serverIP || 'localhost'; // Default to 'localhost' if not specified
      const serverPort = config.serverPort || '25565'; // Default port
      const version = config.version || undefined; // Leave undefined for the latest version
      const botCount = parseInt(config.bot_amount, 10) || 1; // Default to 1 bot
      const useLogin = config.useLogin === 'true'; // Convert to boolean

      // Check if repetitive naming is enabled
      if (botCount > 1) {
        const baseUsername = config.username || 'Bot';
        for (let i = 1; i <= botCount; i++) {
          usernames.push(`${baseUsername}${i}`);
        }
      } else {
        usernames.push(config.username || 'Bot'); // For a single bot, use the specified username
      }

      // Other config values
      config = {
        ...config, // Preserve other settings
        serverIP,
        serverPort,
        version,
        botCount,
        usernames,
        useLogin,
        trustedUsers: (config.trustedUsers || '').split(',').map(user => user.trim()),
        whitelistedWords: (config.whitelistedWords || '').split(',').map(word => word.trim()),
        useFiltering: config.useFiltering === 'true', // Convert to boolean
      };

    } else {
      console.log(chalk.red(`Config file "${configFileName}" not found in /configs folder.`));
      return;
    }
  } else {
    // Use the old manual method if no config file is provided
    config = await getBotSettingsFromUser();
    usernames = config.usernames;
  }

  rl.close(); // Close the input stream once inputs are gathered

// Function to handle commands (same as before)
const handleCommand = (bot, command) => {
  const args = command.split(' ');
  const cmd = args[0];

  // Movement commands
  switch (cmd.toLowerCase()) {
    case 'f':
      const forwardCount = parseInt(args[1], 10);
      bot.setControlState('forward', true);
      setTimeout(() => bot.setControlState('forward', false), forwardCount * 1000);
      break;

    case 'b':
      const backCount = parseInt(args[1], 10);
      bot.setControlState('back', true);
      setTimeout(() => bot.setControlState('back', false), backCount * 1000);
      break;

    case 'l':
      const leftCount = parseInt(args[1], 10);
      bot.setControlState('left', true);
      setTimeout(() => bot.setControlState('left', false), leftCount * 1000);
      break;

    case 'r':
      const rightCount = parseInt(args[1], 10);
      bot.setControlState('right', true);
      setTimeout(() => bot.setControlState('right', false), rightCount * 1000);
      break;

    case 'j':
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 1);
      break;

    case 's':
      bot.setControlState('sneak', false);
      bot.setControlState('jump', false);
      bot.setControlState('sprint', false);
      bot.setControlState('forward', false);
      bot.setControlState('backward', false);
      bot.setControlState('left', false);
      bot.setControlState('right', false);
      break;
      
    case 'sn':
      const sneakTime = parseInt(args, 10);
      bot.setControlState('sneak', true);
      setTimeout(() => bot.setControlState('sneak', false), sneakTime * 1000);
      break;

    case 'sp':
      const sprintTime = parseInt(args, 10);
      bot.setControlState('sprint', true);
      setTimeout(() => bot.setControlState('sprint', false), sprintTime * 1000);
      break;

    case 'say':
      if (args[1]) {
        bot.chat(args.slice(1).join(' '));
      } else {
        bot.chat('Please provide a message.');
      }
      break;
  //allow the user to list the trusted users
    case 'trustedusers':
      trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Trusted users: ${trustedUsers.join(', ')}`);
      });
    break;
    case 'tu':
      trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Trusted users: ${trustedUsers.join(', ')}`);
      });
    break;
    //list online players
    case 'list':
      const onlinePlayers = Object.keys(bot.players).join(', ');
      trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Online players: ${onlinePlayers}`);  // Sends the online players list to the game chat
      });
      console.log(`Online players: ${onlinePlayers}`);  // Logs the online players list in the console
    break;
    case 'ls':
      const oPlayers = Object.keys(bot.players).join(', ');
      trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Online players: ${oPlayers}`);  // Sends the online players list to the game chat
      });
      console.log(`Online players: ${onlinePlayers}`);  // Logs the online players list in the console
    break;
    //lists the commands (help)
    case 'help':
      trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} prefix: ${prefix} commands: forward(f), backwards(b), right(r), left(l), list(ls), trustedusers(tu), say, websay. non of the commands have capital restrictions (which means you can type TrUstedUsErs and it would work).`);
      });
    break;
    case 'h':
      trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} prefix: ${prefix}`);
        bot.chat(`/msg ${trustedUser} commands: forward(f), backwards(b), right(r), left(l),`);
        bot.chat(`/msg ${trustedUser} list(ls), trustedusers(tu), say, websay. non of the commands have capital restrictions (which means you can type TrUstedUsErs and it would work).`);
      });
    break;

    case 'bot':
      if (args[1] && args[2] && args[3]) {
        const newBotUsername = args[1];
        const newServerIP = args[2];
        const newServerPort = args[3];

        // Create a new bot instance with a 2-second delay
        delay(2000).then(() => {
          const newBot = mineflayer.createBot({
            host: newServerIP,
            port: newServerPort,
            username: newBotUsername,
          });

          // Handle chat for new bot
          newBot.on('chat', (username, message) => {
            console.log(`[${newBotUsername}] ${username}: ${message}\n`);
            io.emit('chat', { bot: newBotUsername, username, message });
          });

          console.log(`New bot created: ${newBotUsername}`);
          io.emit('status', `New bot created: ${newBotUsername}`);
        });
      } else {
        bot.chat('Please provide a username, server IP, and port.');
      }
      break;

      default:
        trustedUsers.forEach(trustedUser => {
          bot.chat(`/msg ${trustedUser} Unknown command, Type ${prefix}help for a list of commands.`);
        });
    }
};

  const {
    serverIP,
    serverPort,
    version,
    useLogin,
    password,
    useFiltering,
    whitelistedWords,
    trustedUsers,
  } = config;

  // Debugging output
  console.log(`Connecting to server IP: ${serverIP}, Port: ${serverPort}`);

  // Create log directories based on server IP and current date-time
  const dateTime = new Date().toISOString().replace(/[:.]/g, '-'); // Format datetime for folder names
  const logDir = path.join(__dirname, 'logs', `${serverIP}_${dateTime}`);
  fs.mkdirSync(logDir, { recursive: true });

  // Create bots and set up chat logging
  const bots = [];
  const logStream = fs.createWriteStream(path.join(logDir, 'chat.txt'), { flags: 'a' });
  const filteredStream = useFiltering ? fs.createWriteStream(path.join(logDir, 'filtered.txt'), { flags: 'a' }) : null;

  let firstBotLogged = false; // Flag to track if the first bot has logged messages

  // Serve static files from the 'public' directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('A user connected');

    // Send initial status
    socket.emit('status', 'Connected to server');

    // Handle commands from the web UI
    socket.on('command', (command) => {
      console.log(`Received command from UI: ${command}`);
      // For simplicity, send commands to the first bot
      if (bots.length > 0) {
        handleCommand(bots[0], command);
      } else {
        socket.emit('status', 'No bots available to send commands.');
      }
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

  // Start the server
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`Web UI server is running at http://localhost:${PORT}`);
  });

  for (const botUsername of usernames) {
    await delay(5000); // 5-second delay before each bot login attempt

    const bot = mineflayer.createBot({
      host: serverIP,
      port: serverPort,
      username: botUsername,
      password: useLogin ? password : undefined,
      version: version || undefined, // Add version parameter
    });

    bots.push(bot);

    // Handle successful login
    bot.on('spawn', () => {
      if (!firstBotLogged) {
        firstBotLogged = true; // Set the flag to true when the first bot spawns

        // Log messages for the first bot only
        bot.on('chat', (username, message) => {
          const timestamp = getCurrentTime(); // Get the current time
          const logMessage = `[${timestamp}] ${username}: ${message}\n`;
          logStream.write(logMessage); // Write log with timestamp
          console.log(`[${timestamp}] ${username}: ${message}`); // Display the chat message in the console

          // Emit chat message to the web UI
          io.emit('chat', { bot: botUsername, username, message });

          // Log filtered messages
          if (useFiltering && whitelistedWords.some(word => message.includes(word))) {
            const filteredMessage = `[${timestamp}] ${username}: ${message}\n`;
            filteredStream.write(filteredMessage); // Write filtered log with timestamp
            io.emit('filtered', { bot: botUsername, username, message });
          }
        });

        console.log(chalk.green(`[${botUsername}] is logging`));
        io.emit('status', `[${botUsername}] is logging`);
      }

      // Listen for commands from trusted users in chat
      bot.on('chat', (username, message) => {
        if (message.startsWith(prefix) && trustedUsers.includes(username)) {
          const command = message.slice(prefix.length).trim();
          handleCommand(bot, command);

          // Emit the command to the web UI
          io.emit('command-executed', { bot: botUsername, command });
        }
      });
    });

    bot.on('error', (err) => {
      console.error(`[${botUsername}] Error:`, err);
      io.emit('error', `[${botUsername}] Error: ${err.message}`);
    });

    bot.on('end', () => {
      console.log(chalk.red(`[${botUsername}] Disconnected from the server.`));
      io.emit('status', `[${botUsername}] Disconnected from the server.`);
    });
  }
};



// Start the bot
runBot().catch(console.error);
