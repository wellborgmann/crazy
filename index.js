// Importando o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import {criarPix} from './src/mercadopago.js';
import {verifyGoogleToken} from './src/google.js';
import {
userInfo,
registerAccount,
authenticateUser
} from './src/banco.js';
const app = express();
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const PORT = 3000;



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function checkAuth(req, res, next) {
    console.log("Usuário está conectado:", req.session.userEmail);
    if (req.session.userEmail) {
      next();
    } else {
      console.log("Usuário não está conectado, redirecionando para /login");
      res.redirect("/login");
    }
  }
  

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



app.get("/iptv",checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "iptv.html"));
  });
  app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
  });
  

  app.post("/oauth", async (req, res) => {
    let { email, password } = req.body;
    try {
      console.log("MINHA SENHA ", password);
      await authenticateUser(email, password);
      req.session.userEmail = email;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("LOGIN autenticado");
      res.redirect("/iptv");
    } catch (error) {
      console.log(error);
      res.status(401).redirect("/login");
    }
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
