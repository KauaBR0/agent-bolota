const produtoService = require('../services/produtoService');

class ProdutoController {
  /**
   * GET /api/produtos
   * Lista todos os produtos
   */
  listar(req, res) {
    try {
      const produtos = produtoService.findAll();
      res.json({
        sucesso: true,
        total: produtos.length,
        produtos
      });
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro interno ao buscar produtos'
      });
    }
  }

  /**
   * GET /api/produtos/:id
   * Busca produto por ID
   */
  buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const idNumerico = parseInt(id, 10);

      if (isNaN(idNumerico)) {
        return res.status(400).json({
          sucesso: false,
          erro: 'ID invalido. Deve ser um numero.'
        });
      }

      const produto = produtoService.findById(idNumerico);

      if (!produto) {
        return res.status(404).json({
          sucesso: false,
          erro: `Produto com ID ${id} nao encontrado`
        });
      }

      res.json({
        sucesso: true,
        produto
      });
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro interno ao buscar produto'
      });
    }
  }

  /**
   * GET /api/produtos/busca?termo=
   * Busca produtos por termo (nome/descricao)
   */
  buscarPorTermo(req, res) {
    try {
      const { termo } = req.query;

      if (!termo || termo.trim().length < 2) {
        return res.status(400).json({
          sucesso: false,
          erro: 'Termo de busca deve ter pelo menos 2 caracteres'
        });
      }

      const produtos = produtoService.findByTermo(termo.trim());

      res.json({
        sucesso: true,
        termo: termo.trim(),
        total: produtos.length,
        produtos,
        mensagem: produtos.length === 0
          ? 'Nenhum produto encontrado para este termo'
          : null
      });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      res.status(500).json({
        sucesso: false,
        erro: 'Erro interno ao buscar produtos'
      });
    }
  }
}

module.exports = new ProdutoController();
