import { Payment, MercadoPagoConfig } from "mercadopago";
import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

const chave = process.env.BRICKS_ACCESS_TOKEN;

const client = new MercadoPagoConfig({
  accessToken: chave,
  options: { timeout: 5000 },
});


  async function statusPagamento(id) {
    const client = new MercadoPagoConfig({
      accessToken: chave,
      options: { timeout: 5000 },
    });
    const payment = new Payment(client);
    return payment
      .get({ id: id })
      .then((result) => {
        console.log(result.status);
        return result;
      })
      .catch((error) => {   
        console.log(error);
        console.log("Erro ao buscar status do pagamento: " + id);
        throw new error
     
      });
  }




  const cancelarPagamento = async (id)=>{
    try {
      try {
        const payment = new Payment(client);
        const result = await payment.cancel({ id: id });
        console.log("Pagamento cancelado com sucesso:", id);
        return true;
      } catch (error) {
        console.error("Erro ao cancelar pagamento:", error);
         return false;
      }
    } catch (error) {
      return false;
    }
  }

 const meuIp = "157.254.54.238";
 const tranetIp = "185.194.204.85";

  async function criarPix(telefone, valor, tipo, login) {    
    console.log("tipo", tipo);
    const payment = new Payment(client);
 
    const body = {
      transaction_amount: valor,
      description: telefone,
      payment_method_id: "pix",
      notification_url: `http://${meuIp}:8000/${tipo}`,
      payer: {
        email: "wellborgmann2@gmail.com",
      },
      additional_info: {
        items: [
            {
                description: login,
                quantity: Math.floor(valor / 20),
        },
        ],
      }
    };
  
    const requestOptions = {
      // idempotencyKey: "1",
    };
  
    try {
      const response = await payment.create({ body, requestOptions });
      return response;
    } catch (error) {
      return { error: error };
    }
  }



  function filtrarPagamento(data, login) {
    const valor = data.point_of_interaction.transaction_amount;
    const quantity = valor == 20 ? 1 : valor == 40 ? 2 : 3;
    console.log(data.transaction_amount);
    const newPay = {
      id: data.id,
      url: data.point_of_interaction.transaction_data.ticket_url,
      type: "pix",
      method: login ? "renovar" : "comprar", // Define o método com base no login
      status: data.status,
      quantity: 1,
      amount: data.transaction_amount,
      login: login || null, // Garante que o login seja nulo se não for fornecido
    };
  
    if (login) {
      console.log("tem login");
    } else {
      console.log("não tem login");
    }
  
    return newPay;
  }

export  {
    criarPix,
    statusPagamento,
    cancelarPagamento
};

  
