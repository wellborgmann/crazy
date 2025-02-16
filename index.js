// Importando o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import {criarPix} from './src/mercadopago.js';
import {getUser} from './src/banco.js';
const app = express();
const PORT = 3000;



// Definindo a rota principal
app.get("/", async (req, res) => {
  try {
    const users = await criarPix("wellbrgmann@gmail.com", 30, "renovar", "Ola mundo"); // Chama a função para obter os usuários
    res.json(users); // Responde com os dados do banco em formato JSON
  } catch (error) {
    res.status(500).send("Erro ao consultar o banco de dados");
    console.error(error);
  }
});

// Iniciando o servidor Express
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
