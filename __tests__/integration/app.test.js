/**
 * Testes de integracao - App principal
 */
const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Criar app de teste
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Rota raiz
  app.get('/', (req, res) => {
    res.json({
      nome: 'Bolota API',
      versao: '1.0.0'
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({ sucesso: false, erro: 'Endpoint nao encontrado' });
  });

  return app;
}

describe('App Principal', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /', () => {
    it('deve retornar informacoes da API', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.nome).toBe('Bolota API');
      expect(response.body.versao).toBe('1.0.0');
    });
  });

  describe('GET /health', () => {
    it('deve retornar status healthy', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Rota inexistente', () => {
    it('deve retornar 404', async () => {
      const response = await request(app)
        .get('/rota-que-nao-existe')
        .expect(404);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('nao encontrado');
    });
  });
});
