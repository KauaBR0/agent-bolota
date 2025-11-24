const agentService = require('../services/agentService');

class AgentController {
  /**
   * POST /webhook/bolota
   * Endpoint principal para interacao com o agente
   */
  async processar(req, res) {
    try {
      const { mensagem, session_id, sessionId } = req.body;
      const activeSessionId = sessionId || session_id; // Aceita ambos os formatos

      if (!mensagem || typeof mensagem !== 'string') {
        return res.status(400).json({
          sucesso: false,
          erro: 'Campo "mensagem" e obrigatorio e deve ser uma string'
        });
      }

      if (mensagem.trim().length === 0) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Mensagem nao pode estar vazia'
        });
      }

      if (mensagem.length > 1000) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Mensagem muito longa. Maximo: 1000 caracteres'
        });
      }

      const resposta = await agentService.processarMensagem(
        mensagem.trim(),
        activeSessionId
      );

      res.json(resposta);
    } catch (error) {
      console.error('Erro no webhook do agente:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro interno ao processar mensagem'
      });
    }
  }

  /**
   * GET /webhook/bolota/status
   * Retorna status do agente
   */
  status(req, res) {
    try {
      const stats = agentService.getEstatisticas();

      res.json({
        sucesso: true,
        agente: 'Bolota',
        versao: '1.0.0',
        status: 'online',
        ...stats
      });
    } catch (error) {
      console.error('Erro ao obter status:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro ao obter status do agente'
      });
    }
  }

  /**
   * DELETE /webhook/bolota/sessao/:sessionId
   * Limpa uma sessao especifica
   */
  limparSessao(req, res) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Session ID e obrigatorio'
        });
      }

      agentService.limparSessao(sessionId);

      res.json({
        sucesso: true,
        mensagem: `Sessao ${sessionId} removida`
      });
    } catch (error) {
      console.error('Erro ao limpar sessao:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro ao limpar sessao'
      });
    }
  }
}

module.exports = new AgentController();
