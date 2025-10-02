# BetEsporte Odds Monitor

Bot automatizado para monitorar super odds no site BetEsporte e enviar alertas em tempo real.

## 🚀 Funcionalidades

- **Monitoramento Automático**: Verifica novas super odds a cada 5 minutos (configurável)
- **Alertas em Tempo Real**: Envia notificações via webhook e WebSocket
- **Detecção Inteligente**: Identifica apenas odds realmente novas
- **Logs Detalhados**: Sistema completo de logging para debugging
- **Deploy Fácil**: Configurado para Railway com Docker

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Railway (para deploy)

## 🛠️ Instalação Local

1. **Clone/baixe o projeto**
```bash
cd BETESPORTE
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
WEBHOOK_URL=https://seusite.com/api/betesporte-alert
WEBSOCKET_URL=wss://seusite.com/ws
SCRAPING_INTERVAL_MINUTES=5
```

4. **Execute em desenvolvimento**
```bash
npm run dev
```

5. **Build para produção**
```bash
npm run build
npm start
```

## 🚀 Deploy no Railway

1. **Crie uma conta no Railway**: https://railway.app

2. **Conecte seu repositório**:
   - Faça upload dos arquivos para um repositório Git
   - No Railway, clique em "New Project" > "Deploy from GitHub repo"

3. **Configure as variáveis de ambiente**:
   - Vá em Settings > Variables
   - Adicione as variáveis do arquivo `env.example`

4. **Deploy automático**:
   - O Railway detectará o `Dockerfile` e fará o build automaticamente
   - O bot começará a rodar assim que o deploy terminar

## 📊 Monitoramento

O bot gera logs detalhados que podem ser visualizados no Railway:
- Logs de scraping
- Detecção de novas odds
- Envio de alertas
- Erros e debugging

## 🔧 Configuração Avançada

### Seletores CSS
Edite `config/sites.ts` para ajustar os seletores CSS caso o site mude:

```typescript
selectors: {
  gameContainer: '.event-item, .match-item',
  gameTitle: '.event-title, .match-title',
  // ... outros seletores
}
```

### Intervalo de Verificação
Altere `SCRAPING_INTERVAL_MINUTES` no `.env` para controlar a frequência.

### Webhook/WebSocket
Configure os endpoints no seu site para receber os alertas:

```typescript
// Exemplo de payload recebido
{
  type: 'new_super_odd',
  data: {
    id: 'abc123',
    game: 'Flamengo x Palmeiras',
    homeTeam: 'Flamengo',
    awayTeam: 'Palmeiras',
    oddValue: 3.5,
    freebet: 50,
    // ... outros campos
  },
  timestamp: '2025-10-02T15:30:00Z',
  source: 'betesporte'
}
```

## 🐛 Troubleshooting

### Bot não encontra odds
- Verifique se o site não mudou a estrutura
- Ajuste os seletores CSS em `config/sites.ts`
- Verifique os logs para erros específicos

### Alertas não chegam
- Confirme se `WEBHOOK_URL` e `WEBSOCKET_URL` estão corretos
- Teste os endpoints manualmente
- Verifique logs de rede

### Erro de memória no Railway
- O plano gratuito tem 0.5GB RAM
- Considere otimizar o intervalo de verificação
- Monitore o uso de memória nos logs

## 📝 Logs

Os logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs
- Console (desenvolvimento)

## 🔒 Segurança

- Use HTTPS para webhooks
- Valide payloads recebidos no seu site
- Configure rate limiting se necessário
- Monitore logs para atividade suspeita

## 📈 Escalabilidade

Para maior volume:
- Considere usar Redis para cache
- Implemente queue system (Bull/Agenda)
- Use banco de dados para histórico
- Configure múltiplas instâncias

## 🆘 Suporte

Para problemas:
1. Verifique os logs no Railway
2. Teste localmente primeiro
3. Confirme se as variáveis de ambiente estão corretas
4. Verifique se o site BetEsporte não mudou

## 📄 Licença

MIT License - veja LICENSE para detalhes.
