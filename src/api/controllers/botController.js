class BotController {
  constructor(botService) {
    this.botService = botService;
  }

  // Get all bots
  getAllBots(req, res) {
    const bots = this.botService.bots.map((bot, index) => ({
      id: index,
      username: bot.options.username,
      server: `${bot.options.host}:${bot.options.port}`,
      connected: bot.connected,
      position: bot.getPosition(),
      health: bot.getHealth()
    }));
    
    res.json({
      count: bots.length,
      bots
    });
  }

  // Get a specific bot
  getBot(req, res) {
    const botIndex = parseInt(req.params.id, 10);
    const bot = this.botService.bots[botIndex];
    
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    res.json({
      id: botIndex,
      username: bot.options.username,
      server: `${bot.options.host}:${bot.options.port}`,
      connected: bot.connected,
      position: bot.getPosition(),
      health: bot.getHealth(),
      inventory: bot.getInventory(),
      nearbyPlayers: bot.getNearbyPlayers()
    });
  }

  // Create a new bot
  createBot(req, res) {
    const { username, host, port, version, auth } = req.body;
    
    if (!username || !host) {
      return res.status(400).json({ error: 'Username and host are required' });
    }
    
    try {
      const botConfig = {
        username,
        host,
        port: port || 25565,
        version,
        auth: auth || 'mojang'
      };
      
      this.botService.createBot(botConfig)
        .then(botIndex => {
          res.status(201).json({ 
            message: 'Bot created successfully',
            id: botIndex
          });
        })
        .catch(error => {
          res.status(500).json({ error: error.message });
        });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Delete a bot
  deleteBot(req, res) {
    const botIndex = parseInt(req.params.id, 10);
    
    if (isNaN(botIndex) || botIndex < 0 || botIndex >= this.botService.bots.length) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    try {
      this.botService.disconnectBot(botIndex);
      res.json({ message: 'Bot disconnected successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Send a command to a bot
  sendCommand(req, res) {
    const botIndex = parseInt(req.params.id, 10);
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    if (isNaN(botIndex) || botIndex < 0 || botIndex >= this.botService.bots.length) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    try {
      this.botService.handleCommand(this.botService.bots[botIndex], command);
      res.json({ message: 'Command sent successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { BotController };
