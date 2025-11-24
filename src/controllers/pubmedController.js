const pubmedService = require('../services/pubmedService');

class PubmedController {
  /**
   * GET /api/pubmed/:medicamento
   * Busca artigos cientificos sobre um medicamento
   */
  async buscarArtigos(req, res) {
    try {
      const { medicamento } = req.params;
      const { limite } = req.query;

      if (!medicamento || medicamento.trim().length < 2) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Nome do medicamento deve ter pelo menos 2 caracteres'
        });
      }

      const maxResults = limite ? parseInt(limite, 10) : 5;

      if (isNaN(maxResults) || maxResults < 1 || maxResults > 20) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Limite deve ser um numero entre 1 e 20'
        });
      }

      const resultado = await pubmedService.buscarArtigos(
        medicamento.trim(),
        maxResults
      );

      if (!resultado.sucesso) {
        return res.status(502).json({
          sucesso: false,
          erro: 'Erro ao consultar PubMed',
          detalhes: resultado.erro
        });
      }

      res.json(resultado);
    } catch (error) {
      console.error('Erro ao buscar artigos:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro interno ao buscar artigos'
      });
    }
  }
}

module.exports = new PubmedController();
