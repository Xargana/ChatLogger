const { ConfigManager } = require('./core/config');
const { BotService } = require('./services/botService');
const { WebServer } = require('./web/server');
const { FileManager } = require('./utils/fileManager');
const { LogService } = require('./services/logService');
const path = require('path');

class Application {
  constructor() {
    // Initialize services
    this.fileManager = new FileManager();
    this.configManager = new ConfigManager(this.fileManager);
    this.logService = new LogService(this.fileManager);
    this.botService = new BotService({
      configManager: this.configManager,
      logService: this.logService,
      fileManager: this.fileManager
    });
    this.webServer = new WebServer({
      botService: this.botService,
      configManager: this.configManager,
      fileManager: this.fileManager
    });
  }

  async initialize() {
    console.log('Initializing ChatLogger...');
    
    // Ensure directories exist
    await this.fileManager.ensureDirectories();
    
    // Start web server
    await this.webServer.start();
    
    // Load configuration (either from file or user input)
    await this.configManager.initialize();
    
    // Initialize bots with the loaded configuration
    if (this.configManager.hasActiveConfig()) {
      await this.botService.createBots(this.configManager.getActiveConfig());
      console.log('ChatLogger is now running!');
    } else {
      console.error('No valid configuration loaded. Exiting...');
      process.exit(1);
    }
  }
}

// Start the application
const app = new Application();
app.initialize().catch(err => {
  console.error('Failed to start ChatLogger:', err);
  process.exit(1);
});
