    const socket = io();

    // DOM Elements
    const commandInput = document.getElementById('command-input');
    const logsDiv = document.getElementById('logs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    let config = {};

    commandInput.addEventListener('keyup', handleEnterKey);

    // Tab functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            window.location.href = `/${tabName}`;
        });
    });

    // Socket Event Listeners
    socket.on('chat', handleChatMessage);
    socket.on('filtered', handleFilteredMessage);
    socket.on('status', handleStatusMessage);
    socket.on('error', handleErrorMessage);
    socket.on('command-executed', handleCommandExecuted);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left',handlePlayerLeft);

    socket.on('config', (config) => {
      console.log('Received config:', config);
      // Update your UI with the config data
      MainConfig = config;
    });

    /**
     * Handles the send button click event to send a command.
     */
    function handleSendCommand() {
      const command = commandInput.value.trim();
      if (command) {
        sendCommand(command);
        logStatusCommand(`[WebConsole]: ${command}`);
        commandInput.value = '';
      }
    }

    /**
     * Handles the Enter key press in the command input field.
     * @param {KeyboardEvent} event
     */
    function handleEnterKey(event) {
      if (event.key === 'Enter') {
        handleSendCommand();
      }
    }

    /**
     * Sends a command to the server via Socket.IO.
     * @param {string} command - The command to send.
     */
    function sendCommand(command) {
      socket.emit('command', command);
    }

    /**
     * Appends a status message to the logs.
     * @param {string} message - The status message to log.
     */
    function logStatusCommand(message) {
      appendLog(message, 'status');
    }

    /**
     * Appends a chat message to the logs.
     * @param {Object} data - The chat data containing username and message.
     */
    function logChatCommand(data) {
      const message = `<${sanitize(data.username)}> ${sanitize(data.message)}`;
      appendLog(message, 'chat');
    }

    /**
     * Appends a command-executed message to the logs with the bot's name in orange.
     * @param {Object} data - The data containing bot and command information.
     */
    function logCommandExecuted(data) {
      const botName = sanitize(data.bot);
      const command = sanitize(data.command);
      const message = `Command executed on ${botName}: ${command}`;
      appendLog(message, 'status', false);
    }

    function logPlayerJoined(player) {
      const message = `${player} joined the game`;
      appendLog(message, 'status', false);
    }

    function logPlayerLeft(player) {
      const message = `${player} left the game`;
      appendLog(message, 'status', false);
    }

    /**
     * Appends a filtered message to the logs.
     * @param {Object} data - The filtered data containing username and message.
     */
    function logFilteredMessage(data) {
      const message = `<${sanitize(data.username)}> ${sanitize(data.message)}`;
      appendLog(message, 'filtered');
    }

    /**
     * Appends an error message to the logs.
     * @param {string} message - The error message to log.
     */
    function logErrorMessage(message) {
      const sanitizedMessage = sanitize(message);
      appendLog(sanitizedMessage, 'error');
    }

    /**
     * Generic function to append messages to the logs.
     * @param {string} message - The message to append.
     * @param {string} type - The type/category of the message (e.g., 'chat', 'status').
     * @param {boolean} allowHTML - Whether to allow HTML in the message.
     */
    function appendLog(message, type, allowHTML = false) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('log-message', type);
      if (allowHTML) {
        messageDiv.innerHTML = message;
      } else {
        messageDiv.textContent = message;
      }
      logsDiv.appendChild(messageDiv);
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }

    /**
     * Socket.IO event handler for 'chat' messages.
     * @param {Object} data - The chat data.
     */
    function handleChatMessage(data) {
      logChatCommand(data);
    }

    /**
     * Socket.IO event handler for 'filtered' messages.
     * @param {Object} data - The filtered data.
     */
    function handleFilteredMessage(data) {
      logFilteredMessage(data);
    }

    /**
     * Socket.IO event handler for 'status' messages.
     * @param {string} message - The status message.
     */
    function handleStatusMessage(message) {
      logStatusCommand(message);
    }

    /**
     * Socket.IO event handler for 'error' messages.
     * @param {string} message - The error message.
     */
    function handleErrorMessage(message) {
      logErrorMessage(message);
    }

    /**
     * Socket.IO event handler for 'command-executed' messages.
     * @param {Object} data - The command execution data.
     */
    function handleCommandExecuted(data) {
      logCommandExecuted(data);
    }

    function handlePlayerJoined(player) {
      logPlayerJoined(player);
    }

    function handlePlayerLeft(player) {
      logPlayerLeft(player);
    }

    /**
     * Sanitizes input to prevent XSS attacks.
     * @param {string} str - The string to sanitize.
     * @returns {string} - The sanitized string.
     */
    function sanitize(str) {
      const temp = document.createElement('div');
      temp.textContent = str;
      return temp.innerHTML;
    }

    function testLogs() {
      logChatCommand({ username: 'User1', message: 'Hello, World!' });
      logStatusCommand('This is a status message.');
      logFilteredMessage({ username: 'User2', message: 'Filtered message.' });
      logErrorMessage('This is an error message.');
      logCommandExecuted({ bot: 'Bot1', command: '!command' });
      logPlayerJoined('Player1');
      logPlayerLeft('Player2');
    }
