const fs = require("fs");
const { exec } = require("child_process");

// Function to execute a shell command
function runCommand(command, description) {
    console.log(description);
    return new Promise((resolve, reject) => {
        const process = exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
            }
            console.log(stdout);
            resolve();
        });

        process.stdout.pipe(process.stdout);
        process.stderr.pipe(process.stderr);
    });
}

(async () => {
    try {
        // Check if node_modules exists
        if (!fs.existsSync("node_modules")) {
            console.log("Dependencies not found. Installing...");
            await runCommand("npm install", "Installing dependencies...");
        } else {
            console.log("Dependencies are already installed.");
        }

        // Start the server
        await runCommand("node main.js", "Starting server...");

      }
      catch (err) {
        console.error("An error occurred. Exiting...", err);
      }
})();
  