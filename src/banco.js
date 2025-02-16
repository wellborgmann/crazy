// Importando o dotenv para carregar variáveis de ambiente
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

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
      return await query(" SELECT * FROM CountryLanguage");
    } catch (error) {
      console.error("Erro ao testar a consulta:", error);
      throw error;
    }
  }
  
  async function userInfo(email) {
    const sql = " SELECT * FROM oauth WHERE email = ?";
    try {
      return await query(sql, [email]);
    } catch (error) {
      console.error("Erro ao consultar o banco de dados:", error);
      throw error;
    }
  }
  
  async function registerAccount(user) {
    // Inicializa a consulta SQL
    let sql = "INSERT INTO oauth (email, senha, code, validar, mode";
    const values = [
      user.email || null,
      user.password || null,
      0,
      "oauthenticated",
      "free",
    ];
  
    // Adiciona a coluna 'google' se existir a propriedade 'picture' no usuário
    if (user.picture) {
      sql += ", google"; // Adiciona a coluna à lista de colunas
      values.push(JSON.stringify(user)); // Adiciona o valor à lista de valores
    }
  
    // Fecha a lista de colunas e inicia a parte VALUES
    sql += ") VALUES (?, ?, ?, ?, ?";
    if (user.picture) {
      sql += ", ?"; // Adiciona espaço para o valor da coluna 'google'
    }
    sql += ")"; // Fecha o SQL
  
    try {
      // Executa a consulta no banco de dados
      const results = await query(sql, values);
      if (results.affectedRows > 0) {
        return; // Registro bem-sucedido
      } else {
        throw new Error("Erro ao registrar usuário");
      }
    } catch (error) {
      console.error("Erro ao registrar conta:", error);
      throw error; // Lança o erro para o chamador
    }
  }
  
  async function getPayment(email) {
    const sql = " SELECT * FROM payment WHERE email = ?";
    try {
      const rows = await query(sql, [email]);
      return rows.length > 0 ? rows[0] : false;
    } catch (error) {
      console.error("Erro ao obter pagamento:", error);
      throw error;
    }
  }
  
  async function db_userssh(email) {
    const sql = " SELECT * FROM users WHERE email = ?";
    try {
      return await query(sql, [email]);
    } catch (error) {
      console.error("Erro ao consultar usuários:", error);
      throw error;
    }
  }
  
  async function resetPasswordInfo(email) {
    const sql = " SELECT * FROM resetPassword WHERE email = ?";
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
      ? " UPDATE resetPassword SET email = ?, code = ? WHERE email = ?"
      : "INSERT INTO resetPassword (email, code) VALUES (?,?)";
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
  
  async function removeLinkReset(email) {
    const sql = " DELETE FROM resetPassword WHERE email = ?";
    try {
      await query(sql, [email]);
      return true;
    } catch (error) {
      console.error("Erro ao remover link de reset:", error);
      throw error;
    }
  }
  
  async function userUpdatePass(data) {
    const sql = " UPDATE oauth SET password = ? WHERE email = ?";
  
    try {
      await query(sql, [data.password, data.email]);
      await removeLinkReset(data.email);
    } catch (error) {
      console.error("Erro ao atualizar a senha do usuário:", error);
      throw error;
    }
  }
  
  async function getPaymentID(id) {
    const sql = " SELECT * FROM payment WHERE JSON_EXTRACT(mp, '$.id') = ?";
    try {
      const rows = await query(sql, [id]);
      return rows[0];
    } catch (error) {
      console.error("Erro ao obter pagamento pelo ID:", error);
      throw error;
    }
  }
  
  async function updatePayment(email, payment) {
    const sql = " UPDATE payment SET mp = ? WHERE email = ?";
    try {
      await query(sql, [payment, email]);
      console.log("Pagamento atualizado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      throw error;
    }
  }
  
  async function verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error("Erro ao verificar a senha:", error);
      throw error;
    }
  }
  
  async function authenticateUser(email, password) {
    const sql = " SELECT * FROM oauth WHERE email = ?";
    try {
      const rows = await query(sql, [email]);
      if (rows.length > 0) {
        const pass1 = rows[0].senha;
        const checkPass = await verifyPassword(password, pass1);
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
    const sql = " INSERT INTO payment (email, mp) VALUES (?, ?)";
    try {
      await query(sql, [email, payment]);
      return true;
    } catch (error) {
      console.error("Erro ao inserir pagamento:", error);
      throw error;
    }
  }
  
  async function NewUserDB(email, user) {
    const sql = " INSERT INTO users (email, user) VALUES (?, ?)";
    try {
      await query(sql, [email, user]);
      return true;
    } catch (error) {
      console.error("Erro ao adicionar novo usuário:", error);
      throw error;
    }
  }
  
  async function userSSH(user) {
    const sql = " SELECT * FROM users WHERE JSON_EXTRACT(user, '$.user') = ?";
    try {
      const rows = await query(sql, [user]);
      return rows[0];
    } catch (error) {
      console.error("Erro ao consultar usuário SSH:", error);
      throw error;
    }
  }
  
  async function renovarDB(email, days) {
    const sql = `
    UPDATE users 
    SET timestamp = CURRENT_TIMESTAMP, 
        user = JSON_SET(user, '$.days', ?) 
    WHERE JSON_EXTRACT(user, '$.user') = ?
    `;
  
    try {
      await query(sql, [days, email]);
      return true;
    } catch (error) {
      console.error("Erro ao renovar DB:", error);
      throw error;
    }
  }
  
  async function atualizarSenha(email, senha) {
    const sql = "UPDATE oauth SET senha = ? WHERE email = ?";
  
    try {
      // Executa a consulta
      const results = await query(sql, [senha, email]);
  
      if (results.affectedRows > 0) {
        console.log("Senha atualizada com sucesso!", results);
        return true; // Retorna sucesso
      } else {
        console.error("Nenhuma linha foi afetada. Verifique o email fornecido.");
        return false; // Retorna falso se nenhuma linha foi atualizada
      }
    } catch (error) {
      console.error("Erro ao atualizar a senha:", error);
      throw error; // Propaga o erro para quem chamou a função
    }
  }
  
  
  async function atualizarTimestamp(email) {
    const sql = "UPDATE oauth SET timestamp = NOW() WHERE email = ?";
  
    try {
      // Executa a consulta
      const results = await query(sql, [email]);
      
      if (results.affectedRows > 0) {
        console.log("Timestamp atualizada com sucesso!", results);
        atualizarModePago(email);
        return true; // Retorna true para indicar sucesso
      } else {
        console.log("Erro ao atualizar o timestamp, nenhum registro foi afetado para o email:", email);
        return false; // Indica que não houve atualização
      }
    } catch (error) {
      console.error("Erro ao atualizar o timestamp:", error);
      return false; // Retorna false em caso de erro
    }
  }
  
  async function removerPagamentoAprovado(email) {
    const sql = " DELETE FROM payment WHERE email = ?";
    try {
      await query(sql, [email]);
      return true;
    } catch (error) {
      console.error("Erro ao remover link de reset:", error);
      throw error;
    }
  }
  
  async function atualizarModePago(email) {
    const sql = "UPDATE oauth SET mode = ? WHERE email = ?";
  
    try {
      // Executa a consulta
      const results = await query(sql, ["pago", email]);
      
      if (results.affectedRows > 0) {
        console.log("Modo atualizado com sucesso!", results);
        return true;
      } else {
        console.log("Erro ao atualizar o modo, nenhum registro foi afetado para o email:", email);
        return false; 
      }
    } catch (error) {
      console.error("Erro ao atualizar o modo:", error);
      return false; 
    }
  }
  

export {
    userInfo,
    registerAccount,
    getPayment,
    db_userssh,
    resetPasswordInfo,
    resetPasswordDB,
    userUpdatePass,
    getPaymentID,
    updatePayment,
    authenticateUser,
    insertPayment,
    NewUserDB,
    userSSH,
    renovarDB,
    testing,
    atualizarTimestamp,
    atualizarSenha,
    removerPagamentoAprovado
};
