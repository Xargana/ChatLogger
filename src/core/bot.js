const mineflayer = require('mineflayer');
const { EventEmitter } = require('events');

class Bot extends EventEmitter {
  constructor(options) {
    super();
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 25565,
      username: options.username || 'Bot',
      password: options.password,
      version: options.version,
      auth: options.auth || 'mojang'
    };
    
    this.trustedUsers = options.trustedUsers || [];
    this.prefix = options.prefix || '!!';
    this.useFiltering = options.useFiltering || false;
    this.whitelistedWords = options.whitelistedWords || [];
    this.bot = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }
  
  async connect() {
    try {
      this.emit('status', `Connecting ${this.options.username} to ${this.options.host}:${this.options.port}...`);
      
      this.bot = mineflayer.createBot(this.options);
      
      this._registerEventListeners();
      
      return new Promise((resolve, reject) => {
        this.bot.once('spawn', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('status', `Bot ${this.options.username} connected successfully`);
          resolve(this.bot);
        });
        
        this.bot.once('error', (err) => {
          this.emit('error', `Connection error: ${err.message}`);
          reject(err);
        });
        
        // Set a timeout for the connection
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000); // 30 seconds timeout
        
        this.bot.once('spawn', () => clearTimeout(timeout));
        this.bot.once('error', () => clearTimeout(timeout));
      });
    } catch (error) {
      this.emit('error', `Failed to create bot: ${error.message}`);
      throw error;
    }
  }
  
  _registerEventListeners() {
    if (!this.bot) return;
    
    this.bot.on('chat', (username, message) => {
      // Don't process messages from self
      if (username === this.bot.username) return;
      
      // Log all chat messages
      this.emit('chat', { username, message });
      
      // Process command if from trusted user and starts with prefix
      if (this.trustedUsers.includes(username) && message.startsWith(this.prefix)) {
        const command = message.slice(this.prefix.length).trim();
        this.emit('command', { username, command });
      }
      
      // Log filtered messages if filtering is enabled
      if (this.useFiltering && this.whitelistedWords.some(word => message.includes(word))) {
        this.emit('filtered', { username, message });
      }
    });
    
    this.bot.on('playerJoined', (player) => {
      this.emit('playerJoined', player.username);
    });
    
    this.bot.on('playerLeft', (player) => {
      this.emit('playerLeft', player.username);
    });
    
    this.bot.on('kicked', (reason) => {
      this.connected = false;
      this.emit('kicked', reason);
      this._attemptReconnect();
    });
    
    this.bot.on('end', () => {
      this.connected = false;
      this.emit('disconnected');
      this._attemptReconnect();
    });
    
    this.bot.on('error', (error) => {
      this.emit('error', error.message);
    });
    
    // Additional events for enhanced functionality
    this.bot.on('death', () => {
      this.emit('death', {
        position: this.bot.entity.position,
        cause: 'unknown'
      });
    });
    
    this.bot.on('health', () => {
      if (this.bot.health <= 5) {
        this.emit('lowHealth', this.bot.health);
      }
    });
    
    this.bot.on('spawn', () => {
      this.emit('spawn', this.bot.entity.position);
    });
  }
  
  async _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', `Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }
    
    this.reconnectAttempts++;
    this.emit('status', `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Exponential backoff for reconnection attempts
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.connect();
    } catch (error) {
      this.emit('error', `Reconnection attempt failed: ${error.message}`);
    }
  }
  
  disconnect() {
    if (this.bot) {
      this.bot.quit();
      this.bot = null;
      this.connected = false;
      this.emit('status', `Bot ${this.options.username} disconnected`);
    }
  }
  
  chat(message) {
    if (!this.bot || !this.connected) {
      this.emit('error', 'Cannot send message: Bot not connected');
      return false;
    }
    
    try {
      this.bot.chat(message);
      return true;
    } catch (error) {
      this.emit('error', `Failed to send message: ${error.message}`);
      return false;
    }
  }
  
  whisper(username, message) {
    return this.chat(`/msg ${username} ${message}`);
  }
  
  setControlState(control, state) {
    if (!this.bot || !this.connected) {
      this.emit('error', 'Cannot set control state: Bot not connected');
      return false;
    }
    
    try {
      this.bot.setControlState(control, state);
      return true;
    } catch (error) {
      this.emit('error', `Failed to set control state: ${error.message}`);
      return false;
    }
  }
  
  look(yaw, pitch, force = false) {
    if (!this.bot || !this.connected) {
      this.emit('error', 'Cannot look: Bot not connected');
      return false;
    }
    
    try {
      this.bot.look(yaw, pitch, force);
      return true;
    } catch (error) {
      this.emit('error', `Failed to look: ${error.message}`);
      return false;
    }
  }
  
  dig(block) {
    if (!this.bot || !this.connected) {
      this.emit('error', 'Cannot dig: Bot not connected');
      return false;
    }
    
    try {
      if (!block) {
        block = this.bot.blockAtCursor(5);
        if (!block) {
          this.emit('error', 'No block in range to dig');
          return false;
        }
      }
      
      this.bot.dig(block);
      return true;
    } catch (error) {
      this.emit('error', `Failed to dig: ${error.message}`);
      return false;
    }
  }
  
  getPosition() {
    if (!this.bot || !this.connected || !this.bot.entity) {
      return null;
    }
    return this.bot.entity.position;
  }
  
  getHealth() {
    if (!this.bot || !this.connected) {
      return null;
    }
    return {
      health: this.bot.health,
      food: this.bot.food,
      saturation: this.bot.foodSaturation
    };
  }
  
  getInventory() {
    if (!this.bot || !this.connected || !this.bot.inventory) {
      return [];
    }
    
    return this.bot.inventory.items().map(item => ({
      name: item.name,
      count: item.count,
      slot: item.slot
    }));
  }
  
  getNearbyPlayers(radius = 30) {
    if (!this.bot || !this.connected || !this.bot.players) {
      return [];
    }
    
    const botPosition = this.getPosition();
    if (!botPosition) return [];
    
    return Object.values(this.bot.players)
      .filter(player => player.entity && player.entity.position)
      .map(player => {
        const distance = botPosition.distanceTo(player.entity.position);
        return {
          username: player.username,
          distance: Math.round(distance * 10) / 10,
          position: player.entity.position
        };
      })
      .filter(player => player.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }
}

module.exports = { Bot };
