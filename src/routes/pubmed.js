const express = require('express');
const router = express.Router();
const pubmedController = require('../controllers/pubmedController');

/**
 * @swagger
 * /api/pubmed/{medicamento}:
 *   get:
 *     summary: Busca artigos cientificos sobre um medicamento
 *     description: |
 *       Consulta a API do PubMed (E-utilities) e retorna artigos cientificos
 *       relacionados ao medicamento veterinario informado.
 *     tags: [PubMed]
 *     parameters:
 *       - in: path
 *         name: medicamento
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Nome do medicamento para buscar
 *         example: amoxicilina
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 5
 *         description: Numero maximo de artigos a retornar
 *     responses:
 *       200:
 *         description: Artigos encontrados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: true
 *                 termo:
 *                   type: string
 *                   example: amoxicilina
 *                 totalEncontrado:
 *                   type: integer
 *                   example: 5
 *                 artigos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Artigo'
 *       400:
 *         description: Parametro invalido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       502:
 *         description: Erro na API externa (PubMed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso:
 *                   type: boolean
 *                   example: false
 *                 erro:
 *                   type: string
 *                   example: Erro ao consultar PubMed
 *                 detalhes:
 *                   type: string
 */
router.get('/:medicamento', pubmedController.buscarArtigos);

module.exports = router;
