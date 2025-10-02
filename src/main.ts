import dotenv from 'dotenv';
import { MultiSiteMonitor } from './monitors/MultiSiteMonitor';
import { MonitorConfig } from './types';
import { logger } from './utils/logger';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do monitor
const config: MonitorConfig = {
  intervalMinutes: parseInt(process.env.SCRAPING_INTERVAL_MINUTES || '5'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  timeoutMs: parseInt(process.env.TIMEOUT_MS || '30000'),
  webhookUrl: process.env.WEBHOOK_URL || '',
  websocketUrl: process.env.WEBSOCKET_URL || ''
};

// Instância do monitor (agora multi-site)
let monitor: MultiSiteMonitor;

async function startMonitor(): Promise<void> {
  try {
    logger.info('Iniciando Multi-Site Odds Monitor...');
    logger.info('Configuração:', config);

    monitor = new MultiSiteMonitor(config);
    await monitor.initialize();
    await monitor.start();

    logger.info('Monitor iniciado com sucesso!');
    
    // Log de estatísticas a cada 30 minutos
    setInterval(() => {
      const stats = monitor.getStats();
      logger.info('Estatísticas do monitor:', stats);
    }, 30 * 60 * 1000);

  } catch (error) {
    logger.error('Erro ao iniciar monitor:', error);
    process.exit(1);
  }
}

async function stopMonitor(): Promise<void> {
  if (monitor) {
    logger.info('Parando monitor...');
    await monitor.stop();
    logger.info('Monitor parado com sucesso');
  }
  process.exit(0);
}

// Handlers para encerramento gracioso
process.on('SIGINT', stopMonitor);
process.on('SIGTERM', stopMonitor);
process.on('uncaughtException', (error) => {
  logger.error('Erro não capturado:', error);
  stopMonitor();
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada:', { reason, promise });
  stopMonitor();
});

// Iniciar o monitor
startMonitor();

// Exportar para uso em testes ou outras aplicações
export { monitor, config };
