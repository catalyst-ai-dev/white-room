import type { WebSocket } from 'ws';
import { createLogger } from '@namespace/logger';
import {
  WebSocketMessageSchema,
  OperationMessageSchema,
} from './collaboration.schemas';
import type {
  WebSocketMessageDto,
  OperationMessageDto,
  ClientSessionDto,
  BroadcastMessageDto,
} from './collaboration.schemas';
import {
  SessionNotFoundError,
  InvalidMessageError,
  OperationDeniedError,
} from './collaboration.errors';
import { CollaborationRateLimiter } from './collaboration.rateLimiter';

const logger = createLogger('collaboration.service');

interface WebSocketClientConnection {
  ws: WebSocket;
  session: ClientSessionDto;
  isAlive: boolean;
}

export class CollaborationService {
  private clients: Map<string, WebSocketClientConnection> = new Map();
  private sessionsByDocument: Map<string, Set<string>> = new Map();
  private rateLimiter: CollaborationRateLimiter;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.rateLimiter = new CollaborationRateLimiter();
    this.startHeartbeatInterval();
  }

  registerClient(
    sessionId: string,
    ws: WebSocket,
    userId: string,
  ): WebSocketClientConnection {
    const session: ClientSessionDto = {
      sessionId,
      userId,
      subscribedDocuments: [],
      lastActivityTime: Date.now(),
    };

    const connection: WebSocketClientConnection = {
      ws,
      session,
      isAlive: true,
    };

    this.clients.set(sessionId, connection);
    logger.info(`Client registered: sessionId=${sessionId}, userId=${userId}`);

    return connection;
  }

  unregisterClient(sessionId: string): void {
    const connection = this.clients.get(sessionId);
    if (!connection) {
      return;
    }

    for (const documentId of connection.session.subscribedDocuments) {
      this.unsubscribeFromDocument(sessionId, documentId);
    }

    this.clients.delete(sessionId);
    this.rateLimiter.clearUserLimits(connection.session.userId);
    logger.info(`Client unregistered: sessionId=${sessionId}`);
  }

  subscribeToDocument(sessionId: string, documentId: string): void {
    const connection = this.clients.get(sessionId);
    if (!connection) {
      throw new SessionNotFoundError(sessionId);
    }

    if (!connection.session.subscribedDocuments.includes(documentId)) {
      connection.session.subscribedDocuments.push(documentId);
    }

    if (!this.sessionsByDocument.has(documentId)) {
      this.sessionsByDocument.set(documentId, new Set());
    }

    const documentSessions = this.sessionsByDocument.get(documentId);
    if (documentSessions) {
      documentSessions.add(sessionId);
    }
    logger.debug(
      `Client subscribed to document: sessionId=${sessionId}, documentId=${documentId}`,
    );
  }

  unsubscribeFromDocument(sessionId: string, documentId: string): void {
    const connection = this.clients.get(sessionId);
    if (!connection) {
      return;
    }

    const index = connection.session.subscribedDocuments.indexOf(documentId);
    if (index > -1) {
      connection.session.subscribedDocuments.splice(index, 1);
    }

    const sessions = this.sessionsByDocument.get(documentId);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        this.sessionsByDocument.delete(documentId);
      }
    }

    logger.debug(
      `Client unsubscribed from document: sessionId=${sessionId}, documentId=${documentId}`,
    );
  }

  validateMessage(message: unknown): WebSocketMessageDto {
    try {
      return WebSocketMessageSchema.parse(message);
    } catch (error) {
      logger.error(error);
      throw new InvalidMessageError('Message does not match expected schema');
    }
  }

  validateOperationMessage(message: WebSocketMessageDto): OperationMessageDto {
    try {
      return OperationMessageSchema.parse(message);
    } catch (error) {
      logger.error(error);
      throw new InvalidMessageError('Operation message does not match expected schema');
    }
  }

  handleOperation(sessionId: string, message: OperationMessageDto): void {
    const connection = this.clients.get(sessionId);
    if (!connection) {
      throw new SessionNotFoundError(sessionId);
    }

    this.rateLimiter.checkAndRecord(connection.session.userId);

    const { payload } = message;
    const { documentId } = payload;

    if (!connection.session.subscribedDocuments.includes(documentId)) {
      throw new OperationDeniedError(
        `Client is not subscribed to document ${documentId}`,
      );
    }

    const broadcastMessage: BroadcastMessageDto = {
      type: 'operation',
      documentId,
      data: payload.operation,
      excludeSessionId: sessionId,
      timestamp: message.timestamp || Date.now(),
    };

    this.broadcastToDocument(documentId, broadcastMessage, sessionId);

    connection.session.lastActivityTime = Date.now();
  }

  broadcastToDocument(
    documentId: string,
    message: BroadcastMessageDto,
    senderId?: string,
  ): void {
    const sessions = this.sessionsByDocument.get(documentId);
    if (!sessions || sessions.size === 0) {
      return;
    }

    const messageJson = JSON.stringify(message);

    for (const sessionId of sessions) {
      if (message.excludeSessionId && sessionId === message.excludeSessionId) {
        continue;
      }

      if (senderId && sessionId === senderId) {
        continue;
      }

      const connection = this.clients.get(sessionId);
      if (connection?.ws.readyState === 1) {
        try {
          connection.ws.send(messageJson);
        } catch (error) {
          logger.error(error, `Failed to send message to sessionId=${sessionId}`);
        }
      }
    }
  }

  sendHeartbeat(sessionId: string): void {
    const connection = this.clients.get(sessionId);
    if (!connection) {
      return;
    }

    const heartbeat = JSON.stringify({
      type: 'heartbeat',
      timestamp: Date.now(),
    });

    try {
      if (connection.ws.readyState === 1) {
        connection.ws.send(heartbeat);
      }
    } catch (error) {
      logger.error(error, `Failed to send heartbeat to sessionId=${sessionId}`);
    }
  }

  markClientAlive(sessionId: string): void {
    const connection = this.clients.get(sessionId);
    if (connection) {
      connection.isAlive = true;
    }
  }

  getClient(sessionId: string): WebSocketClientConnection | undefined {
    return this.clients.get(sessionId);
  }

  getSubscribedClients(documentId: string): string[] {
    const sessions = this.sessionsByDocument.get(documentId);
    return sessions ? Array.from(sessions) : [];
  }

  getAllClients(): Map<string, WebSocketClientConnection> {
    return this.clients;
  }

  private startHeartbeatInterval(): void {
    this.heartbeatInterval = setInterval(() => {
      const deadClients: string[] = [];

      for (const [sessionId, connection] of this.clients) {
        if (connection.isAlive === false) {
          deadClients.push(sessionId);
        } else {
          connection.isAlive = false;
          this.sendHeartbeat(sessionId);
        }
      }

      for (const sessionId of deadClients) {
        logger.warn(`Closing connection due to missed heartbeat: ${sessionId}`);
        const connection = this.clients.get(sessionId);
        if (connection) {
          try {
            connection.ws.close(1000, 'Heartbeat timeout');
          } catch (error) {
            logger.error(error, `Failed to close connection: ${sessionId}`);
          }
          this.unregisterClient(sessionId);
        }
      }
    }, 30000);

    if (this.heartbeatInterval) {
      this.heartbeatInterval.unref();
    }
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const [sessionId, connection] of this.clients) {
      try {
        connection.ws.close(1000, 'Server shutdown');
      } catch (error) {
        logger.error(error, `Failed to close connection during shutdown: ${sessionId}`);
      }
    }
    this.clients.clear();
    this.sessionsByDocument.clear();
    this.rateLimiter.clearAllLimits();
    logger.info('CollaborationService shutdown complete');
  }
}
