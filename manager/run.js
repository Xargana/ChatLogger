const fs = require("fs");
const { spawn } = require("child_process");

// Function to execute a shell command
function runCommand(command, description) {
    console.log(description);
    return new Promise((resolve, reject) => {
        const process = spawn(command, { shell: true, stdio: "inherit" });

        process.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command "${command}" exited with code ${code}`));
            }
        });
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

        // Run main.js in the same console
        console.log("Starting server...");
        require("./manager.js"); // Load and execute main.js in the same process
    } catch (err) {
        console.error("An error occurred. Exiting...", err);
    }
})();
