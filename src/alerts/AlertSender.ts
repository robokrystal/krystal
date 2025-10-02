import axios from 'axios';
import WebSocket from 'ws';
import { SuperOdd, AlertPayload } from '../types';
import { logger } from '../utils/logger';

export class AlertSender {
  private webhookUrl: string;
  private websocketUrl: string;
  private ws: WebSocket | null = null;

  constructor(webhookUrl: string, websocketUrl: string) {
    this.webhookUrl = webhookUrl;
    this.websocketUrl = websocketUrl;
  }

  async initialize(): Promise<void> {
    try {
      if (this.websocketUrl) {
        await this.connectWebSocket();
      }
      logger.info('AlertSender inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar AlertSender:', error);
    }
  }

  private async connectWebSocket(): Promise<void> {
    try {
      this.ws = new WebSocket(this.websocketUrl);

      this.ws.on('open', () => {
        logger.info('Conexão WebSocket estabelecida');
      });

      this.ws.on('error', (error) => {
        logger.error('Erro no WebSocket:', error);
      });

      this.ws.on('close', () => {
        logger.info('Conexão WebSocket fechada, tentando reconectar...');
        setTimeout(() => this.connectWebSocket(), 5000);
      });

    } catch (error) {
      logger.error('Erro ao conectar WebSocket:', error);
    }
  }

  async sendNewOddAlert(odd: SuperOdd): Promise<void> {
    const payload: AlertPayload = {
      type: 'new_super_odd',
      data: odd,
      timestamp: new Date(),
      source: 'betesporte'
    };

    await Promise.all([
      this.sendWebhook(payload),
      this.sendWebSocket(payload)
    ]);

    logger.info(`Alerta enviado para nova super odd: ${odd.game}`);
  }

  async sendMultipleOddsAlert(odds: SuperOdd[]): Promise<void> {
    const payload: AlertPayload = {
      type: 'odds_update',
      data: odds,
      timestamp: new Date(),
      source: 'betesporte'
    };

    await Promise.all([
      this.sendWebhook(payload),
      this.sendWebSocket(payload)
    ]);

    logger.info(`Alerta enviado para ${odds.length} super odds`);
  }

  async sendErrorAlert(error: string): Promise<void> {
    const payload: AlertPayload = {
      type: 'error',
      data: { error },
      timestamp: new Date(),
      source: 'betesporte'
    };

    await Promise.all([
      this.sendWebhook(payload),
      this.sendWebSocket(payload)
    ]);

    logger.info(`Alerta de erro enviado: ${error}`);
  }

  private async sendWebhook(payload: AlertPayload): Promise<void> {
    if (!this.webhookUrl) {
      logger.debug('Webhook URL não configurada, pulando envio');
      return;
    }

    try {
      const response = await axios.post(this.webhookUrl, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BetEsporte-Monitor/1.0'
        }
      });

      if (response.status === 200) {
        logger.debug('Webhook enviado com sucesso');
      } else {
        logger.warn(`Webhook retornou status ${response.status}`);
      }

    } catch (error) {
      logger.error('Erro ao enviar webhook:', error);
    }
  }

  private async sendWebSocket(payload: AlertPayload): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.debug('WebSocket não conectado, pulando envio');
      return;
    }

    try {
      this.ws.send(JSON.stringify(payload));
      logger.debug('Mensagem WebSocket enviada com sucesso');
    } catch (error) {
      logger.error('Erro ao enviar WebSocket:', error);
    }
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    logger.info('AlertSender fechado');
  }
}
