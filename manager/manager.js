const { spawn } = require('child_process');
const express = require('express');

const app = express();
const port = 80;
const bots = {};

// Serve static files for the web UI
app.use(express.static('public'));

// Endpoint to start a bot
app.post('/start', express.json(), (req, res) => {
  const { serverIP, serverPort, username } = req.body;

  if (bots[serverIP]) {
    return res.status(400).json({ error: 'Bot already running for this server.' });
  }

  const botProcess = spawn('node', ['chatlogger.js'], {
    env: {
      SERVER_IP: serverIP,
      SERVER_PORT: serverPort,
      USERNAME: username,
    },
  });

  botProcess.stdout.on('data', (data) => {
    console.log(`[${serverIP}] ${data}`);
  });

  botProcess.stderr.on('data', (data) => {
    console.error(`[${serverIP}] Error: ${data}`);
  });

  botProcess.on('close', (code) => {
    console.log(`[${serverIP}] Bot stopped with code ${code}`);
    delete bots[serverIP];
  });

  bots[serverIP] = botProcess;
  res.json({ message: `Bot started for ${serverIP}` });
});

// Endpoint to stop a bot
app.post('/stop', express.json(), (req, res) => {
  const { serverIP } = req.body;

  if (!bots[serverIP]) {
    return res.status(400).json({ error: 'No bot running for this server.' });
  }

  bots[serverIP].kill();
  delete bots[serverIP];
  res.json({ message: `Bot stopped for ${serverIP}` });
});

app.listen(port, () => {
  console.log(`Manager running at http://localhost:${port}`);
});
