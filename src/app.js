const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const aiClient = require('./ai/client');

function createApp(repository) {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.resolve(__dirname, '../public')));

  app.get('/api/health', async (_req, res) => {
    try {
      await repository.health();
      res.json({ status: 'ok', application: 'Imersão Arquiteto Azure — Cloud & AI', database: repository.provider, ai: config.aiEnabled });
    } catch { res.status(503).json({ status: 'unhealthy' }); }
  });
  app.get('/api/products', async (_req, res, next) => {
    try { res.json(await repository.listProducts()); } catch (error) { next(error); }
  });
  app.post('/api/orders', async (req, res, next) => {
    try {
      const { customerName, customerEmail, items } = req.body;
      if (!customerName?.trim() || !/^\S+@\S+\.\S+$/.test(customerEmail || '') || !Array.isArray(items) || !items.length) {
        return res.status(400).json({ error: 'Informe nome, e-mail válido e ao menos um item.' });
      }
      const order = await repository.createOrder({ customerName: customerName.trim(), customerEmail: customerEmail.trim(), items });
      res.status(201).json(order);
    } catch (error) { next(error); }
  });
  app.post('/api/ai/recommendations', async (req, res, next) => {
    if (!config.aiEnabled) return res.status(501).json({ error: 'Integração com Azure AI Foundry será habilitada na etapa de AI.' });
    if (!aiClient.isConfigured()) return res.status(503).json({ error: 'Conector de AI habilitado, mas endpoint/credenciais não configurados.' });
    try {
      const interest = typeof req.body?.interest === 'string' ? req.body.interest : '';
      const products = await repository.listProducts();
      const result = await aiClient.recommend({ products, interest });
      res.json(result);
    } catch (error) { next(error); }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Erro interno.' });
  });
  return app;
}

module.exports = { createApp };
