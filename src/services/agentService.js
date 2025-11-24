const { v4: uuidv4 } = require('uuid');
const llmService = require('./llmService');

class AgentService {
  constructor() {
    this.nome = 'Bolota';
  }

  /**
   * Processa mensagem do usuario usando o LLM (Gemini)
   */
  async processarMensagem(mensagem, sessionId = null) {
    // Gerar sessionId se nao fornecido
    if (!sessionId) {
      sessionId = uuidv4();
    }

    try {
      const resultado = await llmService.processarMensagem(mensagem, sessionId);

      return {
        sessionId,
        sucesso: resultado.sucesso,
        resposta: resultado.resposta,
        toolsUsadas: resultado.toolsUsadas || [],
        erro: resultado.erro
      };
    } catch (error) {
      console.error('Erro ao processar mensagem:', error.message);

      return {
        sessionId,
        sucesso: false,
        resposta: 'Desculpe, ocorreu um erro ao processar sua mensagem. Verifique se a chave da API do Gemini esta configurada corretamente.',
        erro: error.message
      };
    }
  }

  /**
   * Limpa sessao
   */
  limparSessao(sessionId) {
    llmService.limparSessao(sessionId);
  }

  /**
   * Retorna estatisticas das sessoes ativas
   */
  getEstatisticas() {
    return llmService.getEstatisticas();
  }
}

module.exports = new AgentService();
