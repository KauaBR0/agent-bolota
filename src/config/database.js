const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './bolota.db';
const absolutePath = path.resolve(process.cwd(), dbPath);

let db = null;
let SQL = null;

async function initializeSQL() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

async function getDatabase() {
  if (!db) {
    await initializeSQL();

    // Verificar se arquivo do banco existe
    if (fs.existsSync(absolutePath)) {
      const fileBuffer = fs.readFileSync(absolutePath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    initializeTables();
  }
  return db;
}

function initializeTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY,
      descricao TEXT NOT NULL,
      preco REAL NOT NULL,
      estoque INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_produtos_descricao
    ON produtos(descricao)
  `);
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(absolutePath, buffer);
  }
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Helper para executar queries que retornam resultados
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper para executar queries que retornam um unico resultado
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper para executar comandos (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

module.exports = {
  getDatabase,
  closeDatabase,
  saveDatabase,
  queryAll,
  queryOne,
  run
};
