 
class SocketHandler {
  constructor(io, services) {
    this.io = io;
    this.services = services;
  }
  
  initialize() {
    this.io.on('connection', (socket) => {
      console.log('Client connected');
      
      // Initialize with current state
      this.sendInitialState(socket);
      
      // Register event handlers
      this.registerConfigHandlers(socket);
      this.registerBotHandlers(socket);
      this.registerScriptHandlers(socket);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
    
    // Set up event relays from services to clients
    this.setupEventRelays();
  }
  
  sendInitialState(socket) {
    // Send current configuration
    if (this.services.configManager.hasActiveConfig()) {
      socket.emit('config.current', this.services.configManager.getActiveConfig());
    }
    
    // Send file lists
    this.services.fileManager.getConfigFiles()
      .then(configs => socket.emit('config.list', configs));
    
    this.services.fileManager.getScriptFiles()
      .then(scripts => socket.emit('script.list', scripts));
      
    // Send bot status
    const bots = this.services.botService.bots.map(bot => ({
      username: bot.username,
      connected: !!bot.player
    }));
    socket.emit('bot.list', bots);
  }
  
  registerConfigHandlers(socket) {
    socket.on('config.load', async (fileName) => {
      const config = await this.services.configManager.loadFromFile(fileName);
      if (config) {
        this.services.configManager.updateConfig(config);
        socket.emit('status', `Configuration ${fileName} loaded`);
      } else {
        socket.emit('error', `Failed to load configuration ${fileName}`);
      }
    });
    
    socket.on('config.save', async (data) => {
      const success = await this.services.configManager.saveToFile(data.name, data.config);
      if (success) {
        socket.emit('status', `Configuration saved as ${data.name}`);
        this.services.fileManager.getConfigFiles()
          .then(configs => this.io.emit('config.list', configs));
      } else {
        socket.emit('error', `Failed to save configuration ${data.name}`);
      }
    });
    
    socket.on('config.delete', async (fileName) => {
      const success = await this.services.fileManager.deleteConfigFile(fileName);
      if (success) {
        socket.emit('status', `Configuration ${fileName} deleted`);
        this.services.fileManager.getConfigFiles()
          .then(configs => this.io.emit('config.list', configs));
      } else {
        socket.emit('error', `Failed to delete configuration ${fileName}`);
      }
    });
    
    socket.on('config.update', (config) => {
      this.services.configManager.updateConfig(config);
      socket.emit('status', 'Configuration updated');
      this.io.emit('config.current', this.services.configManager.getActiveConfig());
    });
  }
  
  registerBotHandlers(socket) {
    socket.on('bot.connect', async () => {
      await this.services.botService.createBots();
      socket.emit('status', 'Bots connecting...');
    });
    
    socket.on('bot.disconnect', () => {
      this.services.botService.disconnectAllBots();
      socket.emit('status', 'All bots disconnected');
    });
    
    socket.on('bot.command', (data) => {
      const { command, botIndex } = data;
      const targetBot = botIndex !== undefined ? 
        this.services.botService.bots[botIndex] : 
        this.services.botService.getActiveBot();
      
      if (targetBot) {
        this.services.botService.handleCommand(targetBot, command);
        socket.emit('status', `Command sent: ${command}`);
      } else {
        socket.emit('error', 'No bot available to send command');
      }
    });
    
    socket.on('bot.setActive', (index) => {
      if (this.services.botService.setActiveBotIndex(index)) {
        socket.emit('status', `Active bot set to index ${index}`);
      } else {
        socket.emit('error', 'Invalid bot index');
      }
    });
  }
  
  registerScriptHandlers(socket) {
    socket.on('script.run', (data) => {
      const { name, botIndex } = data;
      const targetBot = botIndex !== undefined ? 
        this.services.botService.bots[botIndex] : 
        this.services.botService.getActiveBot();
      
      if (targetBot) {
        this.services.botService.runScript(targetBot, name);
        socket.emit('status', `Running script: ${name}`);
      } else {
        socket.emit('error', 'No bot available to run script');
      }
    });
    
    socket.on('script.save', async (data) => {
      const success = await this.services.fileManager.writeScriptFile(data.name, data.content);
      if (success) {
        socket.emit('status', `Script saved: ${data.name}`);
        this.services.fileManager.getScriptFiles()
          .then(scripts => this.io.emit('script.list', scripts));
      } else {
        socket.emit('error', `Failed to save script: ${data.name}`);
      }
    });
    
    socket.on('script.load', async (name) => {
      const content = await this.services.fileManager.readScriptFile(name);
      if (content) {
        socket.emit('script.content', { name, content });
      } else {
        socket.emit('error', `Failed to load script: ${name}`);
      }
    });
    
    socket.on('script.delete', async (name) => {
      const success = await this.services.fileManager.deleteScriptFile(name);
      if (success) {
        socket.emit('status', `Script deleted: ${name}`);
        this.services.fileManager.getScriptFiles()
          .then(scripts => this.io.emit('script.list', scripts));
      } else {
        socket.emit('error', `Failed to delete script: ${name}`);
      }
    });
  }
  
  setupEventRelays() {
    // Relay events from bot service to all clients
    this.services.botService.on('status', message => {
      this.io.emit('status', message);
    });
    
    this.services.botService.on('error', message => {
      this.io.emit('error', message);
    });
    
    this.services.botService.on('chat', data => {
      this.io.emit('chat', data);
    });
    
    this.services.botService.on('command-executed', data => {
      this.io.emit('command-executed', data);
    });
    
    this.services.botService.on('player-joined', username => {
      this.io.emit('player-joined', username);
    });
    
    this.services.botService.on('player-left', username => {
      this.io.emit('player-left', username);
    });
  }
}

module.exports = { SocketHandler };
