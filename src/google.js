import dotenv from 'dotenv';
dotenv.config();
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

function converterTempoMilissegundosParaHMS(tempoMilissegundos) {
  // Converter milissegundos para segundos
  let tempoSegundos = Math.floor(tempoMilissegundos / 1000);

  // Calcular horas, minutos e segundos
  const horas = Math.floor(tempoSegundos / 3600);
  tempoSegundos %= 3600;
  const minutos = Math.floor(tempoSegundos / 60);
  const segundos = tempoSegundos % 60;

  // Formatar a saída
  const horasFormatadas = horas < 10 ? `0${horas}` : `${horas}`;
  const minutosFormatados = minutos < 10 ? `0${minutos}` : `${minutos}`;
  const segundosFormatados = segundos < 10 ? `0${segundos}` : `${segundos}`;

  // Retornar tempo formatado
  if (horas > 0) {
    return `${horasFormatadas}:${minutosFormatados}:${segundosFormatados}`;
  } else {
    return `${minutosFormatados}:${segundosFormatados}`;
  }
}

function converterTempoSegundosParaHMS(tempoSegundos) {
  // Calcular horas, minutos e segundos
  const horas = Math.floor(tempoSegundos / 3600);
  const minutos = Math.floor((tempoSegundos % 3600) / 60);
  const segundos = tempoSegundos % 60;

  // Formatar a saída
  const horasFormatadas = horas < 10 ? `0${horas}` : `${horas}`;
  const minutosFormatados = minutos < 10 ? `0${minutos}` : `${minutos}`;
  const segundosFormatados = segundos < 10 ? `0${segundos}` : `${segundos}`;

  // Retornar tempo formatado
  if (horas > 0) {
    return `${horasFormatadas}:${minutosFormatados}:${segundosFormatados}`;
  } else {
    return `${minutosFormatados}:${segundosFormatados}`;
  }
}

function diferencaEmDias(data) {
  const dataAtual = new Date();
  const dataInicioDoDia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dataAtualInicioDoDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate());

  const umDiaEmMilissegundos = 1000 * 60 * 60 * 24;
  const diferencaEmMilissegundos = dataInicioDoDia - dataAtualInicioDoDia;
  const diferencaEmDias = Math.floor(diferencaEmMilissegundos / umDiaEmMilissegundos);

  return diferencaEmDias;
}

///google

async function verifyGoogleToken(token) {
  const client = new OAuth2Client();
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (payload.aud !== CLIENT_ID) {
      throw new Error("ID do cliente inválido.");
    }

    const currentTime = Math.floor(new Date().getTime() / 1000);
    if (payload.exp < currentTime || (payload.nbf && payload.nbf > currentTime)) {
      throw new Error("Token expirado ou inválido.");
    }

    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
      throw new Error("Emissor inválido.");
    }

    if (!payload.sub) {
      throw new Error("Identificador de usuário ausente.");
    }

    if (payload.email_verified !== true) {
      throw new Error("E-mail não verificado.");
    }

    return payload;
  }

  return verify().catch((error) => {
    console.error("Erro ao verificar o token do Google:", error);
    throw error;
  });
}

export { converterTempoMilissegundosParaHMS, converterTempoSegundosParaHMS, diferencaEmDias, verifyGoogleToken };
