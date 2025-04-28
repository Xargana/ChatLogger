const fs = require('fs').promises;
const path = require('path');

class FileManager {
  constructor(customPaths) {
    this.basePath = process.cwd();
    this.paths = customPaths || {
      config: path.join(this.basePath, 'config'),
      logs: path.join(this.basePath, 'logs'),
      scripts: path.join(this.basePath, 'scripts'),
      public: path.join(this.basePath, 'public')
    };
  }
  
  async ensureDirectories() {
    for (const dirPath of Object.values(this.paths)) {
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }
  
  async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, data, 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing file: ${error.message}`);
      return false;
    }
  }
  
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting file: ${error.message}`);
      return false;
    }
  }
  
  async readConfigFile(configPath) {
    const content = await this.readFile(configPath);
    if (!content) return null;
    
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '' || line.startsWith('#')) continue;
      
      const [key, value] = line.split(':').map(part => part.trim());
      if (key && value !== undefined) {
        config[key] = value;
      }
    }
    
    return config;
  }
  
  async getConfigFiles() {
    try {
      const files = await fs.readdir(this.paths.config);
      return files.filter(file => file.endsWith('.clc'));
    } catch (error) {
      console.error(`Error reading config directory: ${error.message}`);
      return [];
    }
  }
  
  async getScriptFiles() {
    try {
      const files = await fs.readdir(this.paths.scripts);
      return files.filter(file => file.endsWith('.cls'));
    } catch (error) {
      console.error(`Error reading scripts directory: ${error.message}`);
      return [];
    }
  }
  
  async readScriptFile(scriptName) {
    const scriptPath = path.join(this.paths.scripts, `${scriptName}.cls`);
    return this.readFile(scriptPath);
  }
  
  async writeScriptFile(scriptName, content) {
    const scriptPath = path.join(this.paths.scripts, `${scriptName}.cls`);
    return this.writeFile(scriptPath, content);
  }
  
  async deleteConfigFile(fileName) {
    const configPath = path.join(this.paths.config, fileName);
    return this.deleteFile(configPath);
  }
  
  async deleteScriptFile(fileName) {
    const scriptPath = path.join(this.paths.scripts, fileName);
    return this.deleteFile(scriptPath);
  }
  
  async createLogDirectory(serverIP) {
    const dateTime = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = path.join(this.paths.logs, `${serverIP}_${dateTime}`);
    await fs.mkdir(logDir, { recursive: true });
    return logDir;
  }
}

module.exports = { FileManager };
