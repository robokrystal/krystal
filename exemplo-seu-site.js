// EXEMPLO: Como receber os alertas no seu site
// Este arquivo é apenas um exemplo - adapte para sua tecnologia

// ===== WEBHOOK ENDPOINT =====
// Express.js example
const express = require('express');
const app = express();

app.use(express.json());

// Endpoint para receber alertas via webhook
app.post('/api/betesporte-alert', (req, res) => {
  const alert = req.body;
  
  console.log('Novo alerta recebido:', alert);
  
  // Processar o alerta baseado no tipo
  switch (alert.type) {
    case 'new_super_odd':
      console.log(`🎯 NOVA SUPER ODD: ${alert.data.game}`);
      console.log(`💰 Odd: ${alert.data.oddValue}`);
      console.log(`🎁 FreeBet: R$ ${alert.data.freebet}`);
      
      // Aqui você pode:
      // - Salvar no banco de dados
      // - Enviar notificação push
      // - Enviar email/SMS
      // - Atualizar interface em tempo real
      break;
      
    case 'odds_update':
      console.log(`📊 Atualização: ${alert.data.length} odds`);
      break;
      
    case 'error':
      console.log(`❌ Erro no bot: ${alert.data.error}`);
      break;
  }
  
  res.status(200).json({ success: true });
});

// ===== WEBSOCKET SERVER =====
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');
  
  ws.on('message', (message) => {
    const alert = JSON.parse(message);
    console.log('Alerta via WebSocket:', alert);
    
    // Reenviar para todos os clientes conectados
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(alert));
      }
    });
  });
});

// ===== FRONTEND JAVASCRIPT =====
// Como conectar no frontend para receber alertas em tempo real
/*
const ws = new WebSocket('wss://seusite.com/ws');

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  
  if (alert.type === 'new_super_odd') {
    // Mostrar notificação na tela
    showNotification(`Nova Super Odd: ${alert.data.game}`, {
      body: `Odd ${alert.data.oddValue} - FreeBet R$ ${alert.data.freebet}`,
      icon: '/icon-bet.png'
    });
    
    // Adicionar à lista de odds na página
    addOddToList(alert.data);
  }
};

function showNotification(title, options) {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

function addOddToList(odd) {
  const oddElement = document.createElement('div');
  oddElement.innerHTML = `
    <div class="odd-card">
      <h3>${odd.game}</h3>
      <p>Odd: ${odd.oddValue}</p>
      <p>FreeBet: R$ ${odd.freebet}</p>
      <a href="${odd.url}" target="_blank">Ver no BetEsporte</a>
    </div>
  `;
  document.getElementById('odds-list').appendChild(oddElement);
}
*/

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
  console.log('Webhook: http://localhost:3000/api/betesporte-alert');
  console.log('WebSocket: ws://localhost:8080');
});
