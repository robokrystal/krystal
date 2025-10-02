export interface SuperOdd {
  id: string;
  game: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  oddValue: number;
  minBet: number;
  maxBet: number;
  freebet: number;
  promotionType: string;
  url: string;
  detectedAt: Date;
  expiresAt?: Date;
}

export interface ScrapingResult {
  success: boolean;
  odds: SuperOdd[];
  error?: string;
  timestamp: Date;
}

export interface AlertPayload {
  type: 'new_super_odd' | 'odds_update' | 'error';
  data: SuperOdd | SuperOdd[] | { error: string };
  timestamp: Date;
  source: 'betesporte';
}

export interface SiteConfig {
  name: string;
  baseUrl: string;
  oddsUrl: string;
  selectors: {
    gameContainer: string;
    gameTitle: string;
    teams: string;
    oddValue: string;
    minBet: string;
    maxBet: string;
    freebet: string;
    promotionType: string;
  };
  waitSelectors: string[];
  excludeKeywords: string[];
}

export interface MonitorConfig {
  intervalMinutes: number;
  maxRetries: number;
  timeoutMs: number;
  webhookUrl: string;
  websocketUrl: string;
}
