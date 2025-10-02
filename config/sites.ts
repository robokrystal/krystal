import { SiteConfig } from '../src/types';

export const BETESPORTE_CONFIG: SiteConfig = {
  name: 'BetEsporte',
  baseUrl: 'https://betesporte.bet.br',
  oddsUrl: 'https://betesporte.bet.br/sports/desktop/sport-league/999/4200000001',
  selectors: {
    gameContainer: '.event-item, .match-item, .game-card, [data-testid="event"], .sport-event',
    gameTitle: '.event-title, .match-title, .game-title, h3, h4, .title',
    teams: '.team-name, .participant, .competitor, .team',
    oddValue: '.odd-value, .odds, .coefficient, [data-testid="odd"]',
    minBet: '.min-bet, .minimum, .min-value, [data-min]',
    maxBet: '.max-bet, .maximum, .max-value, [data-max]',
    freebet: '.freebet, .bonus, .free-bet, .promotion-value',
    promotionType: '.promo-type, .promotion-type, .bonus-type, .offer-type'
  },
  waitSelectors: [
    '.event-item',
    '.match-item', 
    '.game-card',
    '[data-testid="event"]',
    '.sport-event',
    '.loading-complete'
  ],
  excludeKeywords: [
    'ao vivo',
    'live',
    'encerrado',
    'finished',
    'cancelado',
    'cancelled'
  ]
};

// ===== EXEMPLO: ADICIONANDO BR4BET =====
export const BR4BET_CONFIG: SiteConfig = {
  name: 'Br4bet',
  baseUrl: 'https://br4bet.com',
  oddsUrl: 'https://br4bet.com/promotions', // URL das promoções
  selectors: {
    gameContainer: '.promo-card, .promotion-item, .bet-card',
    gameTitle: '.promo-title, .game-name, h3',
    teams: '.team, .participant',
    oddValue: '.odd, .coefficient',
    minBet: '.min-stake, .minimum',
    maxBet: '.max-stake, .maximum',
    freebet: '.freebet-value, .bonus-amount',
    promotionType: '.promo-type, .bet-type'
  },
  waitSelectors: [
    '.promo-card',
    '.promotion-item',
    '.loading-done'
  ],
  excludeKeywords: [
    'expirado',
    'expired',
    'indisponível'
  ]
};

// ===== EXEMPLO: ADICIONANDO LOTOGREEN =====
export const LOTOGREEN_CONFIG: SiteConfig = {
  name: 'Lotogreen',
  baseUrl: 'https://lotogreen.com',
  oddsUrl: 'https://lotogreen.com/super-odds',
  selectors: {
    gameContainer: '.super-odd-card, .promotion-box',
    gameTitle: '.match-title, .game-title',
    teams: '.team-name, .competitor',
    oddValue: '.super-odd-value, .enhanced-odd',
    minBet: '.min-bet-amount',
    maxBet: '.max-bet-amount',
    freebet: '.freebet-bonus, .free-bet',
    promotionType: '.promotion-label, .offer-type'
  },
  waitSelectors: [
    '.super-odd-card',
    '.promotion-box'
  ],
  excludeKeywords: [
    'encerrado',
    'finalizado'
  ]
};