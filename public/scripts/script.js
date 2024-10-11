    const socket = io();

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const scriptTA = document.getElementById('script-content');
    const scriptsDiv = document.getElementById('scripts');
    const scriptName = document.getElementById('script-name');
    const buttonImport = document.getElementById('button-import');
    const buttonNew = document.getElementById('button-new');
    const buttonSave = document.getElementById('button-save');
    const buttonDelete = document.getElementById('button-delete');
    const buttonRefrash = document.getElementById('button-refresh');
    const buttonRun = document.getElementById('button-run');
    let config = {};
    let selectedScript = '';
    var MainConfig = {};
    var ScriptList = [];

const scriptButtons = document.querySelectorAll('.script')
scriptButtons.forEach(button => {
    button.addEventListener('click', () => {
        readScript(button)
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

    socket.on('script.list', (list) => {
      console.log('Received script list:', list);
      // Update your UI with the config data
      ScriptList = list;
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
      socket.emit('script.get_list');
      socket.on('script.list', (list) => {
        // Update your UI with the config data
        ScriptList = list;

        // Create buttons for each script
        scriptsDiv.innerHTML = ''; // Clear existing content
        list.forEach(scriptName => {
          const button = document.createElement('button');
          button.className = 'script';
          button.textContent = scriptName;
          button.setAttribute('onclick', `readScript('${scriptName}')`);
          scriptsDiv.appendChild(button);
        });
      });
    }

    function createScript(data) {
      socket.emit('script.new', data);
      getList();

    }
      function editScript(data) {
        if (data.oldName !== data.newName) {
          socket.emit('script.rename', { oldName: data.oldName, newName: data.newName });
          selectedScript = data.newName;
        }
        socket.emit('script.edit', { name: data.newName, code: data.code });
        getList();
      }

      function editScriptFromWeb() {
        editScript({
          oldName: selectedScript,
          newName: scriptName.value,
          code: scriptTA.value
        });
      }

    function deleteScript(data) {
      console.log(`deleted ${data}`)
      socket.emit('script.delete', data);
      getList();
      if (selectedScript === data) {
        resetScript();
      }
    }

    
    

// Add event listener for 'Delete' key on script buttons
document.addEventListener('keydown', function(event) {
  if (event.key === 'Delete' && event.target.classList.contains('script')) {
    event.preventDefault();
    const scriptName = event.target.textContent;
    deleteScript(scriptName);
  }
});

function generateUniqueName(baseName, existingNames) {
  let newName = baseName;
  let counter = 1;
  while (existingNames.includes(newName)) {
    newName = `${baseName.replace('.txt', `(${counter}).txt`)}`;
    counter++;
  }
  return newName;
}

    function createScriptFromWeb() {

          socket.emit('script.get_list');
          socket.once('script.list', (list) => {
            const uniqueName = generateUniqueName('new_script.txt', list);
            createScript(data={name: uniqueName, code: '# Write your script here!'});
          });
    }

    function handleKey(event) {
      if (event.key === 'Enter') {
        editScriptFromWeb();
      }
    }
    scriptName.addEventListener('keypress', handleKey);



function importScript(data) {
  socket.emit('script.get_list');
  socket.once('script.list', (list) => {
    const uniqueName = generateUniqueName(data.name, list);
    createScript({name: uniqueName, code: data.content});
  });
}

function importScriptFromWeb() {
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

document.getElementById('script-import-btn').addEventListener('click', function() {
  document.getElementById('script-import').click();
});

document.getElementById('script-import').addEventListener('change', function() {
  console.log('File selected:', this.files[0].name);
  const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const content = e.target.result;
        importScript({name: file.name, content: content});
      };
      reader.readAsText(file);
    }
  // You can add your file import logic here
});



// Add event listener for Ctrl+S on the whole document
document.addEventListener('keydown', function(event) {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault(); // Prevent the default save action
    editScriptFromWeb();
  }
});

    

    function deleteScriptFromWeb() {
      deleteScript(selectedScript);
    }

    function runScriptFromWeb() {
      runScript(selectedScript);
    }

    let scriptSendListener = null;

    function readScript(data) {
      // Remove previous listener if it exists
      if (scriptSendListener) {
        socket.off('script.send', scriptSendListener);
      }

      // Create new listener
      scriptSendListener = (scriptContent) => {
        scriptTA.value = scriptContent; // Use .value instead of .innerHTML for textarea
        scriptName.value = data;
        selectedScript = data;
        const scriptButtons = document.querySelectorAll('.script');
      scriptButtons.forEach(button => {
        if (button.innerText === selectedScript) {
          button.id = 'selectedScript';
        } else {
          button.removeAttribute('id');
        }
      });
      };

      // Add the new listener
      socket.on('script.send', scriptSendListener);

      // Emit the read request
      socket.emit('script.read', data);

    }
    function runScript(data) {
      sendCommand(`runscript ${data}`);
    }

    function resetScript() {
      scriptTA.value = '';
      scriptName.value = '';
      selectedScript = '';
    }
