    const socket = io();

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    let config = {};

    // Tab functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            window.location.href = `/${tabName}`;
        });
    });

    // Socket Event Listeners
    socket.on('config', (config) => {
      console.log('Received config:', config);
      // Update your UI with the config data
      MainConfig = config;
    });

    socket.on('script.list', (list) => {
      console.log('Received script list:', list);
      // Update your UI with the config data
      ScriptList = list;
    });

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

    function sendCommand(command) {
      socket.emit('command', command);
    }

    function createScript(data) {
      socket.emit('script.new', data);
    }

    function editScript(data) {
      socket.emit('script.edit', data);
    }

    function deleteScript(data) {
      socket.emit('script.delete', data);
    }

    function readScript(data) {
      socket.emit('script.read', data);e
      socket.on('script.', (scriptContent) => {
        // Update the textarea with the script content
        document.getElementById('script-content').value = scriptContent;
      });
    }

    function runScript(scriptName) {
      sendCommand(`runscript ${scriptName}`);
    }