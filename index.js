import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { criarPix } from './src/mercadopago.js';
import { verifyGoogleToken } from './src/google.js';
import {
  testing,
  userInfo,
  registerAccount,
  getPayment,
  db_userssh,
  resetPasswordDB,
  resetPasswordInfo,
  userUpdatePass,
  authenticateUser,
  updatePayment,
  atualizarSenha,
  atualizarTimestamp,
  insertPayment,
  removerPagamentoAprovado
} from './src/banco.js';
import session from 'express-session';
import * as zlib from 'zlib';
import bcrypt from 'bcrypt';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const server = createServer(app); // Criando o servidor HTTP para usar com o Express
const io = new Server(server, {
  cors: {
    origin: "*", // Alterar para o domínio correto do frontend se necessário
    methods: ["GET", "POST"]
  },
  transports: ["polling"] // Força o uso de polling
});


// Configurações de caminho
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(session({ 
  secret: 'your-secret', 
  resave: false, 
  saveUninitialized: true 
}));

app.use(
  express.static(path.join(__dirname, "/assets"), {
    etag: false,
    lastModified: false,
    maxAge: 0,
  })
);
app.use(
  express.static(path.join(__dirname, "../views"), {
    etag: false,
    lastModified: false,
    maxAge: 0,
  })
);

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
  res.send("funcionando");
  // try {
  //   const users = await criarPix("wellbrgmann2@gmail.com", 30, "renovar", "Ok"); // Chama a função para obter os usuários
  //   res.json(users); // Responde com os dados do banco em formato JSON
  // } catch (error) {
  //   res.status(500).send("Erro ao consultar o banco de dados");
  //   console.error(error);
  // }
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
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});






const sockets = {};
const emailSockets = {}; 


io.use((socket, next) => {
  const sessionID = socket.request.headers.cookie; // Acessando os cookies para pegar a sessão
  if (!sessionID) {
    return next(new Error('Session ID unknown'));
  }
  next();
});


io.on("connection", (socket) => {
  // Obter faturas do usuário conectado
  console.log("CLIENTE CONECTADO");

  socket.emit('user-email',  socket.request.session.userEmail);

  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
    // Você pode optar por destruir o socket, se necessário
    socket.destroy(); // Fecha o socket
  });

  socket.on("faturas", async () => {
    const email = socket.request.session.userEmail;
    if (!email) return;
    const faturas = await getPayment(email);
    if (!faturas) return;
    console.log("FATURAS", faturas);
    socket.emit("faturas-res", faturas);
  });

  // Obter usuários conectados via SSH
  socket.on("getUsers", async () => {
    const email = socket.request.session.userEmail;
    if (!email) return;
    try {
      const users = await db_userssh(email);
      socket.emit("users", users);
    } catch (error) {
      console.log(error);
    }
  });

  // Processar compra de VPN
  socket.on("comprar", async (req, quantity) => {
    if (!socket.request.session.userEmail) {
      return;
    }
    try {
      let paymentDB = await paymentController(
        socket.request.session.userEmail,
        req,
        "comprar",
        quantity
      );
      socket.emit("satatusPayment", paymentDB);
    } catch (error) {
      console.log("Erro no pagamento", error);
    }
  });

  // Renovar assinatura VPN
  socket.on("renovar", async (req, quantity, login) => {
    try {
      let paymentDB = await paymentController(
        socket.request.session.userEmail,
        req,
        "renovar",
        quantity,
        login
      );
      socket.emit("statusPaymentRenovar", paymentDB);
    } catch (error) {}
  });

  // Obter status do pagamento
  socket.on("getPayment", async () => {
    email = socket.request.session.userEmail;
    if (!email) return;
    try {
      const paymnet_db = await getPayment(email);
      socket.emit("satatusPayment", paymnet_db.mp);
    } catch (error) {}
  });

  // Redefinir senha
  socket.on("redefinePassword", async (data, callback) => {
    const { email } = data;
    if (!email) return;
    sockets[socket.id]++;
    if (sockets[socket.id] > 4) {
      callback("Você atingiu o numero máximo de envios", "error");
      return;
    }
    let user = await userInfo(email);
    if (user) {
      let random = await resetPasswordDB(email);
      emailPasswordReset(
        email,
        `https://ww0.fun/linkresetpassword?code=${random}&&email=${email}`
      );
      callback("Email enviado com sucesso, verifique sua caixa de spam");
    } else {
      callback("Email não cadastrado!", "error");
    }
  });

  // Atualizar senha
  socket.on("updatePassword", async (data) => {
    try {
      let userInfo = await resetPasswordInfo(data.email);
      let dias = diferencaEmDias(userInfo.dateTime);
      if (dias == 0) {
        const newPass = { email: data.email, password: data.password };
        await userUpdatePass(newPass);
        socket.emit("success");
      }
    } catch (error) {
      console.log("erro", error);
    }
  });

  function enviarEmPartes(socket, dados, tamanhoParte = 1024 * 10) {
    let parteAtual = 0;

    function enviarParte() {
      const parte = dados.slice(parteAtual, parteAtual + tamanhoParte);
      const progresso = ((parteAtual + tamanhoParte) / dados.length) * 100;

      if (parteAtual + tamanhoParte >= dados.length) {
        socket.emit("parte_iptv", { parte, progresso: 100 });
        socket.emit("fim_iptv");
      } else {
        socket.emit("parte_iptv", { parte, progresso });
        parteAtual += tamanhoParte;
        setImmediate(enviarParte);
      }
    }

    enviarParte();
  }

  socket.on("iptv", async (callback) => {
    try {
      const arquivo = await lerArquivo("./lista1.m3u8");
      const buffer = Buffer.from(JSON.stringify(arquivo), "utf8");

      zlib.gzip(buffer, (err, compressedData) => {
        if (err) {
          console.error("Erro na compressão dos dados:", err);
          callback({ error: "Erro ao comprimir o arquivo" });
          return;
        }
        console.log("Arquivo comprimido:", compressedData.length, "bytes");
        callback({ message: "Dados sendo enviados em partes." });
        enviarEmPartes(socket, compressedData);
      });
    } catch (error) {
      console.log(error);
      callback({ error: "Erro ao ler o arquivo" });
    }
  });
  

  socket.on("streaming", async (data, callback) => {
    console.log("recebido", data);
    try {
      const abrir = await iptvChannel(data);
      console.log("abrur", abrir);
      callback(abrir);
    } catch (error) {
      console.log(error);
    }

  });

  socket.on("login", async (data) => {  
    console.log("/loogiiii")
    let { email, password } = data;
  try {
    console.log("MINHA SENHA ", password);
    await authenticateUser(email, password);
   socket.request.session.userEmail = email;
    await new Promise((resolve, reject) => {
      socket.request.session.save((err) => {
      if (err) reject(err);
      else resolve();
      });
    });
    console.log("LOGIN autenticado");
   socket.emit("redirect", "/iptv");
  } catch (error) {
    console.log(error);
  
  }
});

const email = socket.request.session.userEmail;
console.log(`Novo cliente conectado: ${email}, ID: ${socket.id}`);

// Verifica se o email já tem conexões registradas, se não, inicializa um array
if (!emailSockets[email]) {
  emailSockets[email] = [];
}

// Adiciona o ID do socket à lista de conexões para aquele email
emailSockets[email].push(socket.id);

socket.on("transmitir", (data)=>{
  const email = socket.request.session.userEmail;
  let tela2 = emailSockets[email].find(id => id !== socket.id);
   tela2 = io.sockets.sockets.get(tela2);
  if(tela2){
    tela2.emit("reproduzir", data);
  }
})

socket.on("range", (data)=>{
  const email = socket.request.session.userEmail;
  let range = emailSockets[email].find(id => id !== socket.id);
  range = io.sockets.sockets.get(range);
  if(range){
    range.emit("range-response", data);
  }
});

socket.on("range-sync", (data)=>{
  const email = socket.request.session.userEmail;
  let range = emailSockets[email].find(id => id !== socket.id);
  range = io.sockets.sockets.get(range);
  if(range){
    range.emit("range-sync-response", data);
  }
})

socket.on("proximo-episodio", ()=>{
  const email = socket.request.session.userEmail;
  let user = emailSockets[email].find(id => id !== socket.id);
  user = io.sockets.sockets.get(user);
  if(user){
    user.emit("proximo-episodio-response");
  }
})

socket.on("episodio-anterior", (data)=>{
  const email = socket.request.session.userEmail;
  let user = emailSockets[email].find(id => id !== socket.id);
  user = io.sockets.sockets.get(user);
  if(user){
    user.emit("episodio-anterior-response");
  }
});

socket.on("play-pause", ()=>{
  const email = socket.request.session.userEmail;
  let user = emailSockets[email].find(id => id !== socket.id);
  user = io.sockets.sockets.get(user);
  if(user){
    user.emit("play-pause-response");
  }
})

socket.on("redefinir-senha",async (data, callback)=>{
    const email = socket.request.session.userEmail;
    if(email){
      const senha = await hashPassword(data);
      try {
        await atualizarSenha(email, senha);
        callback(true);
      } catch (error) {
        console.log(error);
      }
    }
})

socket.on("fullscreen",async ()=>{
  const email = socket.request.session.userEmail;
  let user = emailSockets[email].find(id => id !== socket.id);
  user = io.sockets.sockets.get(user);
  if(user){
    user.emit("fullscreen-response");
  }
});

socket.on("gerarPix",async (callback)=>{
    const email = socket.request.session.userEmail;
    if (!email) {
      console.error("Email não fornecido.");
      return;
    }
  
    try {
      const pagamentoAtual = await getPayment(email);
      if (pagamentoAtual) {
        const dias = diferencaEmDias(pagamentoAtual.timestamp);
        console.log("DIAS", dias)
        if (dias > -3) {
          console.log("Pagamento atual ainda válido:", pagamentoAtual);
          callback(pagamentoAtual.mp);
          return;
        }
        const novoPix = await gerarPix(email, 30, "tv");
        const pagamentoFiltrado = filtrarResposta(novoPix);
  
        console.log("Atualizando pagamento expirado:", pagamentoFiltrado);
        await updatePayment(email, pagamentoFiltrado);
        callback(pagamentoFiltrado);
        return
      }
  
    
      const novoPix = await gerarPix(email, 30, "pixTv");
      const pagamentoFiltrado = filtrarResposta(novoPix);
  
      console.log("Inserindo novo pagamento:", pagamentoFiltrado);
      await insertPayment(email, pagamentoFiltrado);
      callback(pagamentoFiltrado);
  
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
    }
});

socket.on("validade",async (callback)=>{
  const email = socket.request.session.userEmail;
  if (!email) {
    console.error("Email não fornecido.");
    return;
  }
 const data = await validade(email);
 callback(data);
})



socket.on('disconnect', () => {
  const email = socket.request.session.userEmail;
  console.log(`Cliente desconectado: ${email}, ID: ${socket.id}`);
  emailSockets[email] = emailSockets[email].filter(id => id !== socket.id);
});


  });

  app.post("/pixTv",async  (req, res) => {
    if (!req.query.id) return;
    const infoPayment = await statusPayment(req.query.id);
    console.log(infoPayment.description);

    if(infoPayment.status === "approved"){
      const pagamento = getPayment(infoPayment.description);
      if(!pagamento)return
        await  removerPagamentoAprovado(infoPayment.description);
       await atualizarTimestamp(infoPayment.description);
       res.status(200).send();
    }
  
  });
  function filtrarResposta(data) {
   
    const newPay = {
      id: data.id,
      url: data.point_of_interaction.transaction_data.ticket_url,
      status: data.status,
      amount: data.transaction_amount,
    };
    return newPay
  }

// Função para verificar status do pagamento
function statusPayment(id) {
  return new Promise(async (resolve, reject) => {
    const client = new MercadoPagoConfig({
      accessToken: process.env.BRICKS_ACCESS_TOKEN,
    });
    const payment = new Payment(client);
    try {
      let info = await payment.get({ id: id });
      console.log(info.status);
      resolve(info);
    } catch (error) {
      console.log("error webhook", error);
      reject();
    }
  });
}

function diferencaEmDias(dataISO) {
  const dataTimestamp = new Date(dataISO);
  console.log("dataTimestamp", dataTimestamp)
  const dataAtual = new Date();
  console.log("dataAtual", dataAtual)
  const diferencaMilissegundos = dataTimestamp.getTime() - dataAtual.getTime();
  const diferencaDias = Math.round(
    diferencaMilissegundos / (1000 * 60 * 60 * 24)
  );
  return diferencaDias;
}



async function hashPassword(password) {
  const saltRounds = 10;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("hash: ", hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error("Erro ao hashear a senha:", error);
    throw error;
  }
}

async function verifyPassword(password, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error("Erro ao verificar a senha:", error);
    throw error;
  }
}


async function validade(email){
  const usuarioData = await userInfo(email);
  const timestamp = usuarioData[0].timestamp;
  if(usuarioData[0].mode === "free"){
    return "periodo de teste"
  }
  // Verifica se o timestamp é válido
  const data = new Date(timestamp);

  if (isNaN(data)) {
    console.error("Data inválida:", timestamp);
    return;
  }

  // Adiciona 30 dias à data
  data.setDate(data.getDate() + 30);

  // Formata a data no formato brasileiro (dd/mm/yyyy)
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0'); // Meses começam do 0
  const ano = data.getFullYear();

  const dataCom30Dias = `${dia}/${mes}/${ano}`;

  return dataCom30Dias;
}
