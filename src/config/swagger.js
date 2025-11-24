const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bolota API',
      version: '1.0.0',
      description: 'IAgente especialista em medicamentos veterinarios. Integra consulta de estoque local com busca de artigos cientificos do PubMed.',
      contact: {
        name: 'Suporte Bolota'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento'
      }
    ],
    tags: [
      {
        name: 'Produtos',
        description: 'Operacoes de estoque e preco'
      },
      {
        name: 'PubMed',
        description: 'Busca de artigos cientificos'
      },
      {
        name: 'Webhook',
        description: 'Interacao com o agente Bolota'
      }
    ],
    components: {
      schemas: {
        Produto: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1001
            },
            descricao: {
              type: 'string',
              example: 'Amoxicilina 500mg (Antibiotico)'
            },
            preco: {
              type: 'number',
              example: 25.90
            },
            precoFormatado: {
              type: 'string',
              example: 'R$ 25,90'
            },
            estoque: {
              type: 'integer',
              example: 150
            },
            disponivel: {
              type: 'boolean',
              example: true
            },
            statusEstoque: {
              type: 'string',
              enum: ['Em estoque', 'Estoque moderado', 'Estoque baixo', 'Indisponivel'],
              example: 'Em estoque'
            }
          }
        },
        Artigo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '29352469'
            },
            titulo: {
              type: 'string',
              example: 'Amoxicillin-current use in swine medicine.'
            },
            autores: {
              type: 'string',
              example: 'Burch DGS, Sperling D'
            },
            revista: {
              type: 'string',
              example: 'J Vet Pharmacol Ther'
            },
            ano: {
              type: 'string',
              example: '2018'
            },
            link: {
              type: 'string',
              example: 'https://pubmed.ncbi.nlm.nih.gov/29352469/'
            }
          }
        },
        MensagemWebhook: {
          type: 'object',
          required: ['mensagem'],
          properties: {
            mensagem: {
              type: 'string',
              description: 'Mensagem do usuario',
              example: 'Me fale sobre Amoxicilina para caes'
            },
            session_id: {
              type: 'string',
              description: 'ID da sessao (opcional na primeira mensagem)',
              example: 'abc-123-def'
            }
          }
        },
        RespostaWebhook: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              example: 'abc-123-def'
            },
            sucesso: {
              type: 'boolean',
              example: true
            },
            resposta: {
              type: 'string',
              example: '**Sobre Amoxicilina:**\n\nA Amoxicilina e um antibiotico...'
            },
            artigos: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Artigo'
              }
            },
            pergunta: {
              type: 'string',
              nullable: true,
              example: 'Deseja verificar o preco e disponibilidade em estoque?'
            },
            produto: {
              $ref: '#/components/schemas/Produto'
            },
            alerta: {
              type: 'string',
              example: 'Uso somente com prescricao veterinaria'
            }
          }
        },
        Erro: {
          type: 'object',
          properties: {
            sucesso: {
              type: 'boolean',
              example: false
            },
            erro: {
              type: 'string',
              example: 'Mensagem de erro'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
