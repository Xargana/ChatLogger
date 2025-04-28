const path = require('path');
const readline = require('readline');
const { EventEmitter } = require('events');

class ConfigManager extends EventEmitter {
  constructor(fileManager) {
    super();
    this.fileManager = fileManager;
    this.activeConfig = null;
    this.configsPath = 'config';
    
    this.defaultConfig = {
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
  
  hasActiveConfig() {
    return this.activeConfig !== null;
  }
  
  getActiveConfig() {
    return this.activeConfig;
  }
  
  async initialize() {
    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const askQuestion = (query) => {
      return new Promise(resolve => rl.question(query, resolve));
    };
    
    const configFileName = await askQuestion('Enter config file name (leave empty for manual input): ');
    
    if (configFileName) {
      this.activeConfig = await this.loadFromFile(configFileName);
    } else {
      this.activeConfig = await this.getUserInput(askQuestion);
    }
    
    rl.close();
    this.emit('config.loaded', this.activeConfig);
    return this.activeConfig;
  }
  
  async loadFromFile(fileName) {
    try {
      const configPath = path.join(this.configsPath, `${fileName}.clc`);
      const configData = await this.fileManager.readConfigFile(configPath);
      
      if (!configData) {
        console.error(`Config file "${fileName}" not found or invalid.`);
        return null;
      }
      
      // Parse and set default values
      const config = {
        ...this.defaultConfig,
        ...configData,
        useLogin: configData.useLogin === 'true',
        useFiltering: configData.useFiltering === 'true',
        botCount: parseInt(configData.botCount || configData.bot_amount, 10) || 1,
        trustedUsers: (configData.trustedUsers || '').split(',').map(user => user.trim()),
        whitelistedWords: (configData.whitelistedWords || '').split(',').map(word => word.trim())
      };
      
      // Set up usernames based on bot count
      if (config.botCount > 1) {
        const baseUsername = config.username || 'Bot';
        config.usernames = Array.from({ length: config.botCount }, (_, i) => `${baseUsername}${i + 1}`);
      } else {
        config.usernames = [config.username || 'Bot'];
      }
      
      return config;
    } catch (error) {
      console.error(`Error loading config: ${error.message}`);
      return null;
    }
  }
  
  async getUserInput(askQuestion) {
    console.log('Please provide bot configuration:');
    
    const config = { ...this.defaultConfig };
    
    config.prefix = (await askQuestion('Enter a prefix for commands ("!!" if left empty): ')) || '!!';
    config.serverIP = await askQuestion('Enter server IP: ');
    config.serverPort = (await askQuestion('Enter server port (25565 if left empty): ')) || '25565';
    config.version = await askQuestion('Enter Minecraft version (leave empty for latest): ');
    
    const useLoginInput = await askQuestion('Use login? (y/n): ');
    config.useLogin = useLoginInput.toLowerCase() === 'y';
    
    if (config.useLogin) {
      config.username = await askQuestion('Enter username: ');
      config.password = await askQuestion('Enter password: ');
    }
    
    config.botCount = parseInt(await askQuestion('Enter number of bots: '), 10) || 1;
    
    const usernames = [];
    
    if (config.botCount > 1) {
      const baseUsername = await askQuestion('Enter base username for bots: ');
      for (let i = 1; i <= config.botCount; i++) {
        usernames.push(`${baseUsername}${i}`);
      }
    } else {
      usernames.push(await askQuestion('Enter username for the bot: '));
    }
    
    config.usernames = usernames;
    
    const useFilteringInput = await askQuestion('Enable chat filtering? (y/n): ');
    config.useFiltering = useFilteringInput.toLowerCase() === 'y';
    
    if (config.useFiltering) {
      const whitelistedWordsInput = await askQuestion('Enter whitelisted words (comma-separated): ');
      config.whitelistedWords = whitelistedWordsInput.split(',').map(word => word.trim());
    }
    
    const trustedUsersInput = await askQuestion('Enter trusted users (comma-separated): ');
    config.trustedUsers = trustedUsersInput.split(',').map(user => user.trim());
    
    // Save the configuration for future use
    const saveConfig = await askQuestion('Save this configuration? (y/n): ');
    if (saveConfig.toLowerCase() === 'y') {
      const configName = await askQuestion('Enter configuration name: ');
      await this.saveToFile(configName, config);
    }
    
    return config;
  }
  
  async saveToFile(fileName, config) {
    try {
      const configPath = path.join(this.configsPath, `${fileName}.clc`);
      
      // Convert config object to text format
      const configText = Object.entries(config)
        .filter(([key, value]) => 
          typeof value !== 'object' && key !== 'usernames')
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      await this.fileManager.writeFile(configPath, configText);
      console.log(`Configuration saved as ${fileName}.clc`);
      return true;
    } catch (error) {
      console.error(`Error saving config: ${error.message}`);
      return false;
    }
  }
  
  async listConfigs() {
    return this.fileManager.getConfigFiles();
  }
  
  async deleteConfig(fileName) {
    return this.fileManager.deleteConfigFile(fileName);
  }
  
  updateConfig(newConfig) {
    this.activeConfig = { ...this.activeConfig, ...newConfig };
    this.emit('config.updated', this.activeConfig);
    return this.activeConfig;
  }
}

module.exports = { ConfigManager };
