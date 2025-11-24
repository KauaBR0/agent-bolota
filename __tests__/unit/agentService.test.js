/**
 * Testes unitarios do AgentService
 * Testa o agente com LLM mockado
 */

describe('AgentService', () => {
  let agentService;
  let mockLlmService;

  beforeEach(() => {
    jest.resetModules();

    // Mock do llmService
    mockLlmService = {
      processarMensagem: jest.fn(),
      limparSessao: jest.fn(),
      getEstatisticas: jest.fn()
    };

    jest.doMock('../../src/services/llmService', () => mockLlmService);

    agentService = require('../../src/services/agentService');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processarMensagem', () => {
    it('deve retornar resposta do LLM com sessionId', async () => {
      mockLlmService.processarMensagem.mockResolvedValue({
        sucesso: true,
        resposta: 'Ola! Eu sou o Bolota, seu assistente de medicamentos veterinarios.',
        toolsUsadas: []
      });

      const result = await agentService.processarMensagem('Ola');

      expect(result.sucesso).toBe(true);
      expect(result.resposta).toContain('Bolota');
      expect(result.sessionId).toBeDefined();
      expect(mockLlmService.processarMensagem).toHaveBeenCalledWith('Ola', expect.any(String));
    });

    it('deve passar sessionId existente para o LLM', async () => {
      const existingSessionId = 'test-session-123';

      mockLlmService.processarMensagem.mockResolvedValue({
        sucesso: true,
        resposta: 'Resposta teste',
        toolsUsadas: []
      });

      const result = await agentService.processarMensagem('Teste', existingSessionId);

      expect(result.sessionId).toBe(existingSessionId);
      expect(mockLlmService.processarMensagem).toHaveBeenCalledWith('Teste', existingSessionId);
    });

    it('deve retornar tools usadas pelo LLM', async () => {
      mockLlmService.processarMensagem.mockResolvedValue({
        sucesso: true,
        resposta: 'Encontrei a Amoxicilina 500mg por R$ 25,90',
        toolsUsadas: ['buscar_estoque']
      });

      const result = await agentService.processarMensagem('Qual o preco da amoxicilina?');

      expect(result.sucesso).toBe(true);
      expect(result.toolsUsadas).toContain('buscar_estoque');
    });

    it('deve retornar artigos quando LLM usa buscar_artigos', async () => {
      mockLlmService.processarMensagem.mockResolvedValue({
        sucesso: true,
        resposta: 'A amoxicilina e um antibiotico. Encontrei artigos cientificos sobre o tema.',
        toolsUsadas: ['buscar_artigos']
      });

      const result = await agentService.processarMensagem('Me fale sobre amoxicilina');

      expect(result.sucesso).toBe(true);
      expect(result.toolsUsadas).toContain('buscar_artigos');
    });

    it('deve tratar erro do LLM graciosamente', async () => {
      mockLlmService.processarMensagem.mockRejectedValue(new Error('API Error'));

      const result = await agentService.processarMensagem('Teste');

      expect(result.sucesso).toBe(false);
      expect(result.resposta).toContain('erro');
      expect(result.erro).toBeDefined();
    });

    it('deve retornar erro quando LLM retorna sucesso false', async () => {
      mockLlmService.processarMensagem.mockResolvedValue({
        sucesso: false,
        resposta: 'Erro ao processar',
        erro: 'API_ERROR'
      });

      const result = await agentService.processarMensagem('Teste');

      expect(result.sucesso).toBe(false);
    });
  });

  describe('limparSessao', () => {
    it('deve chamar limparSessao do LLM', () => {
      agentService.limparSessao('test-session');

      expect(mockLlmService.limparSessao).toHaveBeenCalledWith('test-session');
    });
  });

  describe('getEstatisticas', () => {
    it('deve retornar estatisticas do LLM', () => {
      mockLlmService.getEstatisticas.mockReturnValue({
        sessoesAtivas: 5,
        modelo: 'gemini-2.5-flash',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      const stats = agentService.getEstatisticas();

      expect(stats).toHaveProperty('sessoesAtivas', 5);
      expect(stats).toHaveProperty('modelo', 'gemini-2.5-flash');
      expect(stats).toHaveProperty('timestamp');
    });
  });
});
