const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const produtoService = require('./produtoService');
const pubmedService = require('./pubmedService');

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// System prompt que define a personalidade do Bolota
const SYSTEM_PROMPT = `Voce e o Bolota, um assistente virtual especializado em medicamentos veterinarios.

PERSONALIDADE:
- Seja prestativo, amigavel e profissional
- Use linguagem clara e acessivel
- Demonstre conhecimento sobre medicamentos veterinarios
- Seja conciso nas respostas

REGRAS IMPORTANTES:
1. SEMPRE alerte sobre a necessidade de prescricao veterinaria quando falar de medicamentos
2. NUNCA recomende dosagens especificas - isso e responsabilidade do veterinario
3. Quando o usuario perguntar sobre um medicamento, use a funcao buscar_artigos para trazer informacoes cientificas
4. Quando o usuario quiser saber preco/estoque, use a funcao buscar_estoque
5. Se o usuario confirmar que quer ver estoque (responder "sim", "quero", etc), consulte o estoque do ultimo medicamento mencionado

FORMATO DE RESPOSTA:
- Use markdown para formatar (negrito, listas)
- Seja objetivo mas informativo
- Sempre termine oferecendo mais ajuda`;

// Definicao das funcoes (tools) que o Gemini pode chamar
const tools = [
  {
    functionDeclarations: [
      {
        name: 'buscar_estoque',
        description: 'Busca informacoes de preco e disponibilidade de um produto no estoque local. Use quando o usuario quiser saber preco, disponibilidade ou estoque de um medicamento.',
        parameters: {
          type: 'object',
          properties: {
            termo: {
              type: 'string',
              description: 'Nome do medicamento ou produto para buscar'
            }
          },
          required: ['termo']
        }
      },
      {
        name: 'buscar_artigos',
        description: 'Busca artigos cientificos no PubMed sobre um medicamento veterinario. Use quando o usuario perguntar sobre um medicamento ou quiser informacoes cientificas.',
        parameters: {
          type: 'object',
          properties: {
            medicamento: {
              type: 'string',
              description: 'Nome do medicamento para buscar artigos'
            },
            limite: {
              type: 'number',
              description: 'Numero maximo de artigos (padrao: 3)'
            }
          },
          required: ['medicamento']
        }
      }
    ]
  }
];

// Funcao para executar as tools
async function executeTool(functionCall) {
  const { name, args } = functionCall;

  switch (name) {
    case 'buscar_estoque': {
      const produto = produtoService.findFirstByTermo(args.termo);
      if (produto) {
        return {
          encontrado: true,
          produto: {
            id: produto.id,
            descricao: produto.descricao,
            preco: produto.precoFormatado,
            estoque: produto.estoque,
            disponivel: produto.disponivel,
            status: produto.statusEstoque
          }
        };
      }
      return {
        encontrado: false,
        mensagem: `Produto "${args.termo}" nao encontrado no estoque`
      };
    }

    case 'buscar_artigos': {
      const resultado = await pubmedService.buscarArtigos(
        args.medicamento,
        args.limite || 3
      );
      return {
        sucesso: resultado.sucesso,
        totalEncontrado: resultado.totalEncontrado || 0,
        artigos: resultado.artigos?.map(a => ({
          titulo: a.titulo,
          autores: a.autores,
          revista: a.revista,
          ano: a.ano,
          link: a.link
        })) || []
      };
    }

    default:
      return { erro: `Funcao desconhecida: ${name}` };
  }
}

class LLMService {
  constructor() {
    this.model = null;
    this.conversationHistory = new Map(); // sessionId -> history
  }

  /**
   * Inicializa o modelo Gemini
   */
  _getModel() {
    if (!this.model) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY nao configurada no .env');
      }

      this.model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
        tools
      });
    }
    return this.model;
  }

  /**
   * Processa mensagem do usuario usando o Gemini
   */
  async processarMensagem(mensagem, sessionId) {
    try {
      const model = this._getModel();

      // Recuperar ou criar historico da conversa
      let history = this.conversationHistory.get(sessionId) || [];

      // Criar chat com historico
      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      });

      // Enviar mensagem
      let result = await chat.sendMessage(mensagem);
      let response = result.response;

      // Processar function calls se houver
      let functionCalls = response.functionCalls();
      let toolResults = [];

      while (functionCalls && functionCalls.length > 0) {
        // Executar todas as funcoes chamadas
        for (const fc of functionCalls) {
          const toolResult = await executeTool(fc);
          toolResults.push({
            name: fc.name,
            result: toolResult
          });
        }

        // Enviar resultados das funcoes de volta ao modelo
        result = await chat.sendMessage(
          toolResults.map(tr => ({
            functionResponse: {
              name: tr.name,
              response: tr.result
            }
          }))
        );

        response = result.response;
        functionCalls = response.functionCalls();
      }

      // Extrair texto da resposta
      const textoResposta = response.text();

      // Atualizar historico
      history = await chat.getHistory();
      this.conversationHistory.set(sessionId, history);

      return {
        sucesso: true,
        resposta: textoResposta,
        toolsUsadas: toolResults.map(tr => tr.name)
      };

    } catch (error) {
      console.error('Erro no LLM:', error);

      // Se o erro for de API key, retornar mensagem especifica
      if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
        return {
          sucesso: false,
          resposta: 'O agente Bolota precisa de uma chave da API do Gemini configurada. Por favor, configure GEMINI_API_KEY no arquivo .env',
          erro: 'API_KEY_MISSING'
        };
      }

      return {
        sucesso: false,
        resposta: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        erro: error.message
      };
    }
  }

  /**
   * Limpa historico de uma sessao
   */
  limparSessao(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  /**
   * Retorna estatisticas
   */
  getEstatisticas() {
    return {
      sessoesAtivas: this.conversationHistory.size,
      modelo: 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new LLMService();
