import cron from 'node-cron';
import { BetEsporteScraper } from '../scrapers/BetEsporteScraper';
import { Br4betScraper } from '../scrapers/Br4betScraper';
// import { LotogreenScraper } from '../scrapers/LotogreenScraper'; // Adicione quando criar
import { AlertSender } from '../alerts/AlertSender';
import { SuperOdd, MonitorConfig } from '../types';
import { logger } from '../utils/logger';

interface SiteScrapers {
  [key: string]: {
    scraper: any;
    name: string;
    enabled: boolean;
  };
}

export class MultiSiteMonitor {
  private scrapers: SiteScrapers;
  private alertSender: AlertSender;
  private config: MonitorConfig;
  private knownOdds: Map<string, SuperOdd> = new Map();
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.alertSender = new AlertSender(config.webhookUrl, config.websocketUrl);
    
    // Configurar scrapers disponíveis
    this.scrapers = {
      betesporte: {
        scraper: new BetEsporteScraper(),
        name: 'BetEsporte',
        enabled: true
      },
      br4bet: {
        scraper: new Br4betScraper(),
        name: 'Br4bet',
        enabled: true // Mude para false se não quiser usar
      }
      // lotogreen: {
      //   scraper: new LotogreenScraper(),
      //   name: 'Lotogreen',
      //   enabled: true
      // }
    };
  }

  async initialize(): Promise<void> {
    try {
      // Inicializar todos os scrapers habilitados
      for (const [key, config] of Object.entries(this.scrapers)) {
        if (config.enabled) {
          await config.scraper.initialize();
          logger.info(`${config.name} scraper inicializado`);
        }
      }

      await this.alertSender.initialize();
      logger.info('MultiSite Monitor inicializado com sucesso');
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
    
    // Primeira verificação
    await this.checkAllSites();

    // Configurar cron job
    const cronExpression = `*/${this.config.intervalMinutes} * * * *`;
    
    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.checkAllSites();
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    const enabledSites = Object.values(this.scrapers)
      .filter(s => s.enabled)
      .map(s => s.name)
      .join(', ');

    logger.info(`Monitor iniciado - verificando ${enabledSites} a cada ${this.config.intervalMinutes} minutos`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    // Fechar todos os scrapers
    for (const config of Object.values(this.scrapers)) {
      if (config.enabled) {
        await config.scraper.close();
      }
    }

    await this.alertSender.close();
    logger.info('Monitor parado');
  }

  private async checkAllSites(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('🔍 Verificando todas as plataformas...');

    const allNewOdds: SuperOdd[] = [];

    // Verificar cada site habilitado
    for (const [key, config] of Object.entries(this.scrapers)) {
      if (!config.enabled) continue;

      try {
        logger.info(`Verificando ${config.name}...`);
        
        const result = await config.scraper.scrapeOdds();

        if (result.success) {
          const newOdds = this.findNewOdds(result.odds, key);
          
          if (newOdds.length > 0) {
            logger.info(`${config.name}: ${newOdds.length} novas odds encontradas`);
            allNewOdds.push(...newOdds);
            
            // Adicionar às odds conhecidas
            newOdds.forEach(odd => {
              this.knownOdds.set(`${key}_${odd.id}`, odd);
            });
          } else {
            logger.info(`${config.name}: nenhuma nova odd`);
          }
        } else {
          logger.error(`${config.name}: erro no scraping - ${result.error}`);
          await this.alertSender.sendErrorAlert(`${config.name}: ${result.error}`);
        }

      } catch (error) {
        logger.error(`Erro ao verificar ${config.name}:`, error);
        await this.alertSender.sendErrorAlert(
          `Erro em ${config.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );
      }

      // Pequena pausa entre sites para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Enviar alertas para todas as novas odds encontradas
    if (allNewOdds.length > 0) {
      logger.info(`🎯 TOTAL: ${allNewOdds.length} novas super odds encontradas!`);
      
      // Enviar alerta consolidado
      await this.alertSender.sendMultipleOddsAlert(allNewOdds);
      
      // Também enviar alertas individuais para odds muito boas
      for (const odd of allNewOdds) {
        if (odd.oddValue >= 3.0 || odd.freebet >= 50) {
          await this.alertSender.sendNewOddAlert(odd);
        }
      }
    }

    // Limpeza de odds antigas
    this.cleanupOldOdds();
  }

  private findNewOdds(currentOdds: SuperOdd[], siteKey: string): SuperOdd[] {
    const newOdds: SuperOdd[] = [];

    for (const odd of currentOdds) {
      const fullId = `${siteKey}_${odd.id}`;
      if (!this.knownOdds.has(fullId)) {
        newOdds.push({
          ...odd,
          // Adicionar fonte da odd
          promotionType: `${odd.promotionType} (${siteKey.toUpperCase()})`
        });
      }
    }

    return newOdds;
  }

  private cleanupOldOdds(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let removedCount = 0;
    for (const [id, odd] of this.knownOdds.entries()) {
      if (odd.detectedAt < cutoffTime) {
        this.knownOdds.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(`Limpeza: ${removedCount} odds antigas removidas`);
    }
  }

  // Habilitar/desabilitar sites específicos
  enableSite(siteKey: string): void {
    if (this.scrapers[siteKey]) {
      this.scrapers[siteKey].enabled = true;
      logger.info(`${this.scrapers[siteKey].name} habilitado`);
    }
  }

  disableSite(siteKey: string): void {
    if (this.scrapers[siteKey]) {
      this.scrapers[siteKey].enabled = false;
      logger.info(`${this.scrapers[siteKey].name} desabilitado`);
    }
  }

  // Verificação manual de um site específico
  async checkSite(siteKey: string): Promise<SuperOdd[]> {
    const config = this.scrapers[siteKey];
    if (!config) {
      throw new Error(`Site ${siteKey} não encontrado`);
    }

    logger.info(`Verificação manual: ${config.name}`);
    const result = await config.scraper.scrapeOdds();
    
    if (result.success) {
      return result.odds;
    } else {
      throw new Error(result.error || 'Erro no scraping');
    }
  }

  getStats(): { 
    knownOddsCount: number; 
    isRunning: boolean; 
    intervalMinutes: number;
    enabledSites: string[];
  } {
    const enabledSites = Object.entries(this.scrapers)
      .filter(([_, config]) => config.enabled)
      .map(([_, config]) => config.name);

    return {
      knownOddsCount: this.knownOdds.size,
      isRunning: this.isRunning,
      intervalMinutes: this.config.intervalMinutes,
      enabledSites
    };
  }
}
