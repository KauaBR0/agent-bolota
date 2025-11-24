/**
 * Testes unitarios do PubmedService
 */

// Mock do axios ANTES de importar o service
jest.mock('axios', () => ({
  get: jest.fn()
}));

const axios = require('axios');

describe('PubmedService', () => {
  let pubmedService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reimportar o service para cada teste
    jest.resetModules();
    // Re-configurar o mock
    jest.doMock('axios', () => ({
      get: jest.fn()
    }));
    pubmedService = require('../../src/services/pubmedService');
  });

  describe('buscarArtigos', () => {
    it('deve retornar artigos formatados quando busca tem sucesso', async () => {
      const axios = require('axios');

      // Mock da busca de IDs
      axios.get.mockResolvedValueOnce({
        data: {
          esearchresult: {
            idlist: ['12345', '67890']
          }
        }
      });

      // Mock dos detalhes dos artigos
      axios.get.mockResolvedValueOnce({
        data: {
          result: {
            '12345': {
              uid: '12345',
              title: 'Artigo sobre Amoxicilina',
              authors: [{ name: 'Silva J' }, { name: 'Santos M' }],
              source: 'Vet Journal',
              pubdate: '2023 Jan',
              sorttitle: 'resumo do artigo'
            },
            '67890': {
              uid: '67890',
              title: 'Outro artigo',
              authors: [{ name: 'Costa A' }],
              source: 'Animal Health',
              pubdate: '2022',
              sorttitle: 'outro resumo'
            }
          }
        }
      });

      const result = await pubmedService.buscarArtigos('amoxicilina', 2);

      expect(result.sucesso).toBe(true);
      expect(result.termo).toBe('amoxicilina');
      expect(result.artigos).toHaveLength(2);
      expect(result.artigos[0].titulo).toBe('Artigo sobre Amoxicilina');
      expect(result.artigos[0].link).toContain('pubmed.ncbi.nlm.nih.gov');
    });

    it('deve retornar mensagem quando nenhum artigo e encontrado', async () => {
      const axios = require('axios');

      axios.get.mockResolvedValueOnce({
        data: {
          esearchresult: {
            idlist: []
          }
        }
      });

      const result = await pubmedService.buscarArtigos('medicamentoinexistente123');

      expect(result.sucesso).toBe(true);
      expect(result.totalEncontrado).toBe(0);
      expect(result.mensagem).toContain('Nenhum artigo encontrado');
    });

    it('deve tratar erro de conexao', async () => {
      const axios = require('axios');

      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await pubmedService.buscarArtigos('amoxicilina');

      expect(result.sucesso).toBe(false);
      expect(result.erro).toBeDefined();
    });

    it('deve formatar autores com "et al." quando ha mais de 3', async () => {
      const axios = require('axios');

      axios.get.mockResolvedValueOnce({
        data: { esearchresult: { idlist: ['111'] } }
      });

      axios.get.mockResolvedValueOnce({
        data: {
          result: {
            '111': {
              uid: '111',
              title: 'Artigo com muitos autores',
              authors: [
                { name: 'A' }, { name: 'B' }, { name: 'C' },
                { name: 'D' }, { name: 'E' }
              ],
              source: 'Journal',
              pubdate: '2024'
            }
          }
        }
      });

      const result = await pubmedService.buscarArtigos('teste', 1);

      expect(result.sucesso).toBe(true);
      expect(result.artigos).toHaveLength(1);
      expect(result.artigos[0].autores).toContain('et al.');
    });
  });
});
