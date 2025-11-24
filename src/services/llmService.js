// IMPORTANTE: dotenv deve ser carregado PRIMEIRO
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const produtoService = require('./produtoService');
const pubmedService = require('./pubmedService');

// Modelos disponiveis (pro primeiro, flash como fallback)
const MODELS = {
  PRIMARY: 'gemini-2.5-pro',
  FALLBACK: 'gemini-2.5-flash'
};

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

IMPORTANTE PARA FUNCTION CALLS:
- Ao chamar buscar_artigos, passe APENAS o nome do medicamento (ex: "amoxicilina", "apoquel")
- NAO inclua "para caes", "para gatos", "veterinario" no parametro - apenas o nome do principio ativo
- Ao chamar buscar_estoque, passe apenas o nome do produto

FORMATO DE RESPOSTA:
- Use markdown para formatar (negrito, listas)
- Seja objetivo mas informativo

FLUXO DE CONVERSACAO OBRIGATORIO:
Quando o usuario perguntar sobre um medicamento, sua resposta DEVE conter TODAS estas partes na ordem:

1. PRIMEIRO: Explique brevemente o que e o medicamento (1-2 frases)
2. SEGUNDO: Mostre os artigos cientificos encontrados (se houver)
3. TERCEIRO: Alerte sobre prescricao veterinaria
4. QUARTO: Pergunte "Gostaria de verificar o preco e disponibilidade deste medicamento em nosso estoque?"

Se o usuario responder "sim", "quero", "pode ser", use buscar_estoque com o nome do medicamento.
Apos mostrar o estoque, pergunte se precisa de mais alguma ajuda.

NUNCA pule as etapas 1, 2 e 3 - elas sao obrigatorias antes de perguntar sobre estoque.`;

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

// ========== UTILITIES ==========

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica se e erro de quota/rate limit
 */
function isQuotaError(error) {
  const message = error.message || '';
  const status = error.status || error.httpStatusCode;

  return status === 429 ||
         message.includes('429') ||
         message.includes('quota') ||
         message.includes('rate') ||
         message.includes('Too Many Requests');
}

/**
 * Verifica se o erro e retryable (transiente)
 */
function isRetryableError(error) {
  const message = error.message || '';
  const status = error.status || error.httpStatusCode;

  // Erros 500 sao transientes
  if (status === 500 || message.includes('500') || message.includes('Internal')) {
    return true;
  }

  // Rate limiting - retry com backoff (mas nao infinitamente)
  if (isQuotaError(error)) {
    return true;
  }

  // Erros de rede/timeout
  if (message.includes('ECONNRESET') || message.includes('ETIMEDOUT') || message.includes('network')) {
    return true;
  }

  // Erros que NAO devem ser retried
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }

  if (message.includes('API_KEY') || message.includes('API key') || message.includes('invalid')) {
    return false;
  }

  // Default: retry para erros desconhecidos
  return true;
}

/**
 * Retry com exponential backoff e jitter
 */
async function retryWithBackoff(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Nao retry se erro nao e transiente
      if (!isRetryableError(error)) {
        throw error;
      }

      // Ultima tentativa - nao esperar
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Calcular delay com exponential backoff + jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 1000; // 0-1s de jitter
      const delay = exponentialDelay + jitter;

      console.log(`[LLM] Tentativa ${attempt + 1} falhou, retry em ${Math.round(delay)}ms: ${error.message?.substring(0, 100)}`);

      await sleep(delay);
    }
  }

  throw lastError;
}

// Funcao para executar as tools com timeout
async function executeTool(functionCall) {
  const { name, args } = functionCall;

  try {
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
  } catch (error) {
    console.error(`[LLM] Erro ao executar tool ${name}:`, error.message);
    return { erro: `Erro ao executar ${name}: ${error.message}` };
  }
}

// ========== LLM SERVICE ==========

class LLMService {
  constructor() {
    this.genAI = null;
    this.models = {}; // Cache de modelos
    this.currentModel = MODELS.PRIMARY;
    this.conversationHistory = new Map(); // sessionId -> { history, model }
    this.sessionLocks = new Map(); // sessionId -> Promise (para evitar race conditions)
    this.isWarmedUp = false;
    this.modelQuotaExceeded = new Set(); // Modelos com quota excedida
  }

  /**
   * Inicializa o cliente Gemini (lazy)
   */
  _getGenAI() {
    if (!this.genAI) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY nao configurada no .env');
      }
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Obtem um modelo especifico
   */
  _getModelByName(modelName) {
    if (!this.models[modelName]) {
      const genAI = this._getGenAI();
      this.models[modelName] = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        tools
      });
      console.log(`[LLM] Modelo ${modelName} inicializado`);
    }
    return this.models[modelName];
  }

  /**
   * Obtem o melhor modelo disponivel
   */
  _getBestAvailableModel() {
    // Se o modelo primario nao esta com quota excedida, usa ele
    if (!this.modelQuotaExceeded.has(MODELS.PRIMARY)) {
      return { model: this._getModelByName(MODELS.PRIMARY), name: MODELS.PRIMARY };
    }

    // Fallback para o modelo secundario
    console.log(`[LLM] Usando fallback: ${MODELS.FALLBACK}`);
    return { model: this._getModelByName(MODELS.FALLBACK), name: MODELS.FALLBACK };
  }

  /**
   * Marca modelo como tendo quota excedida (temporariamente)
   */
  _markQuotaExceeded(modelName) {
    this.modelQuotaExceeded.add(modelName);
    console.log(`[LLM] Modelo ${modelName} marcado como quota excedida`);

    // Limpar flag apos 60 segundos
    setTimeout(() => {
      this.modelQuotaExceeded.delete(modelName);
      console.log(`[LLM] Modelo ${modelName} liberado para uso novamente`);
    }, 60000);
  }

  /**
   * Warmup - inicializa modelo antes de receber requisicoes
   */
  async warmup() {
    if (this.isWarmedUp) return;

    try {
      console.log('[LLM] Iniciando warmup...');

      // Inicializar modelo fallback (flash) que tem maior rate limit
      const model = this._getModelByName(MODELS.FALLBACK);

      const chat = model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 50 }
      });

      await retryWithBackoff(async () => {
        const result = await chat.sendMessage('oi');
        return result.response.text();
      }, { maxRetries: 2, baseDelay: 500 });

      this.isWarmedUp = true;
      console.log('[LLM] Warmup concluido com sucesso');
    } catch (error) {
      console.error('[LLM] Erro no warmup (continuando mesmo assim):', error.message);
      this.isWarmedUp = true;
    }
  }

  /**
   * Adquire lock para uma sessao (evita race conditions)
   */
  async _acquireLock(sessionId) {
    while (this.sessionLocks.has(sessionId)) {
      await this.sessionLocks.get(sessionId);
    }

    let releaseLock;
    const lockPromise = new Promise(resolve => {
      releaseLock = resolve;
    });

    this.sessionLocks.set(sessionId, lockPromise);
    return releaseLock;
  }

  /**
   * Libera lock de uma sessao
   */
  _releaseLock(sessionId, releaseFn) {
    this.sessionLocks.delete(sessionId);
    releaseFn();
  }

  /**
   * Processa mensagem internamente com um modelo especifico
   */
  async _processWithModel(mensagem, sessionId, modelName) {
    const model = this._getModelByName(modelName);

    // Recuperar historico da conversa
    const sessionData = this.conversationHistory.get(sessionId) || { history: [], model: modelName };
    let history = sessionData.history;

    // Se mudou de modelo, limpar historico (modelos diferentes)
    if (sessionData.model !== modelName) {
      console.log(`[LLM] Mudanca de modelo detectada, limpando historico da sessao`);
      history = [];
    }

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
    this.conversationHistory.set(sessionId, { history, model: modelName });

    return {
      sucesso: true,
      resposta: textoResposta,
      toolsUsadas: toolResults.map(tr => tr.name),
      modeloUsado: modelName
    };
  }

  /**
   * Processa mensagem do usuario usando o Gemini
   * Com fallback automatico entre modelos
   */
  async processarMensagem(mensagem, sessionId) {
    const releaseLock = await this._acquireLock(sessionId);

    try {
      // Tentar com o modelo primario primeiro
      const modelsToTry = [MODELS.PRIMARY, MODELS.FALLBACK];

      for (const modelName of modelsToTry) {
        // Pular modelo se quota excedida
        if (this.modelQuotaExceeded.has(modelName)) {
          console.log(`[LLM] Pulando ${modelName} (quota excedida)`);
          continue;
        }

        try {
          console.log(`[LLM] Tentando com modelo: ${modelName}`);

          const resultado = await retryWithBackoff(async () => {
            return await this._processWithModel(mensagem, sessionId, modelName);
          }, { maxRetries: 2, baseDelay: 1000 });

          return resultado;

        } catch (error) {
          // Se for erro de quota, marcar e tentar proximo modelo
          if (isQuotaError(error)) {
            this._markQuotaExceeded(modelName);
            console.log(`[LLM] Quota excedida para ${modelName}, tentando fallback...`);
            continue;
          }

          // Outros erros, propagar
          throw error;
        }
      }

      // Se chegou aqui, todos os modelos falharam
      return {
        sucesso: false,
        resposta: 'O servico esta temporariamente sobrecarregado. Por favor, aguarde alguns segundos e tente novamente.',
        erro: 'ALL_MODELS_QUOTA_EXCEEDED'
      };

    } catch (error) {
      console.error('[LLM] Erro ao processar mensagem:', error);

      if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
        return {
          sucesso: false,
          resposta: 'O agente Bolota precisa de uma chave da API do Gemini configurada.',
          erro: 'API_KEY_MISSING'
        };
      }

      return {
        sucesso: false,
        resposta: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        erro: error.message
      };

    } finally {
      this._releaseLock(sessionId, releaseLock);
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
      modeloPrimario: MODELS.PRIMARY,
      modeloFallback: MODELS.FALLBACK,
      modelosComQuotaExcedida: Array.from(this.modelQuotaExceeded),
      isWarmedUp: this.isWarmedUp,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new LLMService();
