document.addEventListener('DOMContentLoaded', function() {
  const socket = io();
  const app = {
    activeTab: 'chat',
    bots: [],
    scripts: [],
    configs: [],
    logs: [],
    activeBotIndex: 0,
    activeScriptName: null,
    activeConfigName: null,
    activeLogName: null,
    
    init: function() {
      this.setupTabNavigation();
      this.setupSocketListeners();
      this.setupUIHandlers();
      this.checkConnectionStatus();
    },
    
    setupTabNavigation: function() {
      const tabButtons = document.querySelectorAll('.tab-button');
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabName = button.getAttribute('data-tab');
          this.switchTab(tabName);
        });
      });
    },
    
    switchTab: function(tabName) {
      const tabs = document.querySelectorAll('.tab-content');
      const tabButtons = document.querySelectorAll('.tab-button');
      
      tabs.forEach(tab => tab.classList.remove('active'));
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      document.getElementById(tabName).classList.add('active');
      document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
      
      this.activeTab = tabName;
    },
    
    setupSocketListeners: function() {
      // Status updates
      socket.on('status', message => {
        this.showNotification('info', message);
        console.log('Status:', message);
      });
      
      socket.on('error', message => {
        this.showNotification('error', message);
        console.error('Error:', message);
      });
      
      // Chat messages
      socket.on('chat', data => {
        this.addChatMessage(data.username, data.message);
      });
      
      // Player events
      socket.on('player-joined', username => {
        this.addSystemMessage(`${username} joined the game`);
        this.updatePlayerList();
      });
      
      socket.on('player-left', username => {
        this.addSystemMessage(`${username} left the game`);
        this.updatePlayerList();
      });
      
      // Bot updates
      socket.on('bot.list', bots => {
        this.bots = bots;
        this.updateBotsList();
      });
      
      // Script updates
      socket.on('script.list', scripts => {
        this.scripts = scripts;
        this.updateScriptsList();
      });
      
      socket.on('script.content', data => {
        this.activeScriptName = data.name;
        document.getElementById('script-name').value = data.name.replace('.cls', '');
        document.getElementById('script-content').value = data.content;
      });
      
      // Config updates
      socket.on('config.list', configs => {
        this.configs = configs;
        this.updateConfigsList();
      });
      
      socket.on('config.current', config => {
        this.populateConfigForm(config);
      });
      
      // Log updates
      socket.on('logs.list', logs => {
        this.logs = logs;
        this.updateLogsList();
      });
      
      socket.on('log.content', data => {
        this.activeLogName = data.name;
        document.getElementById('current-log-name').textContent = data.name;
        document.getElementById('log-content').textContent = data.content;
      });
    },
    
    setupUIHandlers: function() {
      // Chat message sending
      const messageInput = document.getElementById('message-input');
      const sendButton = document.getElementById('send-button');
      
      const sendMessage = () => {
        const message = messageInput.value.trim();
        if (message) {
          socket.emit('bot.command', { command: `say ${message}` });
          messageInput.value = '';
        }
      };
      
      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
      });
      
      // Bot controls
      document.getElementById('connect-bots').addEventListener('click', () => {
        socket.emit('bot.connect');
      });
      
      document.getElementById('disconnect-bots').addEventListener('click', () => {
        socket.emit('bot.disconnect');
      });
      
      document.getElementById('add-bot').addEventListener('click', () => {
        this.showModal('add-bot-modal');
      });
      
      document.getElementById('add-bot-submit').addEventListener('click', () => {
        const username = document.getElementById('new-bot-username').value.trim();
        const server = document.getElementById('new-bot-server').value.trim();
        const port = document.getElementById('new-bot-port').value.trim();
        const version = document.getElementById('new-bot-version').value.trim();
        
        if (username && server) {
          socket.emit('bot.create', {
            username,
            host: server,
            port: port || 25565,
            version: version || undefined
          });
          this.hideModal('add-bot-modal');
          this.resetModalForm('add-bot-modal');
        } else {
          this.showNotification('error', 'Username and server are required');
        }
      });
      
      document.getElementById('add-bot-cancel').addEventListener('click', () => {
        this.hideModal('add-bot-modal');
        this.resetModalForm('add-bot-modal');
      });
      
      // Script controls
      document.getElementById('new-script').addEventListener('click', () => {
        document.getElementById('script-name').value = '';
        document.getElementById('script-content').value = '';
        this.activeScriptName = null;
      });
      
      document.getElementById('save-script').addEventListener('click', () => {
        const name = document.getElementById('script-name').value.trim();
        const content = document.getElementById('script-content').value;
        
        if (name) {
          socket.emit('script.save', {
            name: name.endsWith('.cls') ? name : `${name}.cls`,
            content
          });
        } else {
          this.showNotification('error', 'Script name is required');
        }
      });
      
      document.getElementById('run-script').addEventListener('click', () => {
        const name = document.getElementById('script-name').value.trim();
        
        if (name) {
          socket.emit('script.run', {
            name: name.endsWith('.cls') ? name : `${name}.cls`
          });
        } else {
          this.showNotification('error', 'Script name is required');
        }
      });
      
      // Config controls
      document.getElementById('new-config').addEventListener('click', () => {
        document.getElementById('config-name').value = '';
        this.resetConfigForm();
        this.activeConfigName = null;
      });
      
      document.getElementById('save-config').addEventListener('click', () => {
        const name = document.getElementById('config-name').value.trim();
        
        if (name) {
          const config = this.getConfigFromForm();
          socket.emit('config.save', {
            name: name.endsWith('.clc') ? name : `${name}.clc`,
            config
          });
        } else {
          this.showNotification('error', 'Configuration name is required');
        }
      });
      
      document.getElementById('load-config').addEventListener('click', () => {
        if (this.activeConfigName) {
          socket.emit('config.load', this.activeConfigName);
        } else {
          this.showNotification('error', 'No configuration selected');
        }
      });
      
      // Log controls
      document.getElementById('refresh-log').addEventListener('click', () => {
        if (this.activeLogName) {
          socket.emit('log.read', this.activeLogName);
        }
      });
      
      document.getElementById('download-log').addEventListener('click', () => {
        if (this.activeLogName) {
          const logContent = document.getElementById('log-content').textContent;
          const blob = new Blob([logContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = this.activeLogName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
      
      // Modal close buttons
      document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
          const modal = button.closest('.modal');
          if (modal) {
            this.hideModal(modal.id);
          }
        });
      });
    },
    
    checkConnectionStatus: function() {
      setInterval(() => {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (socket.connected) {
          statusDot.classList.add('connected');
          statusText.textContent = 'Connected';
        } else {
          statusDot.classList.remove('connected');
          statusText.textContent = 'Disconnected';
        }
      }, 1000);
    },
    
    addChatMessage: function(username, message) {
      const chatMessages = document.querySelector('.chat-messages');
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      
      const timestamp = new Date().toTimeString().split(' ')[0];
      messageElement.innerHTML = `
        <span class="timestamp">${timestamp}</span>
        <span class="username">${username}:</span>
        <span class="content">${this.escapeHtml(message)}</span>
      `;
      
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    addSystemMessage: function(message) {
      const chatMessages = document.querySelector('.chat-messages');
      const messageElement = document.createElement('div');
      messageElement.className = 'message system';
      
      const timestamp = new Date().toTimeString().split(' ')[0];
      messageElement.innerHTML = `
        <span class="timestamp">${timestamp}</span>
        <span class="content">System: ${this.escapeHtml(message)}</span>
      `;
      
      chatMessages.appendChild(messageElement);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    updatePlayerList: function() {
      socket.emit('players.get', {}, (players) => {
        const playerListContainer = document.querySelector('.player-list-container');
        playerListContainer.innerHTML = '';
        
        if (players && players.length > 0) {
          players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.textContent = player.username;
            playerListContainer.appendChild(playerElement);
          });
        } else {
          playerListContainer.innerHTML = '<p>No players online</p>';
        }
      });
    },
    
    updateBotsList: function() {
      const botsListContainer = document.querySelector('.bots-list');
      botsListContainer.innerHTML = '';
      
      if (this.bots.length === 0) {
        botsListContainer.innerHTML = '<p>No bots available</p>';
        return;
      }
      
      this.bots.forEach((bot, index) => {
        const botCard = document.createElement('div');
        botCard.className = 'bot-card';
        
        const statusClass = bot.connected ? 'connected' : '';
        const statusText = bot.connected ? 'Connected' : 'Disconnected';
        
        botCard.innerHTML = `
          <div class="bot-card-header">
            <h3>${bot.username}</h3>
            <div class="bot-status">
              <span class="status-dot ${statusClass}"></span>
              <span>${statusText}</span>
            </div>
          </div>
          <div class="bot-details">
            <p><strong>Server:</strong> ${bot.server}</p>
            ${bot.position ? `<p><strong>Position:</strong> X: ${Math.round(bot.position.x)}, Y: ${Math.round(bot.position.y)}, Z: ${Math.round(bot.position.z)}</p>` : ''}
            ${bot.health ? `<p><strong>Health:</strong> ${bot.health.health}/20</p>` : ''}
          </div>
          <div class="bot-controls">
            <button class="action-button set-active-bot" data-index="${index}">Set Active</button>
            <button class="action-button ${bot.connected ? 'disconnect-bot' : 'connect-bot'}" data-index="${index}">
              ${bot.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        `;
        
        botsListContainer.appendChild(botCard);
      });
      
      // Add event listeners for bot control buttons
      document.querySelectorAll('.set-active-bot').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.getAttribute('data-index'), 10);
          socket.emit('bot.setActive', index);
          this.activeBotIndex = index;
          this.showNotification('info', `Set ${this.bots[index].username} as active bot`);
        });
      });
      
      document.querySelectorAll('.connect-bot').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.getAttribute('data-index'), 10);
          socket.emit('bot.connect', { botIndex: index });
        });
      });
      
      document.querySelectorAll('.disconnect-bot').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.getAttribute('data-index'), 10);
          socket.emit('bot.disconnect', { botIndex: index });
        });
      });
    },
    
    updateScriptsList: function() {
      const scriptsListContainer = document.querySelector('.scripts-list-container');
      scriptsListContainer.innerHTML = '';
      
      if (this.scripts.length === 0) {
        scriptsListContainer.innerHTML = '<p>No scripts available</p>';
        return;
      }
      
      this.scripts.forEach(script => {
        const scriptItem = document.createElement('div');
        scriptItem.className = 'script-item';
        if (script === this.activeScriptName) {
          scriptItem.classList.add('active');
        }
        
        const scriptName = document.createElement('span');
        scriptName.textContent = script;
        scriptItem.appendChild(scriptName);
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'script-item-actions';
        
        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Edit script';
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          socket.emit('script.load', script);
        });
        
        const runButton = document.createElement('button');
        runButton.innerHTML = '<i class="fas fa-play"></i>';
        runButton.title = 'Run script';
        runButton.addEventListener('click', (e) => {
          e.stopPropagation();
          socket.emit('script.run', { name: script });
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Delete script';
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete "${script}"?`)) {
            socket.emit('script.delete', script);
          }
        });
        
        actionsContainer.appendChild(editButton);
        actionsContainer.appendChild(runButton);
        actionsContainer.appendChild(deleteButton);
        scriptItem.appendChild(actionsContainer);
        
        scriptItem.addEventListener('click', () => {
          socket.emit('script.load', script);
        });
        
        scriptsListContainer.appendChild(scriptItem);
      });
    },
    
    updateConfigsList: function() {
      const configsListContainer = document.querySelector('.config-list-container');
      configsListContainer.innerHTML = '';
      
      if (this.configs.length === 0) {
        configsListContainer.innerHTML = '<p>No configurations available</p>';
        return;
      }
      
      this.configs.forEach(config => {
        const configItem = document.createElement('div');
        configItem.className = 'config-item';
        if (config === this.activeConfigName) {
          configItem.classList.add('active');
        }
        
        const configName = document.createElement('span');
        configName.textContent = config;
        configItem.appendChild(configName);
        
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'config-item-actions';
        
        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Edit configuration';
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          socket.emit('config.read', config);
          this.activeConfigName = config;
        });
        
        const loadButton = document.createElement('button');
        loadButton.innerHTML = '<i class="fas fa-upload"></i>';
        loadButton.title = 'Load configuration';
        loadButton.addEventListener('click', (e) => {
          e.stopPropagation();
          socket.emit('config.load', config);
        });
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Delete configuration';
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete "${config}"?`)) {
            socket.emit('config.delete', config);
          }
        });
        
        actionsContainer.appendChild(editButton);
        actionsContainer.appendChild(loadButton);
        actionsContainer.appendChild(deleteButton);
        configItem.appendChild(actionsContainer);
        
        configItem.addEventListener('click', () => {
          socket.emit('config.read', config);
          this.activeConfigName = config;
        });
        
        configsListContainer.appendChild(configItem);
      });
    },
    
    updateLogsList: function() {
      const logsListContainer = document.querySelector('.logs-list-container');
      logsListContainer.innerHTML = '';
      
      if (this.logs.length === 0) {
        logsListContainer.innerHTML = '<p>No log files available</p>';
        return;
      }
      
      this.logs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        if (log === this.activeLogName) {
          logItem.classList.add('active');
        }
        
        logItem.textContent = log;
        logItem.addEventListener('click', () => {
          socket.emit('log.read', log);
        });
        
        logsListContainer.appendChild(logItem);
      });
    },
    
    populateConfigForm: function(config) {
      if (!config) return;
      
      document.getElementById('config-name').value = this.activeConfigName || '';
      document.getElementById('server-ip').value = config.serverIP || '';
      document.getElementById('server-port').value = config.serverPort || '25565';
      document.getElementById('prefix').value = config.prefix || '!!';
      document.getElementById('bot-count').value = config.botCount || 1;
      document.getElementById('username-base').value = config.username || 'Bot';
      document.getElementById('trusted-users').value = (config.trustedUsers || []).join(',');
      document.getElementById('use-filtering').checked = config.useFiltering || false;
      document.getElementById('whitelisted-words').value = (config.whitelistedWords || []).join(',');
    },
    
    getConfigFromForm: function() {
      return {
        serverIP: document.getElementById('server-ip').value,
        serverPort: document.getElementById('server-port').value,
        prefix: document.getElementById('prefix').value,
        botCount: document.getElementById('bot-count').value,
        username: document.getElementById('username-base').value,
        trustedUsers: document.getElementById('trusted-users').value.split(',').map(u => u.trim()).filter(u => u),
        useFiltering: document.getElementById('use-filtering').checked,
        whitelistedWords: document.getElementById('whitelisted-words').value.split(',').map(w => w.trim()).filter(w => w)
      };
    },
    
    resetConfigForm: function() {
      document.getElementById('server-ip').value = 'localhost';
      document.getElementById('server-port').value = '25565';
      document.getElementById('prefix').value = '!!';
      document.getElementById('bot-count').value = '1';
      document.getElementById('username-base').value = 'Bot';
      document.getElementById('trusted-users').value = '';
      document.getElementById('use-filtering').checked = false;
      document.getElementById('whitelisted-words').value = '';
    },
    
    showModal: function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
      }
    },
    
    hideModal: function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('active');
      }
    },
    
    resetModalForm: function(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        const inputs = modal.querySelectorAll('input');
        inputs.forEach(input => {
          input.value = '';
        });
      }
    },
    
    showNotification: function(type, message) {
      const notifications = document.querySelector('.notifications');
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      
      notification.innerHTML = `
        <i class="fas fa-${this.getNotificationIcon(type)}"></i>
        <span>${this.escapeHtml(message)}</span>
        <button class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
      });
      
      notifications.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode === notifications) {
          notification.remove();
        }
      }, 5000);
    },
    
    getNotificationIcon: function(type) {
      switch(type) {
        case 'error': return 'exclamation-circle';
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': default: return 'info-circle';
      }
    },
    
    escapeHtml: function(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };
  
  app.init();
});
