/**
 * Testes unitarios do ProdutoService
 */

describe('ProdutoService', () => {
  let produtoService;
  let mockQueryAll;
  let mockQueryOne;

  beforeEach(() => {
    // Reset modules para limpar cache
    jest.resetModules();

    // Criar mocks
    mockQueryAll = jest.fn();
    mockQueryOne = jest.fn();

    // Mock do modulo de database
    jest.doMock('../../src/config/database', () => ({
      queryAll: mockQueryAll,
      queryOne: mockQueryOne
    }));

    // Importar service com mocks
    produtoService = require('../../src/services/produtoService');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar todos os produtos formatados', () => {
      mockQueryAll.mockReturnValue([
        { id: 1001, descricao: 'Amoxicilina 500mg', preco: 25.90, estoque: 150 },
        { id: 1002, descricao: 'Apoquel 5.4mg', preco: 112.00, estoque: 0 }
      ]);

      const result = produtoService.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('precoFormatado', 'R$ 25,90');
      expect(result[0]).toHaveProperty('disponivel', true);
      expect(result[1]).toHaveProperty('disponivel', false);
    });

    it('deve retornar array vazio quando nao ha produtos', () => {
      mockQueryAll.mockReturnValue([]);

      const result = produtoService.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('deve retornar produto quando encontrado', () => {
      mockQueryOne.mockReturnValue({
        id: 1001,
        descricao: 'Amoxicilina 500mg',
        preco: 25.90,
        estoque: 150
      });

      const result = produtoService.findById(1001);

      expect(result).not.toBeNull();
      expect(result.id).toBe(1001);
      expect(result.statusEstoque).toBe('Em estoque');
    });

    it('deve retornar null quando produto nao existe', () => {
      mockQueryOne.mockReturnValue(null);

      const result = produtoService.findById(9999);

      expect(result).toBeNull();
    });
  });

  describe('findByTermo', () => {
    it('deve buscar produtos por termo parcial', () => {
      mockQueryAll.mockReturnValue([
        { id: 1001, descricao: 'Amoxicilina 500mg', preco: 25.90, estoque: 150 }
      ]);

      const result = produtoService.findByTermo('amox');

      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(descricao) LIKE LOWER'),
        ['%amox%']
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('_getStatusEstoque', () => {
    it('deve retornar "Indisponivel" para estoque 0', () => {
      mockQueryOne.mockReturnValue({
        id: 1003, descricao: 'Simparic', preco: 95.50, estoque: 0
      });

      const result = produtoService.findById(1003);

      expect(result.statusEstoque).toBe('Indisponivel');
    });

    it('deve retornar "Estoque baixo" para estoque <= 10', () => {
      mockQueryOne.mockReturnValue({
        id: 1001, descricao: 'Produto', preco: 10, estoque: 5
      });

      const result = produtoService.findById(1001);

      expect(result.statusEstoque).toBe('Estoque baixo');
    });

    it('deve retornar "Estoque moderado" para estoque <= 50', () => {
      mockQueryOne.mockReturnValue({
        id: 1001, descricao: 'Produto', preco: 10, estoque: 30
      });

      const result = produtoService.findById(1001);

      expect(result.statusEstoque).toBe('Estoque moderado');
    });
  });
});
