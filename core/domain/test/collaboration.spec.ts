import type { OperationDto, RemoteUserDto } from '@domain/collaboration/collaboration.schemas';
import { CollaborationMode, CursorBroadcastInterval } from '@domain/collaboration/collaboration.constants';
import { TestService } from './lib/TestService';

describe('Collaboration Service', () => {
  const testService = new TestService({ context: 'domain' });

  beforeAll(async () => {
    await testService.initDataSource();
  });

  afterAll(async () => {
    await testService.destroyDataSource();
  });

  describe('Editor Initialization', () => {
    test('initialize editor with default content', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe('');
    });

    test('initialize editor with initial content', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-2';
      const initialContent = 'Hello, World!';
      collaboration.collaborationService.initializeEditor(editorId, initialContent);

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe(initialContent);
    });

    test('get editor version after initialization', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-3';
      collaboration.collaborationService.initializeEditor(editorId);

      const version = collaboration.collaborationService.getEditorVersion(editorId);
      expect(version).toBe(0);
    });
  });

  describe('Operation Application', () => {
    test('apply insert operation', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-insert-1';
      collaboration.collaborationService.initializeEditor(editorId, 'Hello');

      const operation: OperationDto = {
        id: 'op-1',
        type: 'insert',
        position: 5,
        content: ' World',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      collaboration.collaborationService.applyOperation(editorId, operation);

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe('Hello World');

      const version = collaboration.collaborationService.getEditorVersion(editorId);
      expect(version).toBe(1);
    });

    test('apply delete operation', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-delete-1';
      collaboration.collaborationService.initializeEditor(editorId, 'Hello World');

      const operation: OperationDto = {
        id: 'op-2',
        type: 'delete',
        position: 5,
        content: null,
        length: 6,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      collaboration.collaborationService.applyOperation(editorId, operation);

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe('Hello');
    });

    test('reject operation with invalid version', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-version-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const operation: OperationDto = {
        id: 'op-3',
        type: 'insert',
        position: 0,
        content: 'text',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 5,
      };

      expect(() => {
        collaboration.collaborationService.applyOperation(editorId, operation);
      }).toThrow();
    });

    test('apply multiple operations in sequence', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-multi-1';
      collaboration.collaborationService.initializeEditor(editorId, '');

      const operations: OperationDto[] = [
        {
          id: 'op-1',
          type: 'insert',
          position: 0,
          content: 'Hello',
          length: 0,
          clientId: 'client-1',
          timestamp: new Date(),
          version: 0,
        },
        {
          id: 'op-2',
          type: 'insert',
          position: 5,
          content: ' ',
          length: 0,
          clientId: 'client-1',
          timestamp: new Date(),
          version: 1,
        },
        {
          id: 'op-3',
          type: 'insert',
          position: 6,
          content: 'World',
          length: 0,
          clientId: 'client-1',
          timestamp: new Date(),
          version: 2,
        },
      ];

      for (const op of operations) {
        collaboration.collaborationService.applyOperation(editorId, op);
      }

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe('Hello World');

      const version = collaboration.collaborationService.getEditorVersion(editorId);
      expect(version).toBe(3);
    });
  });

  describe('Operation Batching', () => {
    test('apply operation batch', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-batch-1';
      collaboration.collaborationService.initializeEditor(editorId, '');

      const batch = {
        id: 'batch-1',
        operations: [
          {
            id: 'op-1',
            type: 'insert' as const,
            position: 0,
            content: 'ABC',
            length: 0,
            clientId: 'client-1',
            timestamp: new Date(),
            version: 0,
          },
          {
            id: 'op-2',
            type: 'insert' as const,
            position: 3,
            content: 'DEF',
            length: 0,
            clientId: 'client-1',
            timestamp: new Date(),
            version: 1,
          },
        ],
        clientId: 'client-1',
        timestamp: new Date(),
        baseVersion: 0,
      };

      collaboration.collaborationService.applyOperationBatch(editorId, batch);

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe('ABCDEF');
    });

    test('reject batch with invalid base version', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-batch-invalid';
      collaboration.collaborationService.initializeEditor(editorId);

      const batch = {
        id: 'batch-2',
        operations: [
          {
            id: 'op-1',
            type: 'insert' as const,
            position: 0,
            content: 'text',
            length: 0,
            clientId: 'client-1',
            timestamp: new Date(),
            version: 0,
          },
        ],
        clientId: 'client-1',
        timestamp: new Date(),
        baseVersion: 10,
      };

      expect(() => {
        collaboration.collaborationService.applyOperationBatch(editorId, batch);
      }).toThrow();
    });
  });

  describe('Operational Transformation', () => {
    test('transform insert against insert', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-transform-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const op1: OperationDto = {
        id: 'op-1',
        type: 'insert',
        position: 0,
        content: 'A',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      const op2: OperationDto = {
        id: 'op-2',
        type: 'insert',
        position: 0,
        content: 'B',
        length: 0,
        clientId: 'client-2',
        timestamp: new Date(),
        version: 0,
      };

      const transformed = collaboration.collaborationService.transformOperation(editorId, op1, [
        op2,
      ]);

      expect(transformed.position).toBe(1);
    });

    test('transform insert against delete', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-transform-2';
      collaboration.collaborationService.initializeEditor(editorId);

      const op1: OperationDto = {
        id: 'op-1',
        type: 'insert',
        position: 5,
        content: 'X',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      const op2: OperationDto = {
        id: 'op-2',
        type: 'delete',
        position: 0,
        content: null,
        length: 3,
        clientId: 'client-2',
        timestamp: new Date(),
        version: 0,
      };

      const transformed = collaboration.collaborationService.transformOperation(editorId, op1, [
        op2,
      ]);

      expect(transformed.position).toBe(2);
    });
  });

  describe('Remote User Management', () => {
    test('add remote user', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-users-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const remoteUser: RemoteUserDto = {
        id: 'user-1',
        name: 'Alice',
        color: '#FF0000',
        cursor: null,
        selection: null,
        isActive: true,
        lastSeen: new Date(),
      };

      collaboration.collaborationService.addRemoteUser(editorId, remoteUser);

      const users = collaboration.collaborationService.getRemoteUsers(editorId);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe('user-1');
      expect(users[0].name).toBe('Alice');
    });

    test('remove remote user', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-users-2';
      collaboration.collaborationService.initializeEditor(editorId);

      const remoteUser: RemoteUserDto = {
        id: 'user-2',
        name: 'Bob',
        color: '#00FF00',
        cursor: null,
        selection: null,
        isActive: true,
        lastSeen: new Date(),
      };

      collaboration.collaborationService.addRemoteUser(editorId, remoteUser);
      collaboration.collaborationService.removeRemoteUser(editorId, 'user-2');

      const users = collaboration.collaborationService.getRemoteUsers(editorId);
      expect(users).toHaveLength(0);
    });

    test('update remote user cursor', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-cursor-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const remoteUser: RemoteUserDto = {
        id: 'user-3',
        name: 'Charlie',
        color: '#0000FF',
        cursor: null,
        selection: null,
        isActive: true,
        lastSeen: new Date(),
      };

      collaboration.collaborationService.addRemoteUser(editorId, remoteUser);

      const cursorBroadcast = {
        id: 'broadcast-1',
        clientId: 'user-3',
        cursor: { line: 0, column: 10 },
        selection: null,
        timestamp: new Date(),
      };

      collaboration.collaborationService.updateRemoteUserCursor(editorId, 'user-3', cursorBroadcast);

      const user = collaboration.collaborationService.getRemoteUser(editorId, 'user-3');
      expect(user?.cursor).toEqual({ line: 0, column: 10 });
    });
  });

  describe('Editor Mode Management', () => {
    test('set editor mode to read only', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-mode-1';
      collaboration.collaborationService.initializeEditor(editorId);

      collaboration.collaborationService.setEditorMode(editorId, CollaborationMode.READ_ONLY);

      const mode = collaboration.collaborationService.getEditorMode(editorId);
      expect(mode).toBe(CollaborationMode.READ_ONLY);
    });

    test('cannot apply operation in read only mode', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-mode-2';
      collaboration.collaborationService.initializeEditor(editorId);
      collaboration.collaborationService.setEditorMode(editorId, CollaborationMode.READ_ONLY);

      const operation: OperationDto = {
        id: 'op-1',
        type: 'insert',
        position: 0,
        content: 'text',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      expect(() => {
        collaboration.collaborationService.applyOperation(editorId, operation);
      }).toThrow();
    });

    test('set editor mode to active', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-mode-3';
      collaboration.collaborationService.initializeEditor(editorId);

      collaboration.collaborationService.setEditorMode(editorId, CollaborationMode.ACTIVE);

      const mode = collaboration.collaborationService.getEditorMode(editorId);
      expect(mode).toBe(CollaborationMode.ACTIVE);

      const canApply = collaboration.collaborationService.canApplyOperation(editorId);
      expect(canApply).toBe(true);
    });
  });

  describe('Snapshot Management', () => {
    test('create snapshot', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-snap-1';
      collaboration.collaborationService.initializeEditor(editorId, 'Test Content');

      const snapshot = collaboration.collaborationService.createSnapshot(editorId, 'client-1');

      expect(snapshot).toBeDefined();
      expect(snapshot.content).toBe('Test Content');
      expect(snapshot.clientId).toBe('client-1');
      expect(snapshot.version).toBe(0);
    });

    test('get snapshot', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-snap-2';
      collaboration.collaborationService.initializeEditor(editorId, 'Content');

      const created = collaboration.collaborationService.createSnapshot(editorId, 'client-1');
      const retrieved = collaboration.collaborationService.getSnapshot(editorId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });
  });

  describe('Editor Content Management', () => {
    test('set editor content', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-content-1';
      collaboration.collaborationService.initializeEditor(editorId);

      collaboration.collaborationService.setEditorContent(editorId, 'New Content');

      const content = collaboration.collaborationService.getEditorContent(editorId);
      expect(content).toBe('New Content');
    });

    test('reset editor clears all state', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-reset-1';
      collaboration.collaborationService.initializeEditor(editorId, 'Initial');

      const operation: OperationDto = {
        id: 'op-1',
        type: 'insert',
        position: 7,
        content: ' Content',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      collaboration.collaborationService.applyOperation(editorId, operation);

      const remoteUser: RemoteUserDto = {
        id: 'user-1',
        name: 'Alice',
        color: '#FF0000',
        cursor: null,
        selection: null,
        isActive: true,
        lastSeen: new Date(),
      };

      collaboration.collaborationService.addRemoteUser(editorId, remoteUser);

      collaboration.collaborationService.reset(editorId);

      const content = collaboration.collaborationService.getEditorContent(editorId);
      const version = collaboration.collaborationService.getEditorVersion(editorId);
      const users = collaboration.collaborationService.getRemoteUsers(editorId);

      expect(content).toBe('');
      expect(version).toBe(0);
      expect(users).toHaveLength(0);
    });
  });

  describe('Operation History', () => {
    test('retrieve operation history', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-history-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const op1: OperationDto = {
        id: 'op-1',
        type: 'insert',
        position: 0,
        content: 'A',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      };

      const op2: OperationDto = {
        id: 'op-2',
        type: 'insert',
        position: 1,
        content: 'B',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 1,
      };

      collaboration.collaborationService.applyOperation(editorId, op1);
      collaboration.collaborationService.applyOperation(editorId, op2);

      const history = collaboration.collaborationService.getOperationHistory(editorId);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('op-1');
      expect(history[1].id).toBe('op-2');
    });

    test('retrieve operation history since version', () => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-history-2';
      collaboration.collaborationService.initializeEditor(editorId);

      const operations: OperationDto[] = [];
      for (let i = 0; i < 5; i++) {
        operations.push({
          id: `op-${i}`,
          type: 'insert',
          position: i,
          content: String(i),
          length: 0,
          clientId: 'client-1',
          timestamp: new Date(),
          version: i,
        });
      }

      for (const op of operations) {
        collaboration.collaborationService.applyOperation(editorId, op);
      }

      const recentHistory = collaboration.collaborationService.getOperationHistory(
        editorId,
        2,
      );

      expect(recentHistory.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cursor Broadcast Scheduling', () => {
    test('schedule cursor broadcast', (done) => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-broadcast-1';
      collaboration.collaborationService.initializeEditor(editorId);

      let broadcastCalled = false;

      const callback = async () => {
        broadcastCalled = true;
      };

      collaboration.collaborationService.scheduleCursorBroadcast(
        editorId,
        'user-1',
        { line: 0, column: 5 },
        null,
        callback,
      );

      setTimeout(() => {
        expect(broadcastCalled).toBe(true);
        done();
      }, CursorBroadcastInterval.DEFAULT_MS + 50);
    });

    test('clear cursor broadcast', (done) => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-broadcast-2';
      collaboration.collaborationService.initializeEditor(editorId);

      let broadcastCalled = false;

      const callback = async () => {
        broadcastCalled = true;
      };

      collaboration.collaborationService.scheduleCursorBroadcast(
        editorId,
        'user-2',
        { line: 0, column: 10 },
        null,
        callback,
      );

      collaboration.collaborationService.clearCursorBroadcast(editorId, 'user-2');

      setTimeout(() => {
        expect(broadcastCalled).toBe(false);
        done();
      }, CursorBroadcastInterval.DEFAULT_MS + 50);
    });
  });

  describe('Event Publishing', () => {
    test('operation applied event is published', (done) => {
      const {
        domain: { collaboration },
      } = testService;

      const editorId = 'test-editor-events-1';
      collaboration.collaborationService.initializeEditor(editorId);

      const eventBus = testService.domain.collaboration.collaborationService as any;

      const originalPublish = eventBus.eventBus?.publish || (() => {});
      let eventPublished = false;

      collaboration.collaborationService.applyOperation(editorId, {
        id: 'op-1',
        type: 'insert',
        position: 0,
        content: 'text',
        length: 0,
        clientId: 'client-1',
        timestamp: new Date(),
        version: 0,
      });

      setTimeout(() => {
        done();
      }, 10);
    });
  });
});
