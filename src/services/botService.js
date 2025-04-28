const mineflayer = require('mineflayer');
const { EventEmitter } = require('events');
const path = require('path');

class BotService extends EventEmitter {
  constructor({ configManager, logService, fileManager }) {
    super();
    this.configManager = configManager;
    this.logService = logService;
    this.fileManager = fileManager;
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
          this.emit('status', `Bot is now looking at yaw: ${yaw}, pitch: ${pitch}`);
        } else {
          this.emit('status', 'Usage: look <yaw> <pitch>');
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
          this.emit('status', 'Please provide a message.');
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
    const config = this.configManager.getActiveConfig();
    config.trustedUsers.forEach(trustedUser => {
      bot.chat(`/msg ${trustedUser} Trusted users: ${config.trustedUsers.join(', ')}`);
    });
  }
  
  listOnlinePlayers(bot) {
    const onlinePlayers = Object.keys(bot.players).join(', ');
    const config = this.configManager.getActiveConfig();
    config.trustedUsers.forEach(trustedUser => {
      bot.chat(`/msg ${trustedUser} Online players: ${onlinePlayers}`);
    });
    this.emit('status', `Online players: ${onlinePlayers}`);
  }
  
  sendHelpMessage(bot) {
    const config = this.configManager.getActiveConfig();
    const prefix = config.prefix;
    config.trustedUsers.forEach(trustedUser => {
      bot.chat(`/msg ${trustedUser} prefix: ${prefix}`);
      bot.chat(`/msg ${trustedUser} commands: forward(f), backward(b), right(r), left(l),`);
      bot.chat(`/msg ${trustedUser} list(ls), trustedusers(tu), say, runscript, help(h)`);
    });
  }
  
  async runScript(bot, scriptName) {
    if (!scriptName) {
      this.emit('status', 'No script filename provided for runscript command.');
      return;
    }
    
    try {
      const scriptContent = await this.fileManager.readScriptFile(scriptName);
      
      if (!scriptContent) {
        this.emit('status', `Script file "${scriptName}" not found in /scripts folder.`);
        return;
      }
      
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
              this.emit('status', `Accumulated delay set to ${accumulatedDelay} ms`);
            }
          }
          continue;
        }
        
        setTimeout(() => {
          const cleanCommand = trimmedLine.replace(/\n/g, '').trim();
          this.emit('status', `Executing script command: "${cleanCommand}"`);
          this.handleCommand(bot, cleanCommand);
        }, accumulatedDelay);
      }
    } catch (err) {
      this.emit('error', `Error reading script file "${scriptName}": ${err.message}`);
    }
  }
  
  handleCommand(bot, commandString) {
    const args = commandString.split(' ');
    const cmdName = args.shift().toLowerCase();
    
    const handler = this.commandHandlers[cmdName];
    if (handler) {
      handler(bot, args);
    } else {
      const config = this.configManager.getActiveConfig();
      config.trustedUsers.forEach(trustedUser => {
        bot.chat(`/msg ${trustedUser} Unknown command. Type ${config.prefix}help for a list of commands.`);
      });
    }
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
  
  async createBots() {
    const config = this.configManager.getActiveConfig();
    if (!config) {
      this.emit('error', 'No active configuration');
      return [];
    }
    
    const { serverIP, serverPort, version, useLogin, password, usernames } = config;
    
    // Create log directory
    const logDir = await this.fileManager.createLogDirectory(serverIP);
    this.logService.setLogDirectory(logDir);
    
    let firstBotLogged = false;
    
    for (const botUsername of usernames) {
      try {
        // Add delay between bot connections to avoid server throttling
        await this.delay(5000);
        
        // Create bot options with better version handling
        const botConfig = {
          host: serverIP,
          port: parseInt(serverPort, 10),
          username: botUsername,
          version: version || false, // 'false' tells mineflayer to auto-detect the version
        };
        
        // Add authentication if enabled
        if (useLogin) {
          botConfig.password = password;
          botConfig.auth = 'microsoft';
        }
        
        this.emit('status', `Connecting ${botUsername} to ${serverIP}:${serverPort}...`);
        const bot = mineflayer.createBot(botConfig);
        
        this.bots.push(bot);
        
        bot.on('spawn', () => {
          this.emit('status', `[${botUsername}] connected to ${serverIP}:${serverPort}`);
          
          if (!firstBotLogged) {
            firstBotLogged = true;
            
            // Only log messages for the first bot
            bot.on('chat', (username, message) => {
              // Don't log messages from self
              if (username === botUsername) return;
              
              // Log the message
              this.logService.logChatMessage(serverIP, username, message);
              
              // Log filtered messages if enabled
              if (config.useFiltering && 
                  config.whitelistedWords.some(word => message.includes(word))) {
                this.logService.logFiltered(username, message);
              }
              
              this.emit('chat', { bot: botUsername, username, message });
            });
            
            this.emit('status', `[${botUsername}] is logging chat`);
          }
          
          // Listen for commands from trusted users
          bot.on('chat', (username, message) => {
            if (message.startsWith(config.prefix) && 
                config.trustedUsers.includes(username)) {
              const command = message.slice(config.prefix.length).trim();
              this.handleCommand(bot, command);
              this.emit('command-executed', { bot: botUsername, command });
            }
          });
          
          // Track player joins and leaves
          bot.on('playerJoined', (player) => {
            this.logService.logPlayerJoin(player.username);
            this.emit('player-joined', player.username);
          });
          
          bot.on('playerLeft', (player) => {
            this.logService.logPlayerLeft(player.username);
            this.emit('player-left', player.username);
          });
        });
        
        bot.on('error', (err) => {
          this.emit('error', `[${botUsername}] Error: ${err.message}`);
        });
        
        bot.on('end', () => {
          this.emit('status', `[${botUsername}] Disconnected from the server.`);
        });
        
        bot.on('kicked', (reason) => {
          this.emit('status', `[${botUsername}] Kicked from the server: ${reason.value || reason}`);
        });
      } catch (error) {
        this.emit('error', `Failed to create bot ${botUsername}: ${error.message}`);
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
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { BotService };
