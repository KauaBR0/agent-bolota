# Bolota - IAgente Veterinario

Assistente virtual especialista em medicamentos veterinarios com **IA conversacional** (Google Gemini). Integra consulta de estoque local com busca de artigos cientificos do PubMed.

## Funcionalidades

- **Chat com IA**: Conversas naturais usando Google Gemini 2.5 Flash
- **Function Calling**: O LLM decide automaticamente quando buscar artigos ou estoque
- **Memoria de Sessao**: Mantem contexto da conversa
- **Interface Web**: Chat interativo em `http://localhost:3000/`
- **API REST**: Endpoints para integracao
- **Documentacao Swagger**: API documentada em `/api-docs`

## Arquitetura

```
bolota/
├── src/
│   ├── config/
│   │   ├── database.js          # Conexao SQLite (sql.js)
│   │   └── swagger.js           # Configuracao OpenAPI
│   ├── controllers/
│   │   ├── produtoController.js # Busca estoque/preco
│   │   ├── pubmedController.js  # Integracao PubMed
│   │   └── agentController.js   # Orquestracao do Bolota
│   ├── services/
│   │   ├── llmService.js        # Integracao Google Gemini (LLM)
│   │   ├── produtoService.js    # Logica de negocios produtos
│   │   ├── pubmedService.js     # Chamadas API PubMed
│   │   └── agentService.js      # Orquestracao do agente
│   ├── routes/
│   │   ├── produtos.js          # Rotas de produtos
│   │   ├── pubmed.js            # Rotas PubMed
│   │   └── webhook.js           # Webhook do agente
│   ├── public/
│   │   └── index.html           # Interface web do chat
│   ├── utils/
│   │   ├── csvLoader.js         # Importador CSV
│   │   └── initDatabase.js      # Script inicializacao
│   └── app.js                   # Servidor Express
├── __tests__/
│   ├── unit/                    # Testes unitarios
│   └── integration/             # Testes de integracao
├── dados_produtos.csv           # Dados de produtos
├── bolota.db                    # Banco SQLite (gerado)
├── jest.config.js               # Configuracao Jest
├── package.json
├── .env
└── README.md
```

## Requisitos

- Node.js 18+
- npm ou yarn

## Instalacao

```bash
# Clonar/acessar o projeto
cd bolota

# Instalar dependencias
npm install

# Configurar variaveis de ambiente (opcional)
cp .env.example .env

# Iniciar o servidor (carrega CSV automaticamente)
npm start
```

O servidor iniciara em `http://localhost:3000`

## Documentacao Interativa (Swagger)

Acesse a documentacao completa da API em:

```
http://localhost:3000/api-docs
```

A interface Swagger permite:
- Visualizar todos os endpoints
- Testar requisicoes diretamente no navegador
- Ver schemas de request/response

## Endpoints da API

### Produtos (Estoque Local)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/produtos` | Lista todos os produtos |
| GET | `/api/produtos/busca?termo=` | Busca por nome |
| GET | `/api/produtos/:id` | Busca por ID |

### PubMed (Artigos Cientificos)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/pubmed/:medicamento` | Busca artigos |
| GET | `/api/pubmed/:medicamento?limite=10` | Com limite |

### Webhook do Agente

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/webhook/bolota` | Interacao com agente |
| GET | `/webhook/bolota/status` | Status do agente |

## Exemplos de Uso

### 1. Listar Produtos

```bash
curl http://localhost:3000/api/produtos
```

Resposta:
```json
{
  "sucesso": true,
  "total": 7,
  "produtos": [
    {
      "id": 1001,
      "descricao": "Amoxicilina 500mg (Antibiotico)",
      "preco": 25.9,
      "precoFormatado": "R$ 25,90",
      "estoque": 150,
      "disponivel": true,
      "statusEstoque": "Em estoque"
    }
  ]
}
```

### 2. Buscar Produto por Nome

```bash
curl "http://localhost:3000/api/produtos/busca?termo=amoxicilina"
```

### 3. Buscar Artigos no PubMed

```bash
curl http://localhost:3000/api/pubmed/amoxicilina
```

Resposta:
```json
{
  "sucesso": true,
  "termo": "amoxicilina",
  "totalEncontrado": 3,
  "artigos": [
    {
      "id": "12345678",
      "titulo": "Amoxicillin use in veterinary medicine...",
      "autores": "Smith J, Jones K et al.",
      "revista": "Vet Pharmacol",
      "ano": "2023",
      "link": "https://pubmed.ncbi.nlm.nih.gov/12345678/"
    }
  ]
}
```

### 4. Interagir com o Agente Bolota

**Primeira mensagem:**
```bash
curl -X POST http://localhost:3000/webhook/bolota \
  -H "Content-Type: application/json" \
  -d '{"mensagem": "Me fale sobre Amoxicilina para caes"}'
```

Resposta:
```json
{
  "sessionId": "abc-123-def",
  "sucesso": true,
  "resposta": "**Sobre Amoxicilina:**\n\nA Amoxicilina e um antibiotico...",
  "artigos": [...],
  "pergunta": "Deseja verificar o preco e disponibilidade em estoque?"
}
```

**Segunda mensagem (confirmando):**
```bash
curl -X POST http://localhost:3000/webhook/bolota \
  -H "Content-Type: application/json" \
  -d '{"mensagem": "Sim", "session_id": "abc-123-def"}'
```

Resposta:
```json
{
  "sessionId": "abc-123-def",
  "sucesso": true,
  "resposta": "**Informacoes de Estoque:**\n\n**Produto:** Amoxicilina 500mg...",
  "produto": {
    "id": 1001,
    "descricao": "Amoxicilina 500mg (Antibiotico)",
    "preco": 25.9,
    "precoFormatado": "R$ 25,90",
    "estoque": 150,
    "disponivel": true
  },
  "alerta": "Uso somente com prescricao veterinaria"
}
```

## Fluxo de Conversacao

```
Usuario: "Me fale sobre Amoxicilina para caes"
    |
    v
Bolota: Explica o medicamento + artigos PubMed
        Pergunta: "Deseja ver preco/estoque?"
    |
    v
Usuario: "Sim"
    |
    v
Bolota: Retorna preco, estoque e alerta de prescricao
```

## Integracao com PubMed

O sistema utiliza a API E-utilities do NCBI (gratuita):

- **esearch**: Busca IDs de artigos por termo
- **esummary**: Obtem detalhes dos artigos

Documentacao oficial: https://www.ncbi.nlm.nih.gov/books/NBK25500/

### Configuracao opcional (maior rate limit)

```env
PUBMED_API_KEY=sua_chave_aqui
PUBMED_EMAIL=seu@email.com
```

## Medicamentos no Banco

| ID | Produto | Preco | Estoque |
|----|---------|-------|---------|
| 1001 | Amoxicilina 500mg | R$ 25,90 | 150 |
| 1002 | Apoquel 5.4mg | R$ 112,00 | 30 |
| 1003 | Simparic 80mg | R$ 95,50 | 0 |
| 1004 | Dipirona Sodica 20ml | R$ 12,90 | 200 |
| 1005 | Bravecto Transdermal | R$ 180,00 | 12 |
| 1006 | Shampoo Hipoalergenico | R$ 42,50 | 5 |
| 1007 | Suplemento Vitaminico | R$ 55,00 | 50 |

## Scripts

```bash
# Iniciar servidor
npm start

# Modo desenvolvimento (auto-reload)
npm run dev

# Inicializar banco manualmente
npm run init-db

# Rodar testes
npm test

# Rodar testes em modo watch
npm run test:watch

# Rodar testes com coverage
npm run test:coverage
```

## Testes

O projeto possui 45 testes automatizados cobrindo:

### Testes Unitarios
- `produtoService.test.js` - Busca e formatacao de produtos
- `pubmedService.test.js` - Integracao com API PubMed
- `agentService.test.js` - Orquestracao do agente com LLM mockado

### Testes de Integracao
- `produtos.test.js` - Endpoints de produtos
- `pubmed.test.js` - Endpoints do PubMed
- `webhook.test.js` - Webhook do agente Bolota (LLM mockado)
- `app.test.js` - Rotas principais

```bash
# Resultado esperado:
Test Suites: 7 passed, 7 total
Tests:       45 passed, 45 total
```

## Estrutura de Resposta

Todas as respostas seguem o padrao:

```json
{
  "sucesso": true|false,
  "erro": "mensagem de erro (se houver)",
  ...dados
}
```

## Tratamento de Erros

| Codigo | Descricao |
|--------|-----------|
| 400 | Parametros invalidos |
| 404 | Recurso nao encontrado |
| 500 | Erro interno do servidor |
| 502 | Erro na API externa (PubMed) |

## Seguranca

- CORS habilitado
- Validacao de entrada em todos os endpoints
- Limite de tamanho de mensagem (1000 caracteres)
- Parametros sanitizados antes de queries SQL

## Licenca

MIT
