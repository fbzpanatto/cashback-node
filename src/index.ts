import { Client, LocalAuth } from 'whatsapp-web.js';
import express, { Application, Request } from 'express';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';

const app: Application = express();
const port = 3000;

// Criando servidor HTTP para suportar WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexões de qualquer origem (pode ser ajustado)
  }
});

app.use(cors());
app.use(express.json());

// Definindo o diretório de armazenamento de sessão de autenticação
const authDirectory = path.join(__dirname, 'sessions');

// Inicializando o cliente com LocalAuth
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'YOUR_CLIENT_ID', // Identificador único para o cliente
    dataPath: authDirectory,    // Diretório para salvar os dados de sessão
  }),
  puppeteer: {
    headless: true, // Agora pode rodar sem interface gráfica
  },
});

// Evento de QR Code (apenas para quando o cliente for novo ou a sessão expirar)
client.on('qr', (qr) => {
  console.log('QR Code recebido, enviando para o front...', qr);
  io.emit('qr', qr); // Envia o QR Code para o front-end via WebSocket
});

// Evento de cliente pronto (quando o WhatsApp estiver conectado)
client.on('ready', () => {
  console.log('✅ WhatsApp está pronto para uso!');
  io.emit('ready', 'WhatsApp conectado com sucesso!'); // Notifica o front-end
});

// Inicia o cliente de WhatsApp
client.initialize().then(() => {
  console.log('🚀 Cliente WhatsApp iniciado com sucesso!');
}).catch((error) => {
  console.error('❌ Erro ao iniciar o cliente:', error);
});

// Endpoint para enviar mensagens
app.post('/send-message', async (req: Request, res: any) => {
  let { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
  }

  try {
    // Remove caracteres não numéricos do número
    phone = phone.replace(/\D/g, '');

    // Verifica se o número tem o formato correto (10 ou 11 dígitos para Brasil)
    if (phone.length < 10 || phone.length > 11) {
      return res.status(400).json({ error: 'Número inválido. Deve conter DDD e telefone corretamente.' });
    }

    // Adiciona código do Brasil se necessário
    if (!phone.startsWith('55')) {
      phone = `55${phone}`;
    }

    // Adiciona sufixo "@c.us" exigido pelo WhatsApp Web.js
    const chatId = `${phone}@c.us`;

    // Envia a mensagem
    await client.sendMessage(chatId, message);
    res.status(201).json({ success: true, message: 'Mensagem enviada com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicia o servidor HTTP e WebSocket
server.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
