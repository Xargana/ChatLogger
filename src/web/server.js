const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { exec } = require('child_process');

class WebServer {
  constructor({ botService, configManager, fileManager }) {
    this.botService = botService;
    this.configManager = configManager;
    this.fileManager = fileManager;
    this.port = process.env.PORT || 6004;
    
    // Initialize Express and Socket.io
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server);
    
    this.setupExpressRoutes();
    this.setupSocketHandlers();
    
    // Relay bot service events to web clients
    this.relayEvents();
  }
  
  setupExpressRoutes() {
    // Serve static files from public directory
    this.app.use(express.static(path.join(process.cwd(), 'public')));
    
    // Add explicit route for root path
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    });
    
    // API routes
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });
    
    this.app.get('/api/bots', (req, res) => {
      const bots = this.botService.bots.map(bot => ({
        username: bot.username,
        server: `${bot.host}:${bot.port}`,
        connected: bot.player ? true : false
      }));
      
      res.json(bots);
    });
    
    this.app.get('/api/config', (req, res) => {
      res.json(this.configManager.getActiveConfig());
    });
    
    this.app.get('/api/configs', async (req, res) => {
      const configs = await this.fileManager.getConfigFiles();
      res.json(configs);
    });
    
    this.app.get('/api/scripts', async (req, res) => {
      const scripts = await this.fileManager.getScriptFiles();
      res.json(scripts);
    });
  }
  
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Web client connected');
      
      // Send current state to the new client
      if (this.configManager.hasActiveConfig()) {
        socket.emit('config', this.configManager.getActiveConfig());
      }
      
      this.sendFileListsToClient(socket);
      
      // Handle commands from the web UI
      socket.on('command', (command) => {
        const activeBot = this.botService.getActiveBot();
        if (activeBot) {
          this.botService.handleCommand(activeBot, command);
        } else {
          socket.emit('status', 'No bots available to send commands.');
        }
      });
      
      // Configuration management
      socket.on('config.update', (data) => {
        this.configManager.updateConfig(data);
        this.io.emit('config', this.configManager.getActiveConfig());
      });
      
      socket.on('config.new', async (data) => {
        await this.configManager.saveToFile(data.name, data.config);
        this.sendFileListsToClient();
      });
      
      socket.on('config.load', async (fileName) => {
        const config = await this.configManager.loadFromFile(fileName);
        if (config) {
          this.configManager.updateConfig(config);
          this.io.emit('config', this.configManager.getActiveConfig());
          socket.emit('status', `Loaded configuration: ${fileName}`);
        } else {
          socket.emit('error', `Failed to load configuration: ${fileName}`);
        }
      });
      
      socket.on('config.delete', async (fileName) => {
        await this.fileManager.deleteConfigFile(fileName);
        this.sendFileListsToClient();
      });
      
      // Script management
      socket.on('script.new', async (data) => {
        await this.fileManager.writeScriptFile(data.name, data.content);
        this.sendFileListsToClient();
      });
      
      socket.on('script.read', async (scriptName) => {
        const content = await this.fileManager.readScriptFile(scriptName);
        socket.emit('script.content', { name: scriptName, content });
      });
      
      socket.on('script.delete', async (fileName) => {
        await this.fileManager.deleteScriptFile(fileName);
        this.sendFileListsToClient();
      });
      
      // Bot management
      socket.on('bot.connect', async () => {
        await this.botService.createBots();
      });
      
      socket.on('bot.disconnect', () => {
        this.botService.disconnectAllBots();
        socket.emit('status', 'All bots disconnected');
      });
      
      socket.on('bot.setActive', (index) => {
        if (this.botService.setActiveBotIndex(index)) {
          socket.emit('status', `Active bot set to index ${index}`);
        } else {
          socket.emit('error', 'Invalid bot index');
        }
      });
      
      socket.on('disconnect', () => {
        console.log('Web client disconnected');
      });
    });
  }
  
  sendFileListsToClient(socket = null) {
    const sendTo = socket || this.io;
    
    // Send file lists
    Promise.all([
      this.fileManager.getConfigFiles(),
      this.fileManager.getScriptFiles()
    ]).then(([configs, scripts]) => {
      sendTo.emit('config.list', configs);
      sendTo.emit('script.list', scripts);
    });
  }
  
  relayEvents() {
    // Relay bot service events to web clients
    this.botService.on('status', (message) => {
      this.io.emit('status', message);
    });
    
    this.botService.on('error', (message) => {
      this.io.emit('error', message);
    });
    
    this.botService.on('chat', (data) => {
      this.io.emit('chat', data);
    });
    
    this.botService.on('command-executed', (data) => {
      this.io.emit('command-executed', data);
    });
    
    this.botService.on('player-joined', (username) => {
      this.io.emit('player-joined', username);
    });
    
    this.botService.on('player-left', (username) => {
      this.io.emit('player-left', username);
    });
  }
  
  async start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Web server running on port ${this.port}`);
        resolve();
      });
    });
  }
  
  openBrowser() {
    console.log("Launching Chrome...");
    const url = `http://localhost:${this.port}`;
    exec(`start chrome ${url}`, (error) => {
      if (error) {
        console.error(`Error launching Chrome: ${error.message}`);
      }
    });
  }
}

module.exports = { WebServer };
