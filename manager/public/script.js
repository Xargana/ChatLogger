const startForm = document.getElementById('startForm');
const stopForm = document.getElementById('stopForm');

startForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const serverIP = document.getElementById('serverIP').value;
  const serverPort = document.getElementById('serverPort').value || 25565;
  const username = document.getElementById('username').value;

  const response = await fetch('/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverIP, serverPort, username }),
  });

  const data = await response.json();
  alert(data.message || data.error);
});

stopForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const serverIP = document.getElementById('stopServerIP').value;

  const response = await fetch('/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverIP }),
  });

  const data = await response.json();
  alert(data.message || data.error);
});