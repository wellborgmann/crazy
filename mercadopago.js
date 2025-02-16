// Importando o módulo MercadoPago
import { Payment, MercadoPagoConfig } from "mercadopago";
import dotenv from 'dotenv';
dotenv.config();
// Configuração do MercadoPago
const chave = process.env.BRICKS_ACCESS_TOKEN;
const client = new MercadoPagoConfig({
  accessToken: chave,
  options: { timeout: 5000 },
});

// Função para gerar pagamento via Pix
export async function gerarPix(email, valor, tipo) {
  const payment = new Payment(client);
  const body = {
    transaction_amount: valor,
    description: email,
    payment_method_id: "pix",
    notification_url: `https://internet20.com.br/${tipo}`,
    payer: {
      email: email,
    },
  };

  const requestOptions = {
    // idempotencyKey: "1",
  };
  console.log(body.notification_url);

  try {
    const response = await payment.create({ body, requestOptions });
    return response;
  } catch (error) {
    return { error: true };
  }
}

// Função para filtrar a resposta
export function filtrarResposta(data, login) {
  const valor = data.point_of_interaction.transaction_amount;
  const newPay = {
    id: data.id,
    url: data.point_of_interaction.transaction_data.ticket_url,
    type: "pix",
    status: data.status,
    amount: data.transaction_amount,
    login: login || null, // Garante que o login seja nulo se não for fornecido
  };
}

// Função para obter o status do pagamento
export function statusPayment(id) {
  return new Promise(async (resolve, reject) => {
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

// Função para cancelar o pagamento
export function cancelarPagamento(id) {
  const payment = new Payment(client);
  return payment
    .cancel({ id: id })
    .then((result) => {
      console.log("Pagamento cancelado com sucesso: " + id);
      return result; // Retorna o resultado para a cadeia de promessas
    })
    .catch((error) => {
      console.log("Erro ao cancelar pagamento id: " + id);
    });
}
