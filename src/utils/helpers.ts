import { SuperOdd } from '../types';

export function generateOddId(odd: Partial<SuperOdd>): string {
  const { homeTeam, awayTeam, oddValue, promotionType } = odd;
  const baseString = `${homeTeam}-${awayTeam}-${oddValue}-${promotionType}`;
  return Buffer.from(baseString).toString('base64').slice(0, 16);
}

export function extractTeamsFromTitle(title: string): { homeTeam: string; awayTeam: string } {
  // Padrões comuns: "Time A x Time B", "Time A vs Time B", "Time A - Time B"
  const patterns = [
    /(.+?)\s+x\s+(.+)/i,
    /(.+?)\s+vs\s+(.+)/i,
    /(.+?)\s+-\s+(.+)/i,
    /(.+?)\s+@\s+(.+)/i
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return {
        homeTeam: match[1].trim(),
        awayTeam: match[2].trim()
      };
    }
  }

  // Fallback: dividir por espaços e pegar primeira e última parte
  const words = title.split(' ');
  return {
    homeTeam: words.slice(0, Math.ceil(words.length / 2)).join(' '),
    awayTeam: words.slice(Math.ceil(words.length / 2)).join(' ')
  };
}

export function parseOddValue(oddText: string): number {
  // Remove caracteres não numéricos exceto ponto e vírgula
  const cleaned = oddText.replace(/[^\d.,]/g, '');
  
  // Converte vírgula para ponto se necessário
  const normalized = cleaned.replace(',', '.');
  
  const value = parseFloat(normalized);
  return isNaN(value) ? 0 : value;
}

export function parseBetValue(betText: string): number {
  // Remove "R$", espaços e outros caracteres, mantém apenas números e vírgula/ponto
  const cleaned = betText.replace(/[^\d.,]/g, '');
  const normalized = cleaned.replace(',', '.');
  
  const value = parseFloat(normalized);
  return isNaN(value) ? 0 : value;
}

export function isValidSuperOdd(odd: Partial<SuperOdd>): boolean {
  return !!(
    odd.homeTeam &&
    odd.awayTeam &&
    odd.oddValue &&
    odd.oddValue > 1 &&
    odd.url
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '')
    .trim();
}
