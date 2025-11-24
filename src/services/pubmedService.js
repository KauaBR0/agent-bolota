const axios = require('axios');

const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

class PubmedService {
  constructor() {
    this.apiKey = process.env.PUBMED_API_KEY || '';
    this.email = process.env.PUBMED_EMAIL || '';
  }

  /**
   * Busca artigos relacionados a um medicamento veterinario
   * @param {string} medicamento - Nome do medicamento
   * @param {number} maxResults - Numero maximo de resultados (default: 5)
   */
  async buscarArtigos(medicamento, maxResults = 5) {
    try {
      // Passo 1: Buscar IDs dos artigos
      const termoBusca = `${medicamento} veterinary OR ${medicamento} animal`;
      const ids = await this._searchArticleIds(termoBusca, maxResults);

      if (ids.length === 0) {
        return {
          sucesso: true,
          termo: medicamento,
          totalEncontrado: 0,
          artigos: [],
          mensagem: 'Nenhum artigo encontrado para este medicamento.'
        };
      }

      // Passo 2: Buscar detalhes dos artigos
      const artigos = await this._fetchArticleDetails(ids);

      return {
        sucesso: true,
        termo: medicamento,
        totalEncontrado: artigos.length,
        artigos
      };
    } catch (error) {
      console.error('Erro ao buscar artigos no PubMed:', error.message);
      return {
        sucesso: false,
        termo: medicamento,
        erro: error.message,
        artigos: []
      };
    }
  }

  /**
   * Busca IDs de artigos usando esearch
   */
  async _searchArticleIds(termo, maxResults) {
    const params = new URLSearchParams({
      db: 'pubmed',
      term: termo,
      retmax: maxResults.toString(),
      retmode: 'json',
      sort: 'relevance'
    });

    if (this.apiKey) params.append('api_key', this.apiKey);
    if (this.email) params.append('email', this.email);

    const response = await axios.get(`${PUBMED_BASE_URL}/esearch.fcgi?${params}`, {
      timeout: 10000
    });

    const result = response.data.esearchresult;
    return result.idlist || [];
  }

  /**
   * Busca detalhes dos artigos usando esummary
   */
  async _fetchArticleDetails(ids) {
    if (ids.length === 0) return [];

    const params = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json'
    });

    if (this.apiKey) params.append('api_key', this.apiKey);
    if (this.email) params.append('email', this.email);

    const response = await axios.get(`${PUBMED_BASE_URL}/esummary.fcgi?${params}`, {
      timeout: 10000
    });

    const result = response.data.result;
    const artigos = [];

    for (const id of ids) {
      const artigo = result[id];
      if (artigo) {
        artigos.push(this._formatArtigo(artigo));
      }
    }

    return artigos;
  }

  /**
   * Formata artigo para resposta
   */
  _formatArtigo(artigo) {
    // Extrair autores
    const autores = artigo.authors
      ? artigo.authors.slice(0, 3).map(a => a.name).join(', ')
      : 'Autores nao disponiveis';

    // Adicionar "et al." se houver mais de 3 autores
    const autoresFormatado = artigo.authors && artigo.authors.length > 3
      ? `${autores} et al.`
      : autores;

    return {
      id: artigo.uid,
      titulo: artigo.title || 'Titulo nao disponivel',
      autores: autoresFormatado,
      revista: artigo.source || 'N/A',
      ano: artigo.pubdate ? artigo.pubdate.split(' ')[0] : 'N/A',
      resumo: artigo.sorttitle || 'Resumo nao disponivel via API sumaria',
      link: `https://pubmed.ncbi.nlm.nih.gov/${artigo.uid}/`
    };
  }
}

module.exports = new PubmedService();
