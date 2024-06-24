const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt user for input
function promptUser(promptText) {
    return new Promise((resolve, reject) => {
        rl.question(promptText, (input) => {
            resolve(input.trim());
        });
    });
}

// Function to write configuration to config.txt
function writeConfig(configPath, configData) {
    return new Promise((resolve, reject) => {
        fs.writeFile(configPath, configData, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Function to run chatlogger.js after setup
function runChatLogger() {
    console.log('Setup completed. Running chatlogger.js...');
    const chatLoggerProcess = exec('node chatlogger.js');

    chatLoggerProcess.stdout.on('data', (data) => {
        console.log(`chatlogger.js stdout: ${data}`);
    });

    chatLoggerProcess.stderr.on('data', (data) => {
        console.error(`chatlogger.js stderr: ${data}`);
    });

    chatLoggerProcess.on('close', (code) => {
        console.log(`chatlogger.js process exited with code ${code}`);
        rl.close();
    });
}

// Function to start the setup process
async function startSetup() {
    console.log('Welcome to the setup process for your Minecraft bot.');

    // Prompt user for configuration values
    const serverAddress = await promptUser('Enter Minecraft server address: ');
    const serverPort = await promptUser('Enter Minecraft server port: ');
    const botUsername = await promptUser('Enter bot username: ');
    const registerPassword = await promptUser('Enter register password: ');
    const loginPassword = await promptUser('Enter login password: ');
    const keywordsToMonitor = await promptUser('Enter keywords to monitor (comma-separated): ');

    // Prepare configuration data
    const configData = `
Server Address: ${serverAddress}
Server Port: ${serverPort}
Bot Username: ${botUsername}
Register Password: ${registerPassword}
Login Password: ${loginPassword}
Keywords to Monitor: ${keywordsToMonitor}
`;

    const configPath = path.join(__dirname, 'config.txt');

    // Write configuration to config.txt
    try {
        await writeConfig(configPath, configData);
        console.log('Configuration saved to config.txt.');
        runChatLogger(); // Run chatlogger.js after setup
    } catch (err) {
        console.error('Error writing configuration:', err);
        rl.close();
    }
}

// Start the setup process
startSetup();
