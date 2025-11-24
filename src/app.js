const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Rotas
const produtosRoutes = require('./routes/produtos');
const pubmedRoutes = require('./routes/pubmed');
const webhookRoutes = require('./routes/webhook');

// Swagger
const swaggerSpec = require('./config/swagger');

// Inicializar banco de dados
const { getDatabase, closeDatabase, queryOne } = require('./config/database');
const { loadCSVToDatabase } = require('./utils/csvLoader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estaticos (interface do chat)
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Bolota API - Documentacao'
}));

// Middleware de logging simples
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Rota da API info (JSON)
app.get('/api', (req, res) => {
  res.json({
    nome: 'Bolota API',
    descricao: 'IAgente especialista em medicamentos veterinarios',
    versao: '1.0.0',
    chat: '/',
    documentacao: '/api-docs',
    endpoints: {
      produtos: {
        listar: 'GET /api/produtos',
        buscar: 'GET /api/produtos/busca?termo=',
        porId: 'GET /api/produtos/:id'
      },
      pubmed: {
        artigos: 'GET /api/pubmed/:medicamento'
      },
      webhook: {
        processar: 'POST /webhook/bolota',
        status: 'GET /webhook/bolota/status'
      }
    }
  });
});

// Rotas da API
app.use('/api/produtos', produtosRoutes);
app.use('/api/pubmed', pubmedRoutes);
app.use('/webhook', webhookRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Handler de rotas nao encontradas
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: 'Endpoint nao encontrado',
    sugestao: 'Acesse GET / para ver os endpoints disponiveis'
  });
});

// Handler de erros
app.use((err, req, res, next) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({
    sucesso: false,
    erro: 'Erro interno do servidor'
  });
});

// Funcao para inicializar o servidor
async function iniciar() {
  try {
    console.log('\n========================================');
    console.log('   BOLOTA - Agente Veterinario');
    console.log('========================================\n');

    // Inicializar banco de dados
    console.log('Inicializando banco de dados...');
    await getDatabase();

    // Verificar se precisa carregar dados do CSV
    const count = queryOne('SELECT COUNT(*) as total FROM produtos');

    if (!count || count.total === 0) {
      console.log('Carregando dados do CSV...');
      const csvPath = path.join(process.cwd(), 'dados_produtos.csv');
      await loadCSVToDatabase(csvPath);
    } else {
      console.log(`Banco de dados ja contem ${count.total} produtos.`);
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\nServidor rodando em http://localhost:${PORT}`);
      console.log(`\n>>> Interface do Chat: http://localhost:${PORT}/`);
      console.log(`>>> Documentacao Swagger: http://localhost:${PORT}/api-docs`);
      console.log('\nEndpoints da API:');
      console.log(`  - GET  http://localhost:${PORT}/api`);
      console.log(`  - GET  http://localhost:${PORT}/api/produtos`);
      console.log(`  - GET  http://localhost:${PORT}/api/produtos/busca?termo=amoxicilina`);
      console.log(`  - GET  http://localhost:${PORT}/api/pubmed/amoxicilina`);
      console.log(`  - POST http://localhost:${PORT}/webhook/bolota`);
      console.log('\n========================================\n');
    });

  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nEncerrando servidor...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nEncerrando servidor...');
  closeDatabase();
  process.exit(0);
});

// Iniciar aplicacao
iniciar();

module.exports = app;
