// Setup global para testes
require('dotenv').config();

// Timeout maior para testes de integracao com PubMed
jest.setTimeout(15000);

// Silenciar logs durante testes
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
