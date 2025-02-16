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
connectToDatabase();

// Exemplo de consulta ao banco
async function getUsers() {
  try {
    const [rows] = await connection.execute('SELECT * FROM oauth');
    return rows;
  } catch (err) {
    console.error('Erro ao consultar o banco:', err.message);
    throw err; // Lançando erro para que o chamador possa tratá-lo
  }
}
console.log("||||||||||||||  "+process.env.MYSQL_PASSWORD);
// Definindo a rota principal
app.get("/", async (req, res) => {
  
  try {
    const users = await getUsers(); // Chamando a função de consulta ao banco
    res.send("Servidor Express com ESModules está rodando!");
  } catch (error) {
    res.status(500).send("Erro ao acessar o banco de dados");
    console.error(error);
  }
});

// Iniciando o servidor Express
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
