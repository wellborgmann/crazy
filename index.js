// Importando o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import {criarPix} from './src/mercadopago.js';
import {verifyGoogleToken} from './src/google.js';
import {
userInfo,
registerAccount
} from './src/banco.js';
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



app.get("/iptv", async (req, res) => {
res.send("iptv");
  });
  


  app.post("/google", async (req, res) => {
  const token = req.body.credential;

  try {
    const payload = await verifyGoogleToken(token);
    const userEmail = payload.email;
    req.session.userEmail = userEmail;

    try {
      const user = await userInfo(userEmail);

      if (user.length == 0) {
        await registerAccount(payload);
      }
      
      res.redirect("/iptv");
    } catch (error) {
      console.error("Erro ao verificar/extrair informações do usuário:", error);
      res.redirect("/");
    }
  } catch (error) {
    console.error("Erro ao verificar o token de ID do Google:", error);
    res.status(401).json({
      error: "Erro ao verificar o token de ID do Google",
      motivo: error.message,
    });
  }
});


// Iniciando o servidor Express
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
