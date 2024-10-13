    const socket = io();

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const configsDiv = document.getElementById('configs');
    const configName = document.getElementById('config-name');
    const buttonImport = document.getElementById('button-import');
    const buttonNew = document.getElementById('button-new');
    const buttonSave = document.getElementById('button-save');
    const buttonDelete = document.getElementById('button-delete');
    const buttonRefrash = document.getElementById('button-refresh');
    const buttonSet = document.getElementById('button-set');
    let config = {};
    let selectedConfig = '';
    var MainConfig = {};
    var ConfigList = [];

const configButtons = document.querySelectorAll('.config')
configButtons.forEach(button => {
    button.addEventListener('click', () => {
        readConfig(button.textContent + '.clc')
    })
})


    
    
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

    socket.on('config.list', (list) => {
      console.log('Received config list:', list);
      // Update your UI with the config data
      ConfigList = list;
    });

getList();

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

    function getList() {
      socket.emit('config.get_list');
      socket.on('config.list', (list) => {
        // Update your UI with the config data
        ConfigList = list;

        // Create buttons for each config
        configsDiv.innerHTML = ''; // Clear existing content
        list.forEach(configName => {
          const button = document.createElement('button');
          button.className = 'config';
          button.textContent = configName.replace('.clc', '');
          button.setAttribute('onclick', `readConfig('${configName}')`);
          configsDiv.appendChild(button);
        });
      });
    }

    function createConfig(data) {
      socket.emit('config.new', data);
      getList();

    }
      function editConfig(data) {
        if (data.oldName !== data.newName) {
          socket.emit('config.rename', { oldName: data.oldName, newName: data.newName });
          selectedConfig = data.newName;
        }
        socket.emit('config.edit', { name: data.newName, code: data.code });
        getList();
      }

      function editConfigFromWeb() {
        const data = {
          serverIP: document.querySelector('#serverIP input').value,
          serverPort: document.querySelector('#serverPort input').value,
          version: document.querySelector('#version input').value,
          bot_amount: document.querySelector('#bot_amount input').value,
          useLogin: document.querySelector('#useLogin input[type="checkbox"]').checked.toString(),
          username: document.querySelector('#username input').value,
          password: document.querySelector('#password input').value,
          useFiltering: document.querySelector('#useFiltering input[type="checkbox"]').checked.toString(),
          whitelistedWords: document.querySelector('#whitelistedWords input').value,
          trustedUsers: document.querySelector('#trustedUsers input').value,
          prefix: document.querySelector('#prefix input').value
        };

        editConfig({
          oldName: selectedConfig,
          newName: `${configName.value}.clc`,
          code: data
        });
      }
    function deleteConfig(data) {
      console.log(`deleted ${data}`)
      socket.emit('config.delete', data);
      getList();
      if (selectedConfig === data) {
        resetConfig();
      }
    }

    
    

// Add event listener for 'Delete' key on config buttons
document.addEventListener('keydown', function(event) {
  if (event.key === 'Delete' && event.target.classList.contains('config')) {
    event.preventDefault();
    const configName = event.target.textContent + '.clc';
    deleteConfig(configName);
  }
});

function generateUniqueName(baseName, existingNames) {
  let newName = baseName;
  let counter = 1;
  while (existingNames.includes(newName)) {
    newName = `${baseName.replace('.clc', `(${counter}).clc`)}`;
    counter++;
  }
  return newName;
}

    function createConfigFromWeb() {

          socket.emit('config.get_list');
          socket.once('config.list', (list) => {
            const uniqueName = generateUniqueName('new_config.clc', list);
            createConfig(data={name: uniqueName, code: {
              "serverIP": "localhost",
              "serverPort": "25565",
              "version": "1.20.4",
              "bot_amount": "1",
              "useLogin": "true",
              "username": "Bot1",
              "password": "Password",
              "useFiltering": "true",
              "whitelistedWords": "word1, word2",
              "trustedUsers": "player1, player2",
              "prefix": "!!"
          }});
          });
    }

    function handleKey(event) {
      if (event.key === 'Enter') {
        editConfigFromWeb();
      }
    }
    document.querySelectorAll('#serverIP input, #serverPort input, #version input, #bot_amount input, #useLogin input, #password input, #username input, #useFiltering input, #whitelistedWords input, #trustedUsers input, #prefix input, #configName').forEach(input => {
        input.addEventListener('keypress', handleKey);
    });



function importConfig(data) {
  socket.emit('config.get_list');
  socket.once('config.list', (list) => {
    const uniqueName = generateUniqueName(data.name, list);
    const convertedContent = convertToJSON(data.content);
    createConfig({name: uniqueName, code: convertedContent});
  });
}

function convertToJSON(text) {
  const lines = text.split('\n');
  const jsonObject = {};
  
  lines.forEach(line => {
    const [key, value] = line.trim().split(':').map(item => item.trim());
    if (key && value) {
      jsonObject[key] = value;
    }
  });

  return JSON.stringify(jsonObject, null, 2);
}

function importConfigFromWeb() {
  buttonImport.onchange = function(event) {
    const file = event.target.files[0];
    if (file) {
      console.log('File selected:', file.name);
      const reader = new FileReader();
      reader.onload = function(e) {
        const content = e.target.result;
        importScript({name: file.name, content: content});
      };
      reader.readAsText(file);
    }
  };

  fileInput.click();
}

document.getElementById('config-import-btn').addEventListener('click', function() {
  document.getElementById('config-import').click();
});

document.getElementById('config-import').addEventListener('change', function() {
  console.log('File selected:', this.files[0].name);
  const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const content = e.target.result;
        importConfig({name: file.name, content: content});
      };
      reader.readAsText(file);
    }
  // You can add your file import logic here
});



// Add event listener for Ctrl+S on the whole document
document.addEventListener('keydown', function(event) {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault(); // Prevent the default save action
    editConfigFromWeb();
  }
});
    

    function deleteConfigFromWeb() {
      deleteConfig(selectedConfig);
    }

    function setConfigFromWeb() {
      const data = {
        serverIP: document.querySelector('#serverIP input').value,
        serverPort: document.querySelector('#serverPort input').value,
        version: document.querySelector('#version input').value,
        bot_amount: document.querySelector('#bot_amount input').value,
        useLogin: document.querySelector('#useLogin input[type="checkbox"]').checked.toString(),
        username: document.querySelector('#username input').value,
        password: document.querySelector('#password input').value,
        useFiltering: document.querySelector('#useFiltering input[type="checkbox"]').checked.toString(),
        whitelistedWords: document.querySelector('#whitelistedWords input').value,
        trustedUsers: document.querySelector('#trustedUsers input').value,
        prefix: document.querySelector('#prefix input').value
      };

      socket.emit('config.set', data);
      config = data;
    }

    let configSendListener = null;

    function readConfig(data) {
      // Remove previous listener if it exists
      if (configSendListener) {
        socket.off('config.send', configSendListener);
      }

      // Create new listener
      configSendListener = (configContent) => {
        configName.value = data.replace('.clc', '');
        selectedConfig = data;
        console.log(configContent)
        const configButtons = document.querySelectorAll('.config');
        configButtons.forEach(button => {
        if (button.innerText === selectedConfig.replace('.clc', '')) {
          button.id = 'selectedConfig';
        } else {
          button.removeAttribute('id');
        }
      });
        setConfigFromJSON(configContent);
      };

      // Add the new listener
      socket.on('config.send', configSendListener);

      // Emit the read request
      socket.emit('config.read', `configs/${data}`);
    }

    function setConfig(data) {
      socket.emit('config.set', data);
    }


// Get the necessary elements
const useFilteringCheckbox = document.querySelector('#useFiltering input[type="checkbox"]');
const whitelistedWordsInput = document.querySelector('#whitelistedWords input[type="text"]');
const useLoginCheckbox = document.querySelector('#useLogin input[type="checkbox"]');
const passwordInput = document.querySelector('#password input[type="text"]');

// Add event listener for the useFiltering checkbox
useFilteringCheckbox.addEventListener('change', function() {
  whitelistedWordsInput.disabled = !this.checked;
});

// Add event listener for the useLogin checkbox
useLoginCheckbox.addEventListener('change', function() {
  passwordInput.disabled = !this.checked;
});

// Initial state setup
whitelistedWordsInput.disabled = !useFilteringCheckbox.checked;
passwordInput.disabled = !useLoginCheckbox.checked;


function setConfigFromJSON(data) {
  document.querySelector('#serverIP input').value = data.serverIP || '';
  document.querySelector('#serverPort input').value = data.serverPort || '';
  document.querySelector('#version input').value = data.version || '';
  document.querySelector('#bot_amount input').value = data.bot_amount || '';
  
  const useLoginCheckbox = document.querySelector('#useLogin input[type="checkbox"]');
  useLoginCheckbox.checked = data.useLogin === 'true';
  document.querySelector('#password input').disabled = !useLoginCheckbox.checked;
  
  document.querySelector('#username input').value = data.username || '';
  document.querySelector('#password input').value = data.password || '';
  
  const useFilteringCheckbox = document.querySelector('#useFiltering input[type="checkbox"]');
  useFilteringCheckbox.checked = data.useFiltering === 'true';
  
  const whitelistedWordsInput = document.querySelector('#whitelistedWords input');
  whitelistedWordsInput.value = data.whitelistedWords || '';
  whitelistedWordsInput.disabled = !useFilteringCheckbox.checked;
  
  document.querySelector('#trustedUsers input').value = data.trustedUsers || '';
  document.querySelector('#prefix input').value = data.prefix || '';
}

function resetConfig() {
  document.querySelector('#serverIP input').value = '';
  document.querySelector('#serverPort input').value = '';
  document.querySelector('#version input').value = '';
  document.querySelector('#bot_amount input').value = '';
  
  const useLoginCheckbox = document.querySelector('#useLogin input[type="checkbox"]');
  useLoginCheckbox.checked = false;
  document.querySelector('#password input').disabled = true;
  document.querySelector('#password input').value = '';
  
  document.querySelector('#username input').value = '';
  
  const useFilteringCheckbox = document.querySelector('#useFiltering input[type="checkbox"]');
  useFilteringCheckbox.checked = false;
  
  const whitelistedWordsInput = document.querySelector('#whitelistedWords input');
  whitelistedWordsInput.value = '';
  whitelistedWordsInput.disabled = true;
  
  document.querySelector('#trustedUsers input').value = '';
  document.querySelector('#prefix input').value = '';
  selectedConfig = '';
}