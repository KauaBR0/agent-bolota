/**
 * Helper para inicializar banco de dados em memoria para testes
 */
const initSqlJs = require('sql.js');

let SQL = null;
let testDb = null;

async function initTestDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  testDb = new SQL.Database();

  // Criar tabela
  testDb.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY,
      descricao TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Inserir dados de teste
  const produtos = [
    { id: 1001, descricao: 'Amoxicilina 500mg (Antibiotico)', preco: 25.90, estoque: 150 },
    { id: 1002, descricao: 'Apoquel 5.4mg (Dermatologico)', preco: 112.00, estoque: 30 },
    { id: 1003, descricao: 'Simparic 80mg (Antipulgas)', preco: 95.50, estoque: 0 },
    { id: 1004, descricao: 'Dipirona Sodica Vet 20ml', preco: 12.90, estoque: 200 }
  ];

  for (const p of produtos) {
    testDb.run(
      'INSERT INTO produtos (id, descricao, preco, estoque) VALUES (?, ?, ?, ?)',
      [p.id, p.descricao, p.preco, p.estoque]
    );
  }

  return testDb;
}

function getTestDb() {
  return testDb;
}

function closeTestDatabase() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

// Funcoes de query para testes
function queryAll(sql, params = []) {
  const stmt = testDb.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

module.exports = {
  initTestDatabase,
  getTestDb,
  closeTestDatabase,
  queryAll,
  queryOne
};
