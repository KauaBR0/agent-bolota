const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

/**
 * @swagger
 * /webhook/bolota:
 *   post:
 *     summary: Processa mensagem do usuario
 *     description: |
 *       Endpoint principal para interacao com o agente Bolota.
 *
 *       **Fluxo de conversacao:**
 *       1. Envie uma mensagem perguntando sobre um medicamento
 *       2. O agente retorna informacoes e artigos, perguntando se quer ver estoque
 *       3. Responda "Sim" (com o session_id) para ver preco e disponibilidade
 *
 *       **Exemplo:**
 *       - Primeira mensagem: `{ "mensagem": "Me fale sobre Amoxicilina" }`
 *       - Segunda mensagem: `{ "mensagem": "Sim", "session_id": "abc-123" }`
 *     tags: [Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MensagemWebhook'
 *           examples:
 *             perguntaInicial:
 *               summary: Pergunta sobre medicamento
 *               value:
 *                 mensagem: "Me fale sobre Amoxicilina para caes"
 *             confirmacaoEstoque:
 *               summary: Confirmar consulta de estoque
 *               value:
 *                 mensagem: "Sim"
 *                 session_id: "abc-123-def"
 *     responses:
 *       200:
 *         description: Resposta do agente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaWebhook'
 *       400:
 *         description: Mensagem invalida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       500:
 *         description: Erro interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/bolota', agentController.processar);

/**
 * @swagger
 * /webhook/bolota/status:
 *   get:
 *     summary: Retorna status do agente
 *     tags: [Webhook]
 *     responses:
 *       200:
 *         description: Status do agente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 agente:
 *                   type: string
 *                   example: Bolota
 *                 versao:
 *                   type: string
 *                   example: "1.0.0"
 *                 status:
 *                   type: string
 *                   example: online
 *                 sessoesAtivas:
 *                   type: integer
 *                   example: 5
 */
router.get('/bolota/status', agentController.status);

/**
 * @swagger
 * /webhook/bolota/sessao/{sessionId}:
 *   delete:
 *     summary: Limpa uma sessao especifica
 *     tags: [Webhook]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sessao a ser removida
 *     responses:
 *       200:
 *         description: Sessao removida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 mensagem:
 *                   type: string
 *                   example: Sessao abc-123 removida
 */
router.delete('/bolota/sessao/:sessionId', agentController.limparSessao);

module.exports = router;
