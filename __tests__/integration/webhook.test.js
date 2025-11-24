/**
 * Testes de integracao - Webhook do Agente Bolota
 * Com LLM mockado para testes deterministicos
 */
const request = require('supertest');
const express = require('express');

// Mock do llmService para testes deterministicos
jest.mock('../../src/services/llmService', () => ({
  processarMensagem: jest.fn(),
  limparSessao: jest.fn(),
  getEstatisticas: jest.fn().mockReturnValue({
    sessoesAtivas: 0,
    modelo: 'gemini-2.5-flash',
    timestamp: new Date().toISOString()
  })
}));

const llmService = require('../../src/services/llmService');

describe('Webhook do Agente Bolota', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/webhook', require('../../src/routes/webhook'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /webhook/bolota', () => {
    it('deve processar saudacao inicial', async () => {
      llmService.processarMensagem.mockResolvedValue({
        sucesso: true,
        resposta: 'Ola! Eu sou o Bolota, seu assistente de medicamentos veterinarios.',
        toolsUsadas: []
      });

      const response = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: 'Ola' })
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.resposta).toContain('Bolota');
      expect(response.body.sessionId).toBeDefined();
    });

    it('deve processar pergunta sobre medicamento', async () => {
      llmService.processarMensagem.mockResolvedValue({
        sucesso: true,
        resposta: 'A Amoxicilina e um antibiotico de amplo espectro. Encontrei artigos cientificos. Gostaria de ver o estoque?',
        toolsUsadas: ['buscar_artigos']
      });

      const response = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: 'Me fale sobre amoxicilina' })
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.resposta).toContain('Amoxicilina');
      expect(response.body.toolsUsadas).toContain('buscar_artigos');
    });

    it('deve retornar estoque ao confirmar', async () => {
      // Primeira mensagem
      llmService.processarMensagem.mockResolvedValueOnce({
        sucesso: true,
        resposta: 'O Apoquel e um medicamento para dermatite. Quer ver o estoque?',
        toolsUsadas: ['buscar_artigos']
      });

      const response1 = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: 'Fale sobre apoquel' })
        .expect(200);

      const sessionId = response1.body.sessionId;

      // Segunda mensagem - confirmacao
      llmService.processarMensagem.mockResolvedValueOnce({
        sucesso: true,
        resposta: 'Encontrei o Apoquel 5.4mg por R$ 112,00. Estoque: 30 unidades. Lembre-se: requer prescricao veterinaria.',
        toolsUsadas: ['buscar_estoque']
      });

      const response2 = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: 'Sim', session_id: sessionId })
        .expect(200);

      expect(response2.body.sucesso).toBe(true);
      expect(response2.body.resposta).toContain('R$ 112,00');
      expect(response2.body.toolsUsadas).toContain('buscar_estoque');
    });

    it('deve retornar erro para mensagem vazia', async () => {
      const response = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: '' })
        .expect(400);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toBeDefined();
    });

    it('deve retornar erro para mensagem muito longa', async () => {
      const mensagemLonga = 'a'.repeat(1001);

      const response = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: mensagemLonga })
        .expect(400);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('longa');
    });

    it('deve retornar erro quando mensagem nao e string', async () => {
      const response = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: 123 })
        .expect(400);

      expect(response.body.sucesso).toBe(false);
    });

    it('deve tratar erro do LLM graciosamente', async () => {
      llmService.processarMensagem.mockRejectedValue(new Error('API Error'));

      const response = await request(app)
        .post('/webhook/bolota')
        .send({ mensagem: 'Teste' })
        .expect(200);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.resposta).toContain('erro');
    });
  });

  describe('GET /webhook/bolota/status', () => {
    it('deve retornar status do agente', async () => {
      const response = await request(app)
        .get('/webhook/bolota/status')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.agente).toBe('Bolota');
      expect(response.body.status).toBe('online');
      expect(response.body.modelo).toBe('gemini-2.5-flash');
    });
  });

  describe('DELETE /webhook/bolota/sessao/:sessionId', () => {
    it('deve limpar sessao existente', async () => {
      const response = await request(app)
        .delete('/webhook/bolota/sessao/test-session-123')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.mensagem).toContain('removida');
      expect(llmService.limparSessao).toHaveBeenCalledWith('test-session-123');
    });
  });
});
