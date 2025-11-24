/**
 * Script para inicializar o banco de dados com dados do CSV
 * Execute: npm run init-db
 */

const path = require('path');
require('dotenv').config();

const { loadCSVToDatabase } = require('./csvLoader');
const { closeDatabase } = require('../config/database');

async function main() {
  console.log('Iniciando carregamento do banco de dados...\n');

  try {
    const csvPath = path.join(process.cwd(), 'dados_produtos.csv');
    const count = await loadCSVToDatabase(csvPath);

    console.log(`\nBanco de dados inicializado com ${count} produtos.`);
    console.log('Arquivo: bolota.db');
  } catch (error) {
    console.error('Erro ao carregar dados:', error.message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();
