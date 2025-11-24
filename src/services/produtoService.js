const { queryAll, queryOne } = require('../config/database');

class ProdutoService {
  /**
   * Busca todos os produtos
   */
  findAll() {
    const produtos = queryAll('SELECT * FROM produtos ORDER BY descricao');
    return produtos.map(p => this._formatProduto(p));
  }

  /**
   * Busca produto por ID
   */
  findById(id) {
    const produto = queryOne('SELECT * FROM produtos WHERE id = ?', [id]);
    return produto ? this._formatProduto(produto) : null;
  }

  /**
   * Busca produtos por termo (nome/descricao)
   * Busca parcial, case-insensitive
   */
  findByTermo(termo) {
    const termoLike = `%${termo}%`;
    const produtos = queryAll(
      `SELECT * FROM produtos WHERE LOWER(descricao) LIKE LOWER(?) ORDER BY descricao`,
      [termoLike]
    );
    return produtos.map(p => this._formatProduto(p));
  }

  /**
   * Busca o primeiro produto que corresponde ao termo
   * Util para o agente quando precisa de um produto especifico
   */
  findFirstByTermo(termo) {
    const produtos = this.findByTermo(termo);
    return produtos.length > 0 ? produtos[0] : null;
  }

  /**
   * Formata o produto para resposta da API
   */
  _formatProduto(produto) {
    return {
      id: produto.id,
      descricao: produto.descricao,
      preco: produto.preco,
      precoFormatado: `R$ ${produto.preco.toFixed(2).replace('.', ',')}`,
      estoque: produto.estoque,
      disponivel: produto.estoque > 0,
      statusEstoque: this._getStatusEstoque(produto.estoque)
    };
  }

  /**
   * Retorna status amigavel do estoque
   */
  _getStatusEstoque(quantidade) {
    if (quantidade === 0) return 'Indisponivel';
    if (quantidade <= 10) return 'Estoque baixo';
    if (quantidade <= 50) return 'Estoque moderado';
    return 'Em estoque';
  }
}

module.exports = new ProdutoService();
