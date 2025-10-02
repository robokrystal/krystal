import puppeteer, { Browser, Page } from 'puppeteer';
import { SuperOdd, ScrapingResult, SiteConfig } from '../types';
import { BR4BET_CONFIG } from '../../config/sites';
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

export class Br4betScraper {
  private browser: Browser | null = null;
  private config: SiteConfig;

  constructor() {
    this.config = BR4BET_CONFIG;
  }

  async initialize(): Promise<void> {
    try {
      const args = process.env.PUPPETEER_ARGS?.split(',') || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ];

      this.browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        args,
        timeout: 60000
      });

      logger.info('Br4bet scraper inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar Br4bet scraper:', error);
      throw error;
    }
  }

  async scrapeOdds(): Promise<ScrapingResult> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      logger.info(`[BR4BET] Navegando para: ${this.config.oddsUrl}`);
      await page.goto(this.config.oddsUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Aguardar carregamento específico do Br4bet
      await this.waitForContent(page);

      const odds = await this.extractOdds(page);

      logger.info(`[BR4BET] Encontradas ${odds.length} super odds`);

      return {
        success: true,
        odds,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('[BR4BET] Erro durante scraping:', error);
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
    for (const selector of this.config.waitSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        logger.info(`[BR4BET] Conteúdo carregado (seletor: ${selector})`);
        return;
      } catch (error) {
        logger.debug(`[BR4BET] Seletor ${selector} não encontrado`);
      }
    }
    await sleep(3000);
  }

  private async extractOdds(page: Page): Promise<SuperOdd[]> {
    const odds: SuperOdd[] = [];

    try {
      const gameContainers = await page.$$(this.config.selectors.gameContainer);
      
      for (let i = 0; i < gameContainers.length; i++) {
        try {
          const container = gameContainers[i];
          const odd = await this.extractOddFromContainer(page, container, i);
          
          if (odd && isValidSuperOdd(odd)) {
            odds.push(odd);
          }
        } catch (error) {
          logger.debug(`[BR4BET] Erro ao processar container ${i}:`, error);
        }
      }

    } catch (error) {
      logger.error('[BR4BET] Erro ao extrair odds:', error);
    }

    return odds;
  }

  private async extractOddFromContainer(page: Page, container: any, index: number): Promise<SuperOdd | null> {
    try {
      const gameTitle = await this.extractText(container, this.config.selectors.gameTitle);
      if (!gameTitle) return null;

      const lowerTitle = gameTitle.toLowerCase();
      if (this.config.excludeKeywords.some(keyword => lowerTitle.includes(keyword))) {
        return null;
      }

      const { homeTeam, awayTeam } = extractTeamsFromTitle(gameTitle);
      const oddText = await this.extractText(container, this.config.selectors.oddValue);
      const oddValue = parseOddValue(oddText || '0');

      const minBetText = await this.extractText(container, this.config.selectors.minBet);
      const maxBetText = await this.extractText(container, this.config.selectors.maxBet);
      const freebetText = await this.extractText(container, this.config.selectors.freebet);

      const minBet = parseBetValue(minBetText || '0');
      const maxBet = parseBetValue(maxBetText || '0');
      const freebet = parseBetValue(freebetText || '0');

      const promotionType = await this.extractText(container, this.config.selectors.promotionType) || 'Super Odd';

      const odd: SuperOdd = {
        id: generateOddId({ homeTeam, awayTeam, oddValue, promotionType }),
        game: gameTitle,
        league: 'Futebol',
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

      return odd;

    } catch (error) {
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
      // Silencioso
    }
    return null;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('[BR4BET] Scraper fechado');
    }
  }
}
