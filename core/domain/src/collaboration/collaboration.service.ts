import type { IEventBus } from '@domain/lib/EventBus';
import type {
  OperationDto,
  RemoteUserDto,
  CursorPositionDto,
  SelectionDto,
  EditorSnapshotDto,
  OperationBatchDto,
  CursorBroadcastDto,
} from './collaboration.schemas';

import { generateSnowflakeId } from '@domain/lib/snowflake';
import { CursorBroadcastInterval, CollaborationMode, OperationBatchSize } from './collaboration.constants';
import { OperationSchema, CursorPositionSchema, SelectionSchema } from './collaboration.schemas';
import {
  OperationApplyError,
  VersionConflictError,
  InvalidCursorPositionError,
  CollaborationDisabledError,
  OperationBatchValidationError,
} from './collaboration.errors';
import { OTTransformer } from './lib/OTTransformer';
import { OperationHistory } from './lib/OperationHistory';
import { CursorTracker } from './lib/CursorTracker';
import { EditorState } from './lib/EditorState';
import {
  OperationAppliedEvent,
  CursorUpdatedEvent,
  OperationBatchReceivedEvent,
  RemoteUserConnectedEvent,
  RemoteUserDisconnectedEvent,
  OperationConflictEvent,
} from './collaboration.events';

export class CollaborationService {
  private editorStates = new Map<string, EditorState>();
  private operationHistories = new Map<string, OperationHistory>();
  private cursorTrackers = new Map<string, CursorTracker>();
  private editorSnapshots = new Map<string, EditorSnapshotDto>();
  private pendingOperations = new Map<string, OperationDto[]>();
  private cursorBroadcastTimers = new Map<string, NodeJS.Timeout>();

  constructor(private eventBus: IEventBus) {}

  initializeEditor(editorId: string, initialContent: string = ''): void {
    if (!this.editorStates.has(editorId)) {
      this.editorStates.set(editorId, new EditorState(initialContent));
      this.operationHistories.set(editorId, new OperationHistory());
      this.cursorTrackers.set(editorId, new CursorTracker());
      this.pendingOperations.set(editorId, []);
    }
  }

  applyOperation(editorId: string, operation: OperationDto): void {
    const editorState = this.getEditorState(editorId);
    const history = this.getOperationHistoryPrivate(editorId);

    if (operation.version !== history.getVersion()) {
      throw new VersionConflictError(
        `Operation version ${operation.version} does not match current version ${history.getVersion()}`,
      );
    }

    try {
      editorState.applyOperation(operation);
      history.addOperation(operation);

      this.eventBus.publish(
        new OperationAppliedEvent({
          editorId,
          operationId: operation.id,
          clientId: operation.clientId,
          version: operation.version,
          timestamp: operation.timestamp,
        }),
      );
    } catch (error) {
      throw new OperationApplyError(
        `Failed to apply operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  applyOperationBatch(editorId: string, batch: OperationBatchDto): void {
    const history = this.getOperationHistoryPrivate(editorId);

    if (batch.baseVersion !== history.getVersion()) {
      throw new VersionConflictError(
        `Batch base version ${batch.baseVersion} does not match current version ${history.getVersion()}`,
      );
    }

    if (batch.operations.length === 0 || batch.operations.length > OperationBatchSize.MAX) {
      throw new OperationBatchValidationError(
        `Batch size must be between 1 and ${OperationBatchSize.MAX}`,
      );
    }

    for (const operation of batch.operations) {
      this.applyOperation(editorId, operation);
    }

    this.eventBus.publish(
      new OperationBatchReceivedEvent({
        editorId,
        batchId: batch.id,
        clientId: batch.clientId,
        operationCount: batch.operations.length,
        baseVersion: batch.baseVersion,
      }),
    );
  }

  transformOperation(
    editorId: string,
    operation: OperationDto,
    againstOperations: OperationDto[],
  ): OperationDto {
    let transformed = operation;

    for (const againstOp of againstOperations) {
      if (againstOp.clientId !== operation.clientId) {
        const result = OTTransformer.transform(transformed, againstOp);
        transformed = result;

        if (
          result.position !== operation.position ||
          result.length !== operation.length ||
          result.content !== operation.content
        ) {
          this.eventBus.publish(
            new OperationConflictEvent({
              editorId,
              operationId: operation.id,
              conflictingOperationId: againstOp.id,
              resolvedUsing: 'transform',
            }),
          );
        }
      }
    }

    return transformed;
  }

  addRemoteUser(editorId: string, user: RemoteUserDto): void {
    const tracker = this.getCursorTracker(editorId);
    tracker.addRemoteUser(user);

    this.eventBus.publish(
      new RemoteUserConnectedEvent({
        editorId,
        userId: user.id,
        userName: user.name,
        color: user.color,
      }),
    );
  }

  removeRemoteUser(editorId: string, userId: string): void {
    const tracker = this.getCursorTracker(editorId);
    tracker.removeRemoteUser(userId);

    this.eventBus.publish(
      new RemoteUserDisconnectedEvent({
        editorId,
        userId,
      }),
    );
  }

  updateRemoteUserCursor(
    editorId: string,
    userId: string,
    cursor: CursorBroadcastDto,
  ): void {
    const tracker = this.getCursorTracker(editorId);
    const user = tracker.getRemoteUser(userId);

    if (!user) {
      throw new InvalidCursorPositionError(`Remote user ${userId} not found`);
    }

    if (cursor.cursor) {
      const validatedCursor = CursorPositionSchema.parse(cursor.cursor);
      tracker.updateRemoteUserCursor(userId, validatedCursor);
    }

    if (cursor.selection) {
      const validatedSelection = SelectionSchema.parse(cursor.selection);
      tracker.updateRemoteUserSelection(userId, validatedSelection);
    }

    this.eventBus.publish(
      new CursorUpdatedEvent({
        editorId,
        clientId: userId,
        cursor,
      }),
    );
  }

  getRemoteUsers(editorId: string): RemoteUserDto[] {
    const tracker = this.getCursorTracker(editorId);
    return tracker.getActiveRemoteUsers();
  }

  getRemoteUser(editorId: string, userId: string): RemoteUserDto | undefined {
    const tracker = this.getCursorTracker(editorId);
    return tracker.getRemoteUser(userId);
  }

  getEditorContent(editorId: string): string {
    const editorState = this.getEditorState(editorId);
    return editorState.getContent();
  }

  setEditorContent(editorId: string, content: string): void {
    const editorState = this.getEditorState(editorId);
    editorState.setContent(content);
  }

  getEditorVersion(editorId: string): number {
    const history = this.getOperationHistoryPrivate(editorId);
    return history.getVersion();
  }

  getOperationHistory(editorId: string, since?: number): OperationDto[] {
    const history = this.getOperationHistoryPrivate(editorId);
    if (since !== undefined) {
      return history.getOperationsSince(since);
    }
    return history.getAllOperations();
  }

  createSnapshot(editorId: string, clientId: string): EditorSnapshotDto {
    const editorState = this.getEditorState(editorId);
    const history = this.getOperationHistoryPrivate(editorId);

    const snapshot: EditorSnapshotDto = {
      id: generateSnowflakeId(),
      content: editorState.getContent(),
      version: history.getVersion(),
      timestamp: new Date(),
      clientId,
    };

    this.editorSnapshots.set(editorId, snapshot);
    return snapshot;
  }

  getSnapshot(editorId: string): EditorSnapshotDto | undefined {
    return this.editorSnapshots.get(editorId);
  }

  setEditorMode(editorId: string, mode: CollaborationMode): void {
    const editorState = this.getEditorState(editorId);
    editorState.setMode(mode);
  }

  getEditorMode(editorId: string): CollaborationMode {
    const editorState = this.getEditorState(editorId);
    return editorState.getMode();
  }

  canApplyOperation(editorId: string): boolean {
    const editorState = this.getEditorState(editorId);
    const mode = editorState.getMode();
    return mode === CollaborationMode.ACTIVE;
  }

  scheduleCursorBroadcast(
    editorId: string,
    userId: string,
    cursor: CursorPositionDto | null,
    selection: SelectionDto | null,
    callback: (broadcast: CursorBroadcastDto) => Promise<void>,
  ): void {
    const timerId = `${editorId}:${userId}`;

    if (this.cursorBroadcastTimers.has(timerId)) {
      clearTimeout(this.cursorBroadcastTimers.get(timerId)!);
    }

    const timeoutId = setTimeout(async () => {
      const broadcast: CursorBroadcastDto = {
        id: generateSnowflakeId(),
        clientId: userId,
        cursor,
        selection,
        timestamp: new Date(),
      };

      try {
        await callback(broadcast);
      } catch (error) {
        console.error(`Failed to broadcast cursor for ${timerId}:`, error);
      }

      this.cursorBroadcastTimers.delete(timerId);
    }, CursorBroadcastInterval.DEFAULT_MS);

    this.cursorBroadcastTimers.set(timerId, timeoutId);
  }

  clearCursorBroadcast(editorId: string, userId: string): void {
    const timerId = `${editorId}:${userId}`;
    const timeoutId = this.cursorBroadcastTimers.get(timerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.cursorBroadcastTimers.delete(timerId);
    }
  }

  reset(editorId: string): void {
    const editorState = this.editorStates.get(editorId);
    if (editorState) {
      editorState.reset();
    }

    const history = this.operationHistories.get(editorId);
    if (history) {
      history.clear();
    }

    const tracker = this.cursorTrackers.get(editorId);
    if (tracker) {
      tracker.clearAllCursors();
    }

    this.editorSnapshots.delete(editorId);
    this.pendingOperations.delete(editorId);

    const timerId = `${editorId}:*`;
    for (const [key, timeout] of this.cursorBroadcastTimers.entries()) {
      if (key.startsWith(editorId)) {
        clearTimeout(timeout);
        this.cursorBroadcastTimers.delete(key);
      }
    }
  }

  private getEditorState(editorId: string): EditorState {
    const editorState = this.editorStates.get(editorId);
    if (!editorState) {
      throw new CollaborationDisabledError(`Editor ${editorId} not initialized`);
    }
    return editorState;
  }

  private getOperationHistoryPrivate(editorId: string): OperationHistory {
    const history = this.operationHistories.get(editorId);
    if (!history) {
      throw new CollaborationDisabledError(`Operation history for editor ${editorId} not found`);
    }
    return history;
  }

  private getCursorTracker(editorId: string): CursorTracker {
    const tracker = this.cursorTrackers.get(editorId);
    if (!tracker) {
      throw new CollaborationDisabledError(`Cursor tracker for editor ${editorId} not found`);
    }
    return tracker;
  }
}
