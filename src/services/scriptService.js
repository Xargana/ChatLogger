class ScriptService {
  constructor({ fileManager, botService }) {
    this.fileManager = fileManager;
    this.botService = botService;
  }
  
  async getScriptList() {
    return this.fileManager.getScriptFiles();
  }
  
  async getScriptContent(scriptName) {
    return this.fileManager.readScriptFile(scriptName);
  }
  
  async saveScript(scriptName, content) {
    return this.fileManager.writeScriptFile(scriptName, content);
  }
  
  async deleteScript(scriptName) {
    return this.fileManager.deleteScriptFile(scriptName);
  }
  
  async executeScript(scriptName, bot) {
    if (!bot) {
      bot = this.botService.getActiveBot();
      if (!bot) {
        throw new Error('No bot available to run script');
      }
    }
    
    const scriptContent = await this.fileManager.readScriptFile(scriptName);
    if (!scriptContent) {
      throw new Error(`Script "${scriptName}" not found`);
    }
    
    const scriptLines = scriptContent.split('\n');
    let accumulatedDelay = 0;
    
    for (const line of scriptLines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Handle delay commands
      if (trimmedLine.toLowerCase().startsWith('delay')) {
        const parts = trimmedLine.split(' ');
        if (parts.length >= 2) {
          const delayValue = parseInt(parts[1], 10);
          if (!isNaN(delayValue) && delayValue >= 0) {
            accumulatedDelay += delayValue * 50; // Convert to milliseconds
          }
        }
        continue;
      }
      
      // Execute the command after the accumulated delay
      const command = trimmedLine;
      setTimeout(() => {
        this.botService.handleCommand(bot, command);
      }, accumulatedDelay);
    }
    
    return true;
  }
  
  parseScriptMetadata(scriptContent) {
    const metadata = {
      name: '',
      description: '',
      author: '',
      version: ''
    };
    
    const lines = scriptContent.split('\n');
    for (const line of lines) {
      if (!line.startsWith('#')) continue;
      
      const cleanLine = line.substring(1).trim();
      if (cleanLine.startsWith('name:')) {
        metadata.name = cleanLine.substring(5).trim();
      } else if (cleanLine.startsWith('description:')) {
        metadata.description = cleanLine.substring(12).trim();
      } else if (cleanLine.startsWith('author:')) {
        metadata.author = cleanLine.substring(7).trim();
      } else if (cleanLine.startsWith('version:')) {
        metadata.version = cleanLine.substring(8).trim();
      }
    }
    
    return metadata;
  }
}

module.exports = { ScriptService };
