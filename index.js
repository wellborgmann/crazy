// Importando o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 3000;

// Configuração do banco de dados utilizando variáveis de ambiente
const config = {
  host: process.env.IP_SSH, // Host do banco de dados
  user: process.env.MYSQL_USER, // Usuário do banco de dados
  password: process.env.MYSQL_PASSWORD, // Senha do banco de dados
  database: process.env.MYSQL_DATABASE, // Banco de dados
};

// Função para criar a conexão
let connection;

async function connectToDatabase() {
  try {
    connection = await mysql.createConnection(config);
    console.log('Conexão ao banco de dados bem-sucedida!');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error.message);
    setTimeout(connectToDatabase, 5000); // Tenta reconectar após 5 segundos
  }
}

// Chama a função de conexão
await connectToDatabase(); // Usa await para aguardar a conexão

// Reconexão em caso de perda de conexão
if (connection) {
  connection.on('error', async (err) => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Conexão perdida. Tentando reconectar...');
      await connectToDatabase();
    } else {
      console.error('Erro na conexão:', err.message);
    }
  });
}

// Exemplo de consulta ao banco
async function getUsers() {
  if (!connection) {
    console.error('Conexão não foi estabelecida');
    return;
  }
  try {
    const [rows] = await connection.execute('SELECT * FROM oauth');
    console.log(rows);
  } catch (err) {
    console.error('Erro ao consultar o banco:', err.message);
  }
}

// Definindo a rota principal
app.get("/", async (req, res) => {
  try {
    const user = await getUsers(); // Corrigido: Removido o parâmetro desnecessário
    res.send(user);
  } catch (error) {
    res.send("Erro");
    console.log(error);
  }
});

// Iniciando o servidor Express
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
