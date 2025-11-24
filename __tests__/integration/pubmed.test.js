/**
 * Testes de integracao - Endpoints do PubMed
 */
const request = require('supertest');
const express = require('express');
const axios = require('axios');

jest.mock('axios');

describe('Endpoints do PubMed', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/pubmed', require('../../src/routes/pubmed'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pubmed/:medicamento', () => {
    it('deve buscar artigos com sucesso', async () => {
      axios.get
        .mockResolvedValueOnce({
          data: { esearchresult: { idlist: ['123'] } }
        })
        .mockResolvedValueOnce({
          data: {
            result: {
              '123': {
                uid: '123',
                title: 'Artigo Teste',
                authors: [{ name: 'Silva A' }],
                source: 'Journal',
                pubdate: '2024'
              }
            }
          }
        });

      const response = await request(app)
        .get('/api/pubmed/amoxicilina')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
      expect(response.body.termo).toBe('amoxicilina');
      expect(response.body.artigos).toBeDefined();
    });

    it('deve respeitar parametro limite', async () => {
      axios.get
        .mockResolvedValueOnce({
          data: { esearchresult: { idlist: ['1', '2', '3'] } }
        })
        .mockResolvedValueOnce({
          data: {
            result: {
              '1': { uid: '1', title: 'A1', authors: [], source: '', pubdate: '' },
              '2': { uid: '2', title: 'A2', authors: [], source: '', pubdate: '' },
              '3': { uid: '3', title: 'A3', authors: [], source: '', pubdate: '' }
            }
          }
        });

      const response = await request(app)
        .get('/api/pubmed/teste?limite=3')
        .expect(200);

      expect(response.body.sucesso).toBe(true);
    });

    it('deve retornar erro para medicamento muito curto', async () => {
      const response = await request(app)
        .get('/api/pubmed/a')
        .expect(400);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('2 caracteres');
    });

    it('deve retornar erro para limite invalido', async () => {
      const response = await request(app)
        .get('/api/pubmed/amoxicilina?limite=100')
        .expect(400);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('1 e 20');
    });

    it('deve tratar erro da API externa', async () => {
      axios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/pubmed/amoxicilina')
        .expect(502);

      expect(response.body.sucesso).toBe(false);
      expect(response.body.erro).toContain('PubMed');
    });
  });
});
