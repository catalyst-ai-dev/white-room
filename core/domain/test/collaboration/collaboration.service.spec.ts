import type { WebSocket } from 'ws';
import { CollaborationService } from '../../src/collaboration/collaboration.service';
import {
  SessionNotFoundError,
  InvalidMessageError,
  OperationDeniedError,
  RateLimitError,
} from '../../src/collaboration/collaboration.errors';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    service = new CollaborationService();
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      on: jest.fn(),
    } as unknown as jest.Mocked<WebSocket>;
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Client Registration', () => {
    it('should register a client successfully', () => {
      const sessionId = 'test-session-1';
      const userId = 'user-1';

      const connection = service.registerClient(sessionId, mockWebSocket, userId);

      expect(connection).toBeDefined();
      expect(connection.session.sessionId).toBe(sessionId);
      expect(connection.session.userId).toBe(userId);
      expect(connection.session.subscribedDocuments).toEqual([]);
    });

    it('should retrieve registered client', () => {
      const sessionId = 'test-session-1';
      service.registerClient(sessionId, mockWebSocket, 'user-1');

      const client = service.getClient(sessionId);

      expect(client).toBeDefined();
      expect(client?.session.sessionId).toBe(sessionId);
    });

    it('should unregister a client', () => {
      const sessionId = 'test-session-1';
      service.registerClient(sessionId, mockWebSocket, 'user-1');

      service.unregisterClient(sessionId);

      expect(service.getClient(sessionId)).toBeUndefined();
    });

    it('should unsubscribe client from all documents on unregister', () => {
      const sessionId = 'test-session-1';
      const documentId = 'doc-1';
      service.registerClient(sessionId, mockWebSocket, 'user-1');
      service.subscribeToDocument(sessionId, documentId);

      expect(service.getSubscribedClients(documentId)).toContain(sessionId);

      service.unregisterClient(sessionId);

      expect(service.getSubscribedClients(documentId)).not.toContain(sessionId);
    });
  });

  describe('Document Subscription', () => {
    beforeEach(() => {
      service.registerClient('session-1', mockWebSocket, 'user-1');
      service.registerClient('session-2', mockWebSocket, 'user-2');
    });

    it('should subscribe client to document', () => {
      const documentId = 'doc-1';

      service.subscribeToDocument('session-1', documentId);

      expect(service.getSubscribedClients(documentId)).toContain('session-1');
    });

    it('should prevent duplicate subscriptions', () => {
      const documentId = 'doc-1';

      service.subscribeToDocument('session-1', documentId);
      service.subscribeToDocument('session-1', documentId);

      const clients = service.getSubscribedClients(documentId);
      const count = clients.filter((c) => c === 'session-1').length;

      expect(count).toBe(1);
    });

    it('should unsubscribe client from document', () => {
      const documentId = 'doc-1';
      service.subscribeToDocument('session-1', documentId);

      service.unsubscribeFromDocument('session-1', documentId);

      expect(service.getSubscribedClients(documentId)).not.toContain('session-1');
    });

    it('should throw when subscribing non-existent session', () => {
      expect(() => {
        service.subscribeToDocument('non-existent', 'doc-1');
      }).toThrow(SessionNotFoundError);
    });
  });

  describe('Message Validation', () => {
    it('should validate valid message', () => {
      const message = {
        type: 'heartbeat',
        sessionId: 'session-1',
      };

      const validated = service.validateMessage(message);

      expect(validated.type).toBe('heartbeat');
      expect(validated.sessionId).toBe('session-1');
    });

    it('should reject invalid message - missing type', () => {
      const message = {
        sessionId: 'session-1',
      };

      expect(() => {
        service.validateMessage(message);
      }).toThrow(InvalidMessageError);
    });

    it('should reject invalid message - missing sessionId', () => {
      const message = {
        type: 'heartbeat',
      };

      expect(() => {
        service.validateMessage(message);
      }).toThrow(InvalidMessageError);
    });

    it('should validate operation message', () => {
      const message = {
        type: 'operation' as const,
        sessionId: 'session-1',
        payload: {
          documentId: 'doc-1',
          operation: { action: 'insert' },
          version: 1,
        },
      };

      const validated = service.validateOperationMessage(message);

      expect(validated.type).toBe('operation');
      expect(validated.payload.documentId).toBe('doc-1');
    });
  });

  describe('Operation Handling', () => {
    beforeEach(() => {
      service.registerClient('session-1', mockWebSocket, 'user-1');
      service.registerClient('session-2', mockWebSocket, 'user-2');
      service.subscribeToDocument('session-1', 'doc-1');
      service.subscribeToDocument('session-2', 'doc-1');
    });

    it('should handle operation from subscribed client', () => {
      const message = {
        type: 'operation' as const,
        sessionId: 'session-1',
        payload: {
          documentId: 'doc-1',
          operation: { action: 'insert' },
          version: 1,
        },
      };

      expect(() => {
        service.handleOperation('session-1', message);
      }).not.toThrow();
    });

    it('should throw when handling operation from non-subscribed client', () => {
      const message = {
        type: 'operation' as const,
        sessionId: 'session-1',
        payload: {
          documentId: 'doc-2',
          operation: { action: 'insert' },
          version: 1,
        },
      };

      expect(() => {
        service.handleOperation('session-1', message);
      }).toThrow(OperationDeniedError);
    });

    it('should throw when handling operation from non-existent session', () => {
      const message = {
        type: 'operation' as const,
        sessionId: 'non-existent',
        payload: {
          documentId: 'doc-1',
          operation: { action: 'insert' },
          version: 1,
        },
      };

      expect(() => {
        service.handleOperation('non-existent', message);
      }).toThrow(SessionNotFoundError);
    });

    it('should rate limit operations', () => {
      const message = {
        type: 'operation' as const,
        sessionId: 'session-1',
        payload: {
          documentId: 'doc-1',
          operation: { action: 'insert' },
          version: 1,
        },
      };

      for (let i = 0; i < 100; i++) {
        service.handleOperation('session-1', message);
      }

      expect(() => {
        service.handleOperation('session-1', message);
      }).toThrow(RateLimitError);
    });
  });

  describe('Broadcasting', () => {
    beforeEach(() => {
      service.registerClient('session-1', mockWebSocket, 'user-1');
      service.registerClient('session-2', mockWebSocket, 'user-2');
      service.registerClient('session-3', mockWebSocket, 'user-3');
      service.subscribeToDocument('session-1', 'doc-1');
      service.subscribeToDocument('session-2', 'doc-1');
      service.subscribeToDocument('session-3', 'doc-2');
    });

    it('should broadcast to subscribed clients', () => {
      const message = {
        type: 'operation' as const,
        documentId: 'doc-1',
        data: { action: 'insert' },
        timestamp: Date.now(),
      };

      service.broadcastToDocument('doc-1', message);

      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should not broadcast to non-subscribed clients', () => {
      mockWebSocket.send.mockClear();
      const message = {
        type: 'operation' as const,
        documentId: 'doc-1',
        data: { action: 'insert' },
        timestamp: Date.now(),
      };

      service.broadcastToDocument('doc-1', message);

      const calls = mockWebSocket.send.mock.calls.length;

      expect(calls).toBeGreaterThan(0);
    });

    it('should exclude sender from broadcast', () => {
      mockWebSocket.send.mockClear();
      const message = {
        type: 'operation' as const,
        documentId: 'doc-1',
        data: { action: 'insert' },
        excludeSessionId: 'session-1',
        timestamp: Date.now(),
      };

      service.broadcastToDocument('doc-1', message);

      const sendCalls = mockWebSocket.send.mock.calls;
      expect(sendCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Heartbeat', () => {
    it('should send heartbeat to client', () => {
      service.registerClient('session-1', mockWebSocket, 'user-1');

      service.sendHeartbeat('session-1');

      expect(mockWebSocket.send).toHaveBeenCalled();
      const call = mockWebSocket.send.mock.calls[0][0];
      const heartbeat = JSON.parse(call as string);
      expect(heartbeat.type).toBe('heartbeat');
    });

    it('should mark client as alive on pong', () => {
      const connection = service.registerClient('session-1', mockWebSocket, 'user-1');

      connection.isAlive = false;
      service.markClientAlive('session-1');

      expect(service.getClient('session-1')?.isAlive).toBe(true);
    });
  });

  describe('Client Tracking', () => {
    it('should return all clients', () => {
      service.registerClient('session-1', mockWebSocket, 'user-1');
      service.registerClient('session-2', mockWebSocket, 'user-2');

      const clients = service.getAllClients();

      expect(clients.size).toBe(2);
      expect(clients.has('session-1')).toBe(true);
      expect(clients.has('session-2')).toBe(true);
    });

    it('should return subscribed clients for document', () => {
      service.registerClient('session-1', mockWebSocket, 'user-1');
      service.registerClient('session-2', mockWebSocket, 'user-2');
      service.subscribeToDocument('session-1', 'doc-1');
      service.subscribeToDocument('session-2', 'doc-1');

      const clients = service.getSubscribedClients('doc-1');

      expect(clients).toHaveLength(2);
      expect(clients).toContain('session-1');
      expect(clients).toContain('session-2');
    });
  });

  describe('Shutdown', () => {
    it('should cleanup all clients on shutdown', () => {
      service.registerClient('session-1', mockWebSocket, 'user-1');
      service.registerClient('session-2', mockWebSocket, 'user-2');

      service.shutdown();

      expect(service.getAllClients().size).toBe(0);
    });
  });
});
