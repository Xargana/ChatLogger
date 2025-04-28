const fs = require('fs').promises;
const path = require('path');

class LogService {
  constructor(fileManager) {
    this.fileManager = fileManager;
    this.logDir = null;
    this.chatLogPath = null;
    this.filteredLogPath = null;
  }
  
  setLogDirectory(logDir) {
    this.logDir = logDir;
    this.chatLogPath = path.join(logDir, 'chat.txt');
    this.filteredLogPath = path.join(logDir, 'filtered.txt');
  }
  
  getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // Returns HH:MM:SS
  }
  
  async logChat(username, message) {
    if (!this.chatLogPath) return;
    
    const timestamp = this.getCurrentTime();
    const logMessage = `[${timestamp}] ${username}: ${message}\n`;
    
    try {
      await fs.appendFile(this.chatLogPath, logMessage, 'utf8');
      console.log(`[${timestamp}] ${username}: ${message}`);
    } catch (error) {
      console.error(`Error writing to chat log: ${error.message}`);
    }
  }
  
  async logFiltered(username, message) {
    if (!this.filteredLogPath) return;
    
    const timestamp = this.getCurrentTime();
    const logMessage = `[${timestamp}] ${username}: ${message}\n`;
    
    try {
      await fs.appendFile(this.filteredLogPath, logMessage, 'utf8');
    } catch (error) {
      console.error(`Error writing to filtered log: ${error.message}`);
    }
  }
  
  async logPlayerJoin(username) {
    if (!this.chatLogPath) return;
    
    const timestamp = this.getCurrentTime();
    const logMessage = `[${timestamp}] ${username} joined the game\n`;
    
    try {
      await fs.appendFile(this.chatLogPath, logMessage, 'utf8');
      console.log(`[${timestamp}] ${username} joined the game`);
    } catch (error) {
      console.error(`Error writing to chat log: ${error.message}`);
    }
  }
  
  async logPlayerLeft(username) {
    if (!this.chatLogPath) return;
    
    const timestamp = this.getCurrentTime();
    const logMessage = `[${timestamp}] ${username} left the game\n`;
    
    try {
      await fs.appendFile(this.chatLogPath, logMessage, 'utf8');
      console.log(`[${timestamp}] ${username} left the game`);
    } catch (error) {
      console.error(`Error writing to chat log: ${error.message}`);
    }
  }
  
  async getLogFiles() {
    try {
      const logFiles = await fs.readdir(this.fileManager.paths.logs);
      return logFiles;
    } catch (error) {
      console.error(`Error reading log directory: ${error.message}`);
      return [];
    }
  }
  
  async getLogContent(logFileName) {
    try {
      const logPath = path.join(this.fileManager.paths.logs, logFileName);
      const content = await fs.readFile(logPath, 'utf8');
      return content;
    } catch (error) {
      console.error(`Error reading log file: ${error.message}`);
      return null;
    }
  }
}

module.exports = { LogService };
