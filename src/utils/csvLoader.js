const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { getDatabase, run, saveDatabase } = require('../config/database');

async function loadCSVToDatabase(csvPath) {
  return new Promise((resolve, reject) => {
    const produtos = [];
    const absolutePath = path.resolve(process.cwd(), csvPath);

    if (!fs.existsSync(absolutePath)) {
      reject(new Error(`Arquivo CSV nao encontrado: ${absolutePath}`));
      return;
    }

    fs.createReadStream(absolutePath)
      .pipe(csv())
      .on('data', (row) => {
        produtos.push({
          id: parseInt(row.id, 10),
          descricao: row.descricao,
          preco: parseFloat(row.preco),
          estoque: parseInt(row.estoque, 10)
        });
      })
      .on('end', async () => {
        try {
          const db = await getDatabase();

          // Limpar tabela antes de inserir
          db.run('DELETE FROM produtos');

          // Inserir todos os produtos
          for (const produto of produtos) {
            db.run(
              'INSERT INTO produtos (id, descricao, preco, estoque) VALUES (?, ?, ?, ?)',
              [produto.id, produto.descricao, produto.preco, produto.estoque]
            );
          }

          // Salvar banco no disco
          saveDatabase();

          console.log(`${produtos.length} produtos carregados com sucesso!`);
          resolve(produtos.length);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

module.exports = { loadCSVToDatabase };
