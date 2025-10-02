import cron from 'node-cron';
import { BetEsporteScraper } from '../scrapers/BetEsporteScraper';
import { AlertSender } from '../alerts/AlertSender';
import { SuperOdd, MonitorConfig } from '../types';
import { logger } from '../utils/logger';

export class BetEsporteMonitor {
  private scraper: BetEsporteScraper;
  private alertSender: AlertSender;
  private config: MonitorConfig;
  private knownOdds: Map<string, SuperOdd> = new Map();
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.scraper = new BetEsporteScraper();
    this.alertSender = new AlertSender(config.webhookUrl, config.websocketUrl);
  }

  async initialize(): Promise<void> {
    try {
      await this.scraper.initialize();
      await this.alertSender.initialize();
      
      logger.info('BetEsporte Monitor inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar monitor:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monitor já está rodando');
      return;
    }

    this.isRunning = true;
    
    // Executar primeira verificação imediatamente
    await this.checkForNewOdds();

    // Configurar cron job para execuções periódicas
    const cronExpression = `*/${this.config.intervalMinutes} * * * *`;
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.checkForNewOdds();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    logger.info(`Monitor iniciado - verificando a cada ${this.config.intervalMinutes} minutos`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    await this.scraper.close();
    await this.alertSender.close();

    logger.info('Monitor parado');
  }

  private async checkForNewOdds(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Verificando novas super odds...');

    try {
      const result = await this.scraper.scrapeOdds();

      if (!result.success) {
        logger.error(`Erro no scraping: ${result.error}`);
        await this.alertSender.sendErrorAlert(result.error || 'Erro desconhecido no scraping');
        return;
      }

      const newOdds = this.findNewOdds(result.odds);
      
      if (newOdds.length > 0) {
        logger.info(`Encontradas ${newOdds.length} novas super odds`);
        
        // Enviar alertas para cada nova odd
        for (const odd of newOdds) {
          await this.alertSender.sendNewOddAlert(odd);
          this.knownOdds.set(odd.id, odd);
        }
      } else {
        logger.info('Nenhuma nova super odd encontrada');
      }

      // Limpar odds antigas (mais de 24 horas)
      this.cleanupOldOdds();

    } catch (error) {
      logger.error('Erro durante verificação de odds:', error);
      await this.alertSender.sendErrorAlert(
        error instanceof Error ? error.message : 'Erro desconhecido'
      );
    }
  }

  private findNewOdds(currentOdds: SuperOdd[]): SuperOdd[] {
    const newOdds: SuperOdd[] = [];

    for (const odd of currentOdds) {
      if (!this.knownOdds.has(odd.id)) {
        newOdds.push(odd);
      }
    }

    return newOdds;
  }

  private cleanupOldOdds(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 horas atrás

    let removedCount = 0;
    for (const [id, odd] of this.knownOdds.entries()) {
      if (odd.detectedAt < cutoffTime) {
        this.knownOdds.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Removidas ${removedCount} odds antigas da memória`);
    }
  }

  // Método para verificação manual
  async checkNow(): Promise<SuperOdd[]> {
    logger.info('Executando verificação manual...');
    
    const result = await this.scraper.scrapeOdds();
    
    if (result.success) {
      return result.odds;
    } else {
      throw new Error(result.error || 'Erro no scraping');
    }
  }

  // Getter para estatísticas
  getStats(): { knownOddsCount: number; isRunning: boolean; intervalMinutes: number } {
    return {
      knownOddsCount: this.knownOdds.size,
      isRunning: this.isRunning,
      intervalMinutes: this.config.intervalMinutes
    };
  }
}
