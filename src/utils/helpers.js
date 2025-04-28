 
const chalk = require('chalk');
const readline = require('readline');

class Helpers {
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // Returns HH:MM:SS
  }
  
  static formatDateTime() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }
  
  static async askQuestion(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    try {
      return new Promise(resolve => {
        rl.question(query, (answer) => {
          resolve(answer);
          rl.close();
        });
      });
    } catch (error) {
      rl.close();
      throw error;
    }
  }
  
  static async askMultipleQuestions(questions) {
    const answers = {};
    
    for (const [key, question] of Object.entries(questions)) {
      answers[key] = await this.askQuestion(question);
    }
    
    return answers;
  }
  
  static logInfo(message) {
    console.log(chalk.cyan(`[${this.getCurrentTime()}] [INFO] ${message}`));
  }
  
  static logSuccess(message) {
    console.log(chalk.green(`[${this.getCurrentTime()}] [SUCCESS] ${message}`));
  }
  
  static logWarning(message) {
    console.log(chalk.yellow(`[${this.getCurrentTime()}] [WARNING] ${message}`));
  }
  
  static logError(message) {
    console.error(chalk.red(`[${this.getCurrentTime()}] [ERROR] ${message}`));
  }
  
  static parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowercased = value.toLowerCase().trim();
      return lowercased === 'true' || lowercased === 'yes' || lowercased === 'y' || lowercased === '1';
    }
    return Boolean(value);
  }
  
  static isValidMinecraftUsername(username) {
    // Minecraft username rules: 3-16 characters, only alphanumeric and underscore
    return /^[a-zA-Z0-9_]{3,16}$/.test(username);
  }
  
  static isValidIP(ip) {
    // Simplified IP validation - accepts domains and IPv4
    return /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]+)?(\.[a-zA-Z]{2,})+$|^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }
  
  static isValidPort(port) {
    const numPort = parseInt(port, 10);
    return !isNaN(numPort) && numPort > 0 && numPort <= 65535;
  }
  
  static validateConfig(config) {
    const errors = [];
    
    if (!config.serverIP || !this.isValidIP(config.serverIP)) {
      errors.push('Invalid server IP address');
    }
    
    if (!config.serverPort || !this.isValidPort(config.serverPort)) {
      errors.push('Invalid server port');
    }
    
    if (config.botCount < 1) {
      errors.push('Bot count must be at least 1');
    }
    
    if (config.usernames.length === 0) {
      errors.push('At least one bot username must be provided');
    }
    
    config.usernames.forEach(username => {
      if (!this.isValidMinecraftUsername(username)) {
        errors.push(`Invalid Minecraft username: ${username}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = { Helpers };
