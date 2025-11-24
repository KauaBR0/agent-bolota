/**
 * Testes de integracao - Endpoints de Produtos
 */
const request = require('supertest');
const express = require('express');

// Mock do database antes de importar as rotas
jest.mock('../../src/config/database', () => {
  const produtos = [
    { id: 1001, descricao: 'Amoxicilina 500mg (Antibiotico)', preco: 25.90, estoque: 150 },
    { id: 1002, descricao: 'Apoquel 5.4mg (Dermatologico)', preco: 112.00, estoque: 30 },
    { id: 1003, descricao: 'Simparic 80mg (Antipulgas)', preco: 95.50, estoque: 0 }
  ];

  return {
    getDatabase: jest.fn(),
    queryAll: jest.fn((sql, params) => {
      if (sql.includes('LIKE')) {
        const termo = params[0].replace(/%/g, '').toLowerCase();
        return produtos.filter(p =>
          p.descricao.toLowerCase().includes(termo)
        );
      }
      return produtos;
    }),
    queryOne: jest.fn((sql, params) => {
      if (params && params[0]) {
        return produtos.find(p => p.id === params[0]) || null;
      }
      return { total: produtos.length };
    })
  };
});

describe('Endpoints de Produtos', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/produtos', require('../../src/routes/produtos'));
  });

  describe('GET /api/produtos', () => {
    it('deve listar todos os produtos', async () => {
      const response = await request(app)
        .get('/api/produtos')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.produtos).toHaveLength(3);
    });

    it('deve retornar produtos com campos formatados', async () => {
      const response = await request(app)
        .get('/api/produtos')
        .expect(200);

      const produto = response.body.produtos[0];
      expect(produto).toHaveProperty('precoFormatado');
      expect(produto).toHaveProperty('disponivel');
      expect(produto).toHaveProperty('statusEstoque');
    });
  });

  describe('GET /api/produtos/busca', () => {
    it('deve buscar produtos por termo', async () => {
      const response = await request(app)
        .get('/api/produtos/busca?termo=amox')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.termo).toBe('amox');
    });

    it('deve retornar erro para termo muito curto', async () => {
      const response = await request(app)
        .get('/api/produtos/busca?termo=a')
        .expect(400);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('2 caracteres');
    });

    it('deve retornar erro quando termo nao e fornecido', async () => {
      const response = await request(app)
        .get('/api/produtos/busca')
        .expect(400);

      expect(response.body.sucesso).toBe(false);
    });
  });

  describe('GET /api/produtos/:id', () => {
    it('deve retornar produto por ID', async () => {
      const response = await request(app)
        .get('/api/produtos/1001')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.produto.id).toBe(1001);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const response = await request(app)
        .get('/api/produtos/9999')
        .expect(404);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('nao encontrado');
    });

    it('deve retornar erro para ID invalido', async () => {
      const response = await request(app)
        .get('/api/produtos/abc')
        .expect(400);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('invalido');
    });
  });
});
