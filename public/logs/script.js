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
