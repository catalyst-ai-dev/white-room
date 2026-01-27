import type { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocketServer } from 'ws';
import fp from 'fastify-plugin';
import { createLogger } from '@namespace/logger';
import { decodeToken } from '@domain/lib/jwt';
import type { UserSessionDto } from '@domain/user/user.schemas';
import { WebSocketAuthenticationError, InvalidMessageError } from '@domain/collaboration/collaboration.errors';

const logger = createLogger('websocket.plugin');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace FastifyInstance {
    interface FastifyInstance {
      wss: WebSocketServer;
    }
  }
}

export default fp(async function (fastify: FastifyInstance) {
  const wss = new WebSocketServer({
    noServer: true,
  });

  fastify.decorate('wss', wss);

  fastify.server.on('upgrade', async (request: FastifyRequest['raw'], socket, head) => {
    try {
      const token = extractToken(request);
      if (!token) {
        throw new WebSocketAuthenticationError('No token provided');
      }

      const userSession = await decodeToken<UserSessionDto>(token);
      if (!userSession) {
        throw new WebSocketAuthenticationError('Invalid token');
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, userSession);
      });
    } catch (error) {
      logger.error(error, 'WebSocket upgrade error');
      socket.write(
        'HTTP/1.1 401 Unauthorized\r\nContent-Type: text/plain\r\nContent-Length: 12\r\n\r\nUnauthorized',
      );
      socket.destroy();
    }
  });

  wss.on(
    'connection',
    (ws, request: FastifyRequest['raw'], userSession: UserSessionDto) => {
      const sessionId = generateSessionId();
      logger.info(
        `WebSocket connected: sessionId=${sessionId}, userId=${userSession.id}`,
      );

      const { collaboration } = fastify.domain;
      collaboration.collaborationService.registerClient(
        sessionId,
        ws,
        userSession.id,
      );

      const messageHandler = createMessageHandler(
        sessionId,
        userSession.id,
        collaboration.collaborationService,
      );

      ws.on('message', messageHandler);

      ws.on('pong', () => {
        collaboration.collaborationService.markClientAlive(sessionId);
      });

      ws.on('close', () => {
        logger.info(`WebSocket disconnected: sessionId=${sessionId}`);
        collaboration.collaborationService.unregisterClient(sessionId);
      });

      ws.on('error', (error) => {
        logger.error(error, `WebSocket error: sessionId=${sessionId}`);
      });

      ws.send(
        JSON.stringify({
          type: 'connection',
          sessionId,
          timestamp: Date.now(),
        }),
      );
    },
  );
});

function extractToken(request: FastifyRequest['raw']): string | null {
  const url = request.url || '';

  const urlParams = new URL(`http://localhost${url}`);
  const tokenFromQuery = urlParams.searchParams.get('token');
  if (tokenFromQuery) {
    return tokenFromQuery;
  }

  const cookieHeader = request.headers.cookie || '';
  const cookieMatch = cookieHeader.match(/x-session-token=([^;]+)/);
  if (cookieMatch) {
    return cookieMatch[1];
  }

  const authHeader = request.headers.authorization || '';
  const bearerMatch = authHeader.match(/Bearer\s+(.+)/);
  if (bearerMatch) {
    return bearerMatch[1];
  }

  return null;
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createMessageHandler(
  sessionId: string,
  userId: string,
  collaborationService: InstanceType<typeof import('@domain/collaboration/collaboration.service').CollaborationService>,
) {
  return (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString('utf-8'));
      const validatedMessage = collaborationService.validateMessage(message);

      if (validatedMessage.sessionId !== sessionId) {
        logger.warn(
          `Session ID mismatch: expected=${sessionId}, got=${validatedMessage.sessionId}`,
        );
        return;
      }

      switch (validatedMessage.type) {
        case 'operation':
          handleOperation(sessionId, validatedMessage, collaborationService);
          break;

        case 'subscribe':
          handleSubscribe(sessionId, validatedMessage, collaborationService);
          break;

        case 'unsubscribe':
          handleUnsubscribe(sessionId, validatedMessage, collaborationService);
          break;

        case 'heartbeat':
          collaborationService.markClientAlive(sessionId);
          break;

        default:
          logger.warn(`Unknown message type: ${(validatedMessage as Record<string, unknown>).type}`);
      }
    } catch (error) {
      if (error instanceof InvalidMessageError) {
        logger.warn(`Invalid message from ${sessionId}: ${error.message}`);
      } else {
        logger.error(error, `Error handling message from ${sessionId}`);
      }
    }
  };
}

function handleOperation(
  sessionId: string,
  message: Record<string, unknown>,
  collaborationService: InstanceType<typeof import('@domain/collaboration/collaboration.service').CollaborationService>,
): void {
  try {
    const operationMessage =
      collaborationService.validateOperationMessage(message);
    collaborationService.handleOperation(sessionId, operationMessage);
  } catch (error) {
    logger.error(error, `Error handling operation from ${sessionId}`);
  }
}

function handleSubscribe(
  sessionId: string,
  message: Record<string, unknown>,
  collaborationService: InstanceType<typeof import('@domain/collaboration/collaboration.service').CollaborationService>,
): void {
  try {
    const payload = (message as Record<string, unknown>).payload as Record<
      string,
      unknown
    >;
    const documentId = payload?.documentId as string;

    if (!documentId) {
      throw new InvalidMessageError('documentId is required for subscribe');
    }

    collaborationService.subscribeToDocument(sessionId, documentId);
    logger.debug(`Client ${sessionId} subscribed to document ${documentId}`);
  } catch (error) {
    logger.error(error, `Error handling subscribe from ${sessionId}`);
  }
}

function handleUnsubscribe(
  sessionId: string,
  message: Record<string, unknown>,
  collaborationService: InstanceType<typeof import('@domain/collaboration/collaboration.service').CollaborationService>,
): void {
  try {
    const payload = (message as Record<string, unknown>).payload as Record<
      string,
      unknown
    >;
    const documentId = payload?.documentId as string;

    if (!documentId) {
      throw new InvalidMessageError('documentId is required for unsubscribe');
    }

    collaborationService.unsubscribeFromDocument(sessionId, documentId);
    logger.debug(`Client ${sessionId} unsubscribed from document ${documentId}`);
  } catch (error) {
    logger.error(error, `Error handling unsubscribe from ${sessionId}`);
  }
}
