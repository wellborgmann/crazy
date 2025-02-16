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
import session from 'express-session';

const PORT = 3000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json()); 

app.use(express.urlencoded({ extended: true }));

app.use(session({ 
  secret: 'your-secret', 
  resave: false, 
  saveUninitialized: true 
}));
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
    const users = await criarPix("wellbrgmann2@gmail.com", 30, "renovar", "Ok"); // Chama a função para obter os usuários
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
      console.log(req);
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
  const token = req.body.credential;  // O token será passado no corpo da requisição
  try {
    const payload = await verifyGoogleToken(token);  // Verifique o token com a função apropriada
    const userEmail = payload.email;
    req.session.userEmail = userEmail;

    try {
      const user = await userInfo(userEmail);
      if (user.length === 0) {
        await registerAccount(payload);  // Se o usuário não existir, cria uma nova conta
      }
      res.redirect("/iptv");  // Redireciona para o IPTV após o login bem-sucedido
    } catch (error) {
      console.error("Erro ao verificar/extrair informações do usuário:", error);
      res.redirect("/");  // Redireciona em caso de erro
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
