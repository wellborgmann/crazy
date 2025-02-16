// Importando o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3000;

console.log('Host:', process.env.IP_SSH);
console.log('User:', process.env.MYSQL_USER);

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

// Função para realizar consultas no banco de dados
async function query(sql, params = []) {
  if (!connection) {
    console.error('Conexão não foi estabelecida');
    return [];
  }
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('Erro ao consultar o banco:', err.message);
    throw err;
  }
}

// Funções implementadas

async function testing() {
  try {
    return await query("SELECT * FROM CountryLanguage");
  } catch (error) {
    console.error("Erro ao testar a consulta:", error);
    throw error;
  }
}

async function userInfo(email) {
  const sql = "SELECT * FROM oauth WHERE email = ?";
  try {
    return await query(sql, [email]);
  } catch (error) {
    console.error("Erro ao consultar o banco de dados:", error);
    throw error;
  }
}

async function registerAccount(user) {
  let sql = "INSERT INTO oauth (email, senha, code, validar, mode";
  const values = [
    user.email || null,
    user.password || null,
    0,
    "oauthenticated",
    "free",
  ];

  if (user.picture) {
    sql += ", google";
    values.push(JSON.stringify(user));
  }

  sql += ") VALUES (?, ?, ?, ?, ?";
  if (user.picture) {
    sql += ", ?";
  }
  sql += ")";

  try {
    const results = await query(sql, values);
    if (results.affectedRows > 0) {
      return;
    } else {
      throw new Error("Erro ao registrar usuário");
    }
  } catch (error) {
    console.error("Erro ao registrar conta:", error);
    throw error;
  }
}

async function getPayment(email) {
  const sql = "SELECT * FROM payment WHERE email = ?";
  try {
    const rows = await query(sql, [email]);
    return rows.length > 0 ? rows[0] : false;
  } catch (error) {
    console.error("Erro ao obter pagamento:", error);
    throw error;
  }
}

async function resetPasswordInfo(email) {
  const sql = "SELECT * FROM resetPassword WHERE email = ?";
  try {
    const rows = await query(sql, [email]);
    return rows[0];
  } catch (error) {
    console.error("Erro ao obter informações de reset de senha:", error);
    throw error;
  }
}

async function resetPasswordDB(email) {
  const random = Math.floor(Math.random() * 899999) + 100000;
  const user = await resetPasswordInfo(email);
  const sql = user
    ? "UPDATE resetPassword SET email = ?, code = ? WHERE email = ?"
    : "INSERT INTO resetPassword (email, code) VALUES (?, ?)";
  const values = user ? [email, random, email] : [email, random];

  try {
    const results = await query(sql, values);
    if (results.affectedRows > 0) {
      return random;
    }
  } catch (error) {
    console.error("Erro ao resetar a senha:", error);
    throw error;
  }
}

async function updatePayment(email, payment) {
  const sql = "UPDATE payment SET mp = ? WHERE email = ?";
  try {
    await query(sql, [payment, email]);
    console.log("Pagamento atualizado com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar pagamento:", error);
    throw error;
  }
}

async function authenticateUser(email, password) {
  const sql = "SELECT * FROM oauth WHERE email = ?";
  try {
    const rows = await query(sql, [email]);
    if (rows.length > 0) {
      const pass1 = rows[0].senha;
      const checkPass = await bcrypt.compare(password, pass1);
      if (checkPass) {
        return true;
      } else {
        throw new Error("Senha incorreta");
      }
    } else {
      throw new Error("Email não cadastrado");
    }
  } catch (error) {
    console.error("Erro ao autenticar o usuário:", error);
    throw error;
  }
}

async function insertPayment(email, payment) {
  const sql = "INSERT INTO payment (email, mp) VALUES (?, ?)";
  try {
    await query(sql, [email, payment]);
    return true;
  } catch (error) {
    console.error("Erro ao inserir pagamento:", error);
    throw error;
  }
}

export {
  testing,
  userInfo,
  registerAccount,
  getPayment,
  resetPasswordInfo,
  resetPasswordDB,
  updatePayment,
  authenticateUser,
  insertPayment,
};
