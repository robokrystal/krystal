import puppeteer, { Browser, Page } from 'puppeteer';
import { SuperOdd, ScrapingResult, SiteConfig } from '../types';
import { BETESPORTE_CONFIG } from '../../config/sites';
import { logger } from '../utils/logger';
import { 
  generateOddId, 
  extractTeamsFromTitle, 
  parseOddValue, 
  parseBetValue, 
  isValidSuperOdd,
  sleep,
  sanitizeText
} from '../utils/helpers';

export class BetEsporteScraper {
  private browser: Browser | null = null;
  private config: SiteConfig;

  constructor() {
    this.config = BETESPORTE_CONFIG;
  }

  async initialize(): Promise<void> {
    try {
      const args = process.env.PUPPETEER_ARGS?.split(',') || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ];

      this.browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        args,
        timeout: 60000
      });

      logger.info('BetEsporte scraper inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar scraper:', error);
      throw error;
    }
  }

  async scrapeOdds(): Promise<ScrapingResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Configurar página
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navegar para a página
      logger.info(`Navegando para: ${this.config.oddsUrl}`);
      await page.goto(this.config.oddsUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Aguardar carregamento do conteúdo
      await this.waitForContent(page);

      // Extrair odds
      const odds = await this.extractOdds(page);

      logger.info(`Encontradas ${odds.length} super odds`);

      return {
        success: true,
        odds,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Erro durante scraping:', error);
      return {
        success: false,
        odds: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date()
      };
    } finally {
      await page.close();
    }
  }

  private async waitForContent(page: Page): Promise<void> {
    // Tentar aguardar por diferentes seletores
    const selectors = this.config.waitSelectors;
    
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        logger.info(`Conteúdo carregado (seletor: ${selector})`);
        return;
      } catch (error) {
        logger.debug(`Seletor ${selector} não encontrado, tentando próximo...`);
      }
    }

    // Se nenhum seletor específico funcionou, aguarda um tempo fixo
    logger.info('Aguardando carregamento por tempo fixo...');
    await sleep(3000);
  }

  private async extractOdds(page: Page): Promise<SuperOdd[]> {
    const odds: SuperOdd[] = [];

    try {
      // Buscar containers de jogos usando diferentes seletores
      const gameContainers = await page.$$(this.config.selectors.gameContainer);
      
      if (gameContainers.length === 0) {
        logger.warn('Nenhum container de jogo encontrado');
        return odds;
      }

      logger.info(`Encontrados ${gameContainers.length} containers de jogos`);

      for (let i = 0; i < gameContainers.length; i++) {
        try {
          const container = gameContainers[i];
          const odd = await this.extractOddFromContainer(page, container, i);
          
          if (odd && isValidSuperOdd(odd)) {
            odds.push(odd);
          }
        } catch (error) {
          logger.debug(`Erro ao processar container ${i}:`, error);
        }
      }

    } catch (error) {
      logger.error('Erro ao extrair odds:', error);
    }

    return odds;
  }

  private async extractOddFromContainer(page: Page, container: any, index: number): Promise<SuperOdd | null> {
    try {
      // Extrair título do jogo
      const gameTitle = await this.extractText(container, this.config.selectors.gameTitle);
      if (!gameTitle) {
        logger.debug(`Container ${index}: título não encontrado`);
        return null;
      }

      // Verificar se não é um jogo excluído
      const lowerTitle = gameTitle.toLowerCase();
      if (this.config.excludeKeywords.some(keyword => lowerTitle.includes(keyword))) {
        logger.debug(`Container ${index}: jogo excluído (${gameTitle})`);
        return null;
      }

      // Extrair times
      const { homeTeam, awayTeam } = extractTeamsFromTitle(gameTitle);

      // Extrair odd
      const oddText = await this.extractText(container, this.config.selectors.oddValue);
      const oddValue = parseOddValue(oddText || '0');

      // Extrair valores de aposta
      const minBetText = await this.extractText(container, this.config.selectors.minBet);
      const maxBetText = await this.extractText(container, this.config.selectors.maxBet);
      const freebetText = await this.extractText(container, this.config.selectors.freebet);

      const minBet = parseBetValue(minBetText || '0');
      const maxBet = parseBetValue(maxBetText || '0');
      const freebet = parseBetValue(freebetText || '0');

      // Extrair tipo de promoção
      const promotionType = await this.extractText(container, this.config.selectors.promotionType) || 'Super Odd';

      const odd: SuperOdd = {
        id: generateOddId({ homeTeam, awayTeam, oddValue, promotionType }),
        game: gameTitle,
        league: 'Futebol', // Pode ser extraído dinamicamente se necessário
        homeTeam: sanitizeText(homeTeam),
        awayTeam: sanitizeText(awayTeam),
        oddValue,
        minBet,
        maxBet,
        freebet,
        promotionType: sanitizeText(promotionType),
        url: this.config.oddsUrl,
        detectedAt: new Date()
      };

      logger.debug(`Container ${index}: odd extraída`, odd);
      return odd;

    } catch (error) {
      logger.debug(`Erro ao extrair odd do container ${index}:`, error);
      return null;
    }
  }

  private async extractText(container: any, selector: string): Promise<string | null> {
    try {
      const element = await container.$(selector);
      if (element) {
        const text = await element.evaluate((el: Element) => el.textContent?.trim());
        return text || null;
      }
    } catch (error) {
      // Silencioso - é normal alguns seletores não existirem
    }
    return null;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('BetEsporte scraper fechado');
    }
  }
}
