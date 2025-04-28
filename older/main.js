//  Made by Xargana and inon13, refactored by Cody

const fs = require('fs');
const path = require('path');
const mineflayer = require('mineflayer');
const readline = require('readline');
const chalk = require('chalk');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { exec } = require('child_process');
const vec3 = require('vec3');

// Initialize Express and Socket.io for web interface
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 6004;

// Configure paths
const PATHS = {
  scripts: path.join(__dirname, 'scripts'),
  configs: path.join(__dirname, 'configs'),
  logs: path.join(__dirname, 'logs')
};

// Ensure all necessary directories exist
Object.values(PATHS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
const Utils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  getCurrentTime: () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // Returns HH:MM:SS
  },
  
  askQuestion: (query) => {
    return new Promise(resolve => rl.question(query, resolve));
  },
  
  formatDateTime: () => {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }
};

// File management functions
const FileManager = {
  // Scripts management
  getScriptFiles: () => {
    return fs.readdirSync(PATHS.scripts);
  },
  
  getScriptContent: (fileName) => {
    const filePath = path.join(PATHS.scripts, fileName);
    return fs.readFileSync(filePath, 'utf8');
  },
  
  createScriptFile: (data) => {
    const filePath = path.join(PATHS.scripts, data.name);
    fs.writeFileSync(filePath, data.code, 'utf8');
  },
  
  editScriptFile: (data) => {
    const filePath = path.join(PATHS.scripts, data.name);
    fs.writeFileSync(filePath, data.code, 'utf8');
  },
  
  deleteScriptFile: (fileName) => {
    const filePath = path.join(PATHS.scripts, fileName);
    fs.unlinkSync(filePath);
  },
  
  renameScriptFile: (data) => {
    const oldPath = path.join(PATHS.scripts, data.oldName);
    const newPath = path.join(PATHS.scripts, data.newName);
    fs.renameSync(oldPath, newPath);
  },
  
  // Configs management
  getConfigFiles: () => {
    return fs.readdirSync(PATHS.configs);
  },
  
  getConfigContent: (fileName) => {
    const filePath = path.join(PATHS.configs, fileName);
    return fs.readFileSync(filePath, 'utf8');
  },
  
  readConfigFile: (filePath) => {
    const config = {};
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '' || line.startsWith('#')) continue;
      
      const [key, value] = line.split(':').map(part => part.trim());
      if (key && value !== undefined) {
        config[key] = value;
      }
    }
    
    return config;
  },
  
  createConfigFile: (data) => {
    const filePath = path.join(PATHS.configs, data.name);
    const jsonData = typeof data.code === 'string' ? JSON.parse(data.code) : data.code;
    
    const txtContent = Object.entries(jsonData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    fs.writeFileSync(filePath, txtContent, 'utf8');
  },
  
  editConfigFile: (data) => {
    const filePath = path.join(PATHS.configs, data.name);
    const jsonData = typeof data.code === 'string' ? JSON.parse(data.code) : data.code;
    
    const txtContent = Object.entries(jsonData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    fs.writeFileSync(filePath, txtContent, 'utf8');
  },
  
  deleteConfigFile: (fileName) => {
    const filePath = path.join(PATHS.configs, fileName);
    fs.unlinkSync(filePath);
  },
  
  renameConfigFile: (data) => {
    const oldPath = path.join(PATHS.configs, data.oldName);
    const newPath = path.join(PATHS.configs, data.newName);
    fs.renameSync(oldPath, newPath);
  }
};

// Configuration manager
class ConfigManager {
  constructor() {
    this.config = {
      prefix: '!!',
      serverIP: 'localhost',
      serverPort: '25565',
      version: undefined,
      botCount: 1,
      usernames: [],
      useLogin: false,
      username: '',
      password: '',
      trustedUsers: [],
      whitelistedWords: [],
      useFiltering: false
    };
  }
  
  async getUserInputConfig() {
    console.log(chalk.cyan('Please provide bot configuration:'));
    
    this.config.prefix = (await Utils.askQuestion('Enter a prefix for commands ("!!" if left empty): ')) || '!!';
    this.config.serverIP = await Utils.askQuestion('Enter server IP: ');
    this.config.serverPort = (await Utils.askQuestion('Enter server port (25565 if left empty): ')) || '25565';
    this.config.version = await Utils.askQuestion('Enter Minecraft version (leave empty for latest): ');
    
    const useLoginInput = await Utils.askQuestion('Use login? (y/n): ');
    this.config.useLogin = useLoginInput.toLowerCase() === 'y';
    
    if (this.config.useLogin) {
      this.config.username = await Utils.askQuestion('Enter username: ');
      this.config.password = await Utils.askQuestion('Enter password: ');
    }
    
    this.config.botCount = parseInt(await Utils.askQuestion('Enter number of bots: '), 10) || 1;
    
    const usernames = [];
    
    if (this.config.botCount > 1) {
      const baseUsername = await Utils.askQuestion('Enter base username for bots: ');
      for (let i = 1; i <= this.config.botCount; i++) {
        usernames.push(`${baseUsername}${i}`);
      }
    } else {
      usernames.push(await Utils.askQuestion('Enter username for the bot: '));
    }
    
    this.config.usernames = usernames;
    
    const useFilteringInput = await Utils.askQuestion('Enable chat filtering? (y/n): ');
    this.config.useFiltering = useFilteringInput.toLowerCase() === 'y';
    
    if (this.config.useFiltering) {
      const whitelistedWordsInput = await Utils.askQuestion('Enter whitelisted words (comma-separated): ');
      this.config.whitelistedWords = whitelistedWordsInput.split(',').map(word => word.trim());
    }
    
    const trustedUsersInput = await Utils.askQuestion('Enter trusted users (comma-separated): ');
    this.config.trustedUsers = trustedUsersInput.split(',').map(user => user.trim());
    
    return this.config;
  }
  
  loadConfigFromFile(fileName) {
    const configPath = path.join(PATHS.configs, `${fileName}.clc`);
    
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red(`Config file "${fileName}" not found in /configs folder.`));
      return null;
    }
    
    const loadedConfig = FileManager.readConfigFile(configPath);
    
    // Parse the loaded config and set defaults
    this.config = {
      prefix: loadedConfig.prefix || '!!',
      serverIP: loadedConfig.serverIP || 'localhost',
      serverPort: loadedConfig.serverPort || '25565',
      version: loadedConfig.version || undefined,
      botCount: parseInt(loadedConfig.bot_amount, 10) || 1,
      useLogin: loadedConfig.useLogin === 'true',
      username: loadedConfig.username || '',
      password: loadedConfig.password || '',
      trustedUsers: (loadedConfig.trustedUsers || '').split(',').map(user => user.trim()),
      whitelistedWords: (loadedConfig.whitelistedWords || '').split(',').map(word => word.trim()),
      useFiltering: loadedConfig.useFiltering === 'true'
    };
    
    // Set up usernames based on the bot count
    if (this.config.botCount > 1) {
      const baseUsername = this.config.username || 'Bot';
      this.config.usernames = Array.from({ length: this.config.botCount }, (_, i) => `${baseUsername}${i + 1}`);
    } else {
      this.config.usernames = [this.config.username || 'Bot'];
    }
    
    return this.config;
  }
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}

// Bot manager to handle bot creation and interactions
class BotManager {
  constructor(config) {
    this.config = config;
    this.bots = [];
    this.activeBotIndex = 0;
    this.commandHandlers = this.setupCommandHandlers();
  }
  
  setupCommandHandlers() {
    return {
      // Movement commands
      'look': (bot, args) => {
        if (args.length >= 2) {
          const yaw = parseFloat(args[0]);
          const pitch = parseFloat(args[1]);
          bot.look(yaw, pitch, true);
          console.log(`Bot is now looking at yaw: ${yaw}, pitch: ${pitch}`);
        } else {
          console.log('Usage: look <yaw> <pitch>');
        }
      },
      
      'f': (bot, args) => this.handleMovement(bot, 'forward', args[0]),
      'forward': (bot, args) => this.handleMovement(bot, 'forward', args[0]),
      'b': (bot, args) => this.handleMovement(bot, 'back', args[0]),
      'backward': (bot, args) => this.handleMovement(bot, 'back', args[0]),
      'l': (bot, args) => this.handleMovement(bot, 'left', args[0]),
      'left': (bot, args) => this.handleMovement(bot, 'left', args[0]),
      'r': (bot, args) => this.handleMovement(bot, 'right', args[0]),
      'right': (bot, args) => this.handleMovement(bot, 'right', args[0]),
      'j': (bot, args) => this.handleMovement(bot, 'jump', args[0]),
      'jump': (bot, args) => this.handleMovement(bot, 'jump', args[0]),
      'sn': (bot, args) => this.handleMovement(bot, 'sneak', args[0]),
      'sneak': (bot, args) => this.handleMovement(bot, 'sneak', args[0]),
      'sp': (bot, args) => this.handleMovement(bot, 'sprint', args[0]),
      'sprint': (bot, args) => this.handleMovement(bot, 'sprint', args[0]),
      
      's': (bot) => this.stopAllMovement(bot),
      'stop': (bot) => this.stopAllMovement(bot),
      
      // Block interaction
      'br': (bot) => {
        bot.dig(bot.blockAtCursor(7));
      },
      
      // Chat commands
      'say': (bot, args) => {
        if (args.length > 0) {
          bot.chat(args.join(' ').replace(/\n/g, ''));
        } else {
          bot.chat('Please provide a message.');
        }
      },
      
      // List commands
      'trustedusers': (bot) => this.listTrustedUsers(bot),
      'tu': (bot) => this.listTrustedUsers(bot),
      'list': (bot) => this.listOnlinePlayers(bot),
      'ls': (bot) => this.listOnlinePlayers(bot),
      
      // Help command
      'help': (bot) => this.sendHelpMessage(bot),
      'h': (bot) => this.sendHelpMessage(bot),
      
      // Script execution
      'runscript': (bot, args) => this.runScript(bot, args[0]),
      
      // Bot management
      'bot': (bot, args) => {
        if (args.length >= 3) {
          this.createNewBot(args[0], args[1], args[2]);
        } else {
          bot.chat('Please provide a username, server IP, and port.');
        }
      }
    };
  }
  
  handleMovement(bot, control, value) {
    if (!value) {
      bot.setControlState(control, true);
      return;
    }
    
    if (value.toLowerCase() === 'on') {
      bot.setControlState(control, true);
    } else if (value.toLowerCase() === 'off') {
      bot.setControlState(control, false);
    } else if (value === 'once' && control === 'jump') {
      bot.setControlState(control, true);
      setTimeout(() => {
        bot.setControlState(control, false);
      }, 1);
    } else {
      const ticks = parseInt(value, 10);
      if (!isNaN(ticks)) {
        bot.setControlState(control, true);
        setTimeout(() => bot.setControlState(control, false), ticks * 50);
      }
    }
  }
  
  stopAllMovement(bot) {
    ['sneak', 'jump', 'sprint', 'forward', 'back', 'left', 'right'].forEach(control => {
      bot.setControlState(control, false);
    });
  }
  
  listTrustedUsers(bot) {
    this.config.trustedUsers.forEach(trustedUser => {
      bot.chat(`/msg ${trustedUser} Trusted users: ${this.config.trustedUsers.join(', ')}`);
    });
  }
  
  listOnlinePlayers(bot) {
    const onlinePlayers = Object.keys(bot.players).join(', ');
    this.config.trustedUsers.forEach(trustedUser => {
      bot.chat(`/msg ${trustedUser} Online players: ${onlinePlayers}`);
    });
    console.log(`Online players: ${onlinePlayers}`);
  }
  
  sendHelpMessage(bot) {
    const prefix = this.config.prefix;
    this.config.trustedUsers.forEach(trustedUser => {
      bot.chat(`/msg ${trustedUser} prefix: ${prefix}`);
      bot.chat(`/msg ${trustedUser} commands: forward(f), backward(b), right(r), left(l),`);
      bot.chat(`/msg ${trustedUser} list(ls), trustedusers(tu), say, runscript, help(h)`);
    });
  }
  
  runScript(bot, scriptName) {
    if (!scriptName) {
      this.config.trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Please provide a valid script name.`);
      });
      console.log('No script filename provided for runscript command.');
      return;
    }
    
    const scriptFileName = `${scriptName}.cls`;
    const scriptPath = path.join(PATHS.scripts, scriptFileName);
    
    if (!fs.existsSync(scriptPath)) {
      bot.chat(`Script file "${scriptName}" not found.`);
      console.log(`Script file "${scriptName}" not found in /scripts folder.`);
      return;
    }
    
    try {
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      const scriptLines = scriptContent.split('\n');
      let accumulatedDelay = 0;
      
      for (const scriptLine of scriptLines) {
        const trimmedLine = scriptLine.trim();
        
        if (trimmedLine === '' || trimmedLine.startsWith('#')) continue;
        
        if (trimmedLine.toLowerCase().startsWith('delay')) {
          const parts = trimmedLine.split(' ');
          if (parts.length >= 2) {
            const delayValue = parseInt(parts[1], 10);
            if (!isNaN(delayValue) && delayValue >= 0) {
              accumulatedDelay += delayValue * 50;
              console.log(`Accumulated delay set to ${accumulatedDelay} ms`);
            }
          }
          continue;
        }
        
        setTimeout(() => {
          const cleanCommand = trimmedLine.replace(/\n/g, '').trim();
          console.log(`Executing script command: "${cleanCommand}"`);
          this.handleCommand(bot, cleanCommand);
        }, accumulatedDelay);
      }
    } catch (err) {
      bot.chat(`Error reading script file "${scriptFileName}".`);
      console.error(`Error reading script file "${scriptFileName}":`, err);
    }
  }
  
  async createNewBot(username, serverIP, serverPort) {
    try {
      await Utils.delay(2000);
      const newBot = mineflayer.createBot({
        host: serverIP,
        port: serverPort,
        username: username,
      });
      
      newBot.on('spawn', () => {
        console.log(`New bot created: ${username}`);
        io.emit('status', `New bot created: ${username}`);
      });
      
      newBot.on('chat', (username, message) => {
        console.log(`[${newBot.username}] ${username}: ${message}`);
        io.emit('chat', { bot: newBot.username, username, message });
      });
      
      newBot.on('error', (err) => {
        console.error(`[${username}] Error:`, err);
        io.emit('error', `[${username}] Error: ${err.message}`);
      });
      
      this.bots.push(newBot);
    } catch (error) {
      console.error(`Failed to create new bot: ${error.message}`);
      io.emit('error', `Failed to create new bot: ${error.message}`);
    }
  }
  
  handleCommand(bot, commandString) {
    const args = commandString.split(' ');
    const cmdName = args.shift().toLowerCase();
    
    const handler = this.commandHandlers[cmdName];
    if (handler) {
      handler(bot, args);
    } else {
      this.config.trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Unknown command. Type ${this.config.prefix}help for a list of commands.`);
      });
    }
  }
  
  async createBots() {
    const { serverIP, serverPort, version, useLogin, password, usernames } = this.config;
    
    // Create log directory
    const dateTime = Utils.formatDateTime();
    const logDir = path.join(PATHS.logs, `${serverIP}_${dateTime}`);
    fs.mkdirSync(logDir, { recursive: true });
    
    // Set up log streams
    const logStream = fs.createWriteStream(path.join(logDir, 'chat.txt'), { flags: 'a' });
    const filteredStream = this.config.useFiltering ? 
      fs.createWriteStream(path.join(logDir, 'filtered.txt'), { flags: 'a' }) : null;
    
    let firstBotLogged = false;
    
    for (const botUsername of usernames) {
      try {
        await Utils.delay(5000);
        
        const bot = mineflayer.createBot({
          host: serverIP,
          port: serverPort,
          username: botUsername,
          password: useLogin ? password : undefined,
          version: version || undefined,
        });
        
        this.bots.push(bot);
        
        bot.on('spawn', () => {
          console.log(chalk.green(`[${botUsername}] connected to ${serverIP}:${serverPort}`));
          io.emit('status', `[${botUsername}] connected to ${serverIP}:${serverPort}`);
          
          if (!firstBotLogged) {
            firstBotLogged = true;
            
            // Only log messages for the first bot
            bot.on('chat', (username, message) => {
              const timestamp = Utils.getCurrentTime();
              const logMessage = `[${timestamp}] ${username}: ${message}\n`;
              
              logStream.write(logMessage);
              console.log(`[${timestamp}] ${username}: ${message}`);
              
              io.emit('chat', { bot: botUsername, username, message });
              
              // Log filtered messages if enabled
              if (this.config.useFiltering && 
                  this.config.whitelistedWords.some(word => message.includes(word))) {
                filteredStream.write(logMessage);
                io.emit('filtered', { bot: botUsername, username, message });
              }
            });
            
            console.log(chalk.green(`[${botUsername}] is logging chat`));
            io.emit('status', `[${botUsername}] is logging chat`);
          }
          
          // Listen for commands from trusted users
          bot.on('chat', (username, message) => {
            if (message.startsWith(this.config.prefix) && 
                this.config.trustedUsers.includes(username)) {
              const command = message.slice(this.config.prefix.length).trim();
              this.handleCommand(bot, command);
              io.emit('command-executed', { bot: botUsername, command });
            }
          });
          
          // Track player joins and leaves
          bot.on('playerJoined', (player) => {
            const timestamp = Utils.getCurrentTime();
            const logMessage = `[${timestamp}] ${player.username} joined the game\n`;
            logStream.write(logMessage);
            console.log(`[${timestamp}] ${player.username} joined the game`);
            io.emit('player-joined', player.username);
          });
          
          bot.on('playerLeft', (player) => {
            const timestamp = Utils.getCurrentTime();
            const logMessage = `[${timestamp}] ${player.username} left the game\n`;
            logStream.write(logMessage);
            console.log(`[${timestamp}] ${player.username} left the game`);
            io.emit('player-left', player.username);
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
        
        bot.on('kicked', (reason) => {
          console.log(chalk.red(`[${botUsername}] Kicked from the server: ${reason.value || reason}`));
          io.emit('status', `[${botUsername}] Kicked from the server: ${reason.value || reason}`);
        });
      } catch (error) {
        console.error(`Failed to create bot ${botUsername}:`, error);
        io.emit('error', `Failed to create bot ${botUsername}: ${error.message}`);
      }
    }
    
    return this.bots;
  }
  
  disconnectAllBots() {
    this.bots.forEach(bot => {
      if (bot && bot.quit) {
        bot.quit();
      }
    });
    this.bots = [];
  }
  
  getActiveBot() {
    return this.bots.length > 0 ? this.bots[this.activeBotIndex] : null;
  }
  
  setActiveBotIndex(index) {
    if (index >= 0 && index < this.bots.length) {
      this.activeBotIndex = index;
      return true;
    }
    return false;
  }
}

// Web interface manager
class WebInterface {
  constructor() {
    this.configManager = new ConfigManager();
    this.botManager = null;
    this.setupExpress();
    this.setupSocketHandlers();
  }
  
  setupExpress() {
    // Serve static files from the 'public' directory
    app.use(express.static(path.join(__dirname, 'public'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
      }
    }));
    
    // Start the server
    server.listen(PORT, () => {
      console.log(chalk.cyan(`Web UI server is running at http://localhost:${PORT}`));
    });
  }
  
  setupSocketHandlers() {
    io.on('connection', (socket) => {
      console.log(chalk.green('Web UI client connected'));
      
      // Send current configuration to the connected client
      if (this.botManager) {
        socket.emit('config', this.botManager.config);
      }
      
      // Handle commands from the web UI
      socket.on('command', (command) => {
        console.log(`Received command from UI: ${command}`);
        if (this.botManager && this.botManager.getActiveBot()) {
          this.botManager.handleCommand(this.botManager.getActiveBot(), command);
        } else {
          socket.emit('status', 'No bots available to send commands.');
        }
      });
      
      // Configuration management
      socket.on('config.set', (data) => {
        if (this.botManager) {
          this.botManager.config = this.configManager.updateConfig(data);
          io.emit('config', this.botManager.config);
        }
      });
      
      socket.on('config.new', (data) => {
        FileManager.createConfigFile(data);
        io.emit('config.list', FileManager.getConfigFiles());
      });
      
      socket.on('config.rename', (data) => {
        FileManager.renameConfigFile(data);
        io.emit('config.list', FileManager.getConfigFiles());
      });
      
      socket.on('config.edit', (data) => {
        FileManager.editConfigFile(data);
        io.emit('config.list', FileManager.getConfigFiles());
      });
      
      socket.on('config.delete', (data) => {
        FileManager.deleteConfigFile(data);
        io.emit('config.list', FileManager.getConfigFiles());
      });
      
      socket.on('config.read', (data) => {
        const configContent = FileManager.readConfigFile(data);
        socket.emit('config.send', configContent);
      });
      
      socket.on('config.get_list', () => {
        socket.emit('config.list', FileManager.getConfigFiles());
      });
      
      // Script management
      socket.on('script.new', (data) => {
        FileManager.createScriptFile(data);
        io.emit('script.list', FileManager.getScriptFiles());
      });
      
      socket.on('script.rename', (data) => {
        FileManager.renameScriptFile(data);
        io.emit('script.list', FileManager.getScriptFiles());
      });
      
      socket.on('script.edit', (data) => {
        FileManager.editScriptFile(data);
        io.emit('script.list', FileManager.getScriptFiles());
      });
      
      socket.on('script.delete', (data) => {
        FileManager.deleteScriptFile(data);
        io.emit('script.list', FileManager.getScriptFiles());
      });
      
      socket.on('script.read', (data) => {
        const scriptContent = FileManager.getScriptContent(data);
        socket.emit('script.send', scriptContent);
      });
      
      socket.on('script.get_list', () => {
        socket.emit('script.list', FileManager.getScriptFiles());
      });
      
      // Bot management
      socket.on('bot.reconnect', async () => {
        if (this.botManager) {
          this.botManager.disconnectAllBots();
          await this.botManager.createBots();
          socket.emit('status', 'Bots reconnected');
        }
      });
      
      socket.on('disconnect', () => {
        console.log(chalk.yellow('Web UI client disconnected'));
      });
    });
    
    // Send initial file lists
    io.emit('config.list', FileManager.getConfigFiles());
    io.emit('script.list', FileManager.getScriptFiles());
  }
  
  openBrowser() {
    console.log(chalk.cyan("Launching Chrome..."));
    const url = `http://localhost:${PORT}`;
    exec(`start chrome ${url}`, (error) => {
      if (error) {
        console.error(`Error launching Chrome: ${error.message}`);
      }
    });
  }
  
  async start() {
    console.clear();
    
    const configFileName = await Utils.askQuestion('Enter config file name (leave empty for manual input): ');
    let config;
    
    if (configFileName) {
      config = this.configManager.loadConfigFromFile(configFileName);
      if (!config) {
        return false;
      }
    } else {
      config = await this.configManager.getUserInputConfig();
    }
    
    rl.close();
    
    this.botManager = new BotManager(config);
    io.emit('config', config);
    
    await this.botManager.createBots();
    this.openBrowser();
    
    return true;
  }
}

// Main application
async function main() {
  try {
    const webInterface = new WebInterface();
    const success = await webInterface.start();
    
    if (!success) {
      console.log(chalk.red('Failed to start ChatLogger. Please check your configuration.'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('An error occurred:'), error);
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);
