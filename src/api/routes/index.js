const express = require('express');
const { BotController } = require('../controllers/botController');
const { ScriptController } = require('../controllers/scriptController');
const { ConfigController } = require('../controllers/configController');

function setupRoutes(app, services) {
  const apiRouter = express.Router();
  
  // Initialize controllers with services
  const botController = new BotController(services.botService);
  const scriptController = new ScriptController(services.scriptService);
  const configController = new ConfigController(services.configManager);
  
  // Bot routes
  apiRouter.get('/bots', (req, res) => botController.getAllBots(req, res));
  apiRouter.get('/bots/:id', (req, res) => botController.getBot(req, res));
  apiRouter.post('/bots', (req, res) => botController.createBot(req, res));
  apiRouter.delete('/bots/:id', (req, res) => botController.deleteBot(req, res));
  apiRouter.post('/bots/:id/command', (req, res) => botController.sendCommand(req, res));
  
  // Script routes
  apiRouter.get('/scripts', (req, res) => scriptController.getAllScripts(req, res));
  apiRouter.get('/scripts/:name', (req, res) => scriptController.getScript(req, res));
  apiRouter.post('/scripts', (req, res) => scriptController.createScript(req, res));
  apiRouter.put('/scripts/:name', (req, res) => scriptController.updateScript(req, res));
  apiRouter.delete('/scripts/:name', (req, res) => scriptController.deleteScript(req, res));
  apiRouter.post('/scripts/:name/run/:botId?', (req, res) => scriptController.runScript(req, res));
  
  // Config routes
  apiRouter.get('/configs', (req, res) => configController.getAllConfigs(req, res));
  apiRouter.get('/configs/:name', (req, res) => configController.getConfig(req, res));
  apiRouter.post('/configs', (req, res) => configController.createConfig(req, res));
  apiRouter.put('/configs/:name', (req, res) => configController.updateConfig(req, res));
  apiRouter.delete('/configs/:name', (req, res) => configController.deleteConfig(req, res));
  apiRouter.post('/configs/:name/activate', (req, res) => configController.activateConfig(req, res));
  
  // System routes
  apiRouter.get('/system/status', (req, res) => {
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeBots: services.botService.bots.filter(bot => bot.connected).length,
      totalBots: services.botService.bots.length
    });
  });
  
  // Mount API router
  app.use('/api', apiRouter);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });
  
  return app;
}

module.exports = { setupRoutes };
