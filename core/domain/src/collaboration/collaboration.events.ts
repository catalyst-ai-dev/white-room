import type { OperationDto, CursorBroadcastDto } from './collaboration.schemas';
import { DomainEvent } from '@domain/lib/EventBus';

interface OperationAppliedEventData {
  editorId: string;
  operationId: string;
  clientId: string;
  version: number;
  timestamp: Date;
}

interface CursorUpdatedEventData {
  editorId: string;
  clientId: string;
  cursor: CursorBroadcastDto;
}

interface OperationBatchReceivedEventData {
  editorId: string;
  batchId: string;
  clientId: string;
  operationCount: number;
  baseVersion: number;
}

interface RemoteUserConnectedEventData {
  editorId: string;
  userId: string;
  userName: string;
  color: string;
}

interface RemoteUserDisconnectedEventData {
  editorId: string;
  userId: string;
}

interface OperationConflictEventData {
  editorId: string;
  operationId: string;
  conflictingOperationId: string;
  resolvedUsing: 'transform' | 'rebase';
}

export class OperationAppliedEvent extends DomainEvent<OperationAppliedEventData> {
  readonly type = 'OperationApplied';

  constructor(public readonly payload: OperationAppliedEventData) {
    super(payload);
  }
}

export class CursorUpdatedEvent extends DomainEvent<CursorUpdatedEventData> {
  readonly type = 'CursorUpdated';

  constructor(public readonly payload: CursorUpdatedEventData) {
    super(payload);
  }
}

export class OperationBatchReceivedEvent extends DomainEvent<OperationBatchReceivedEventData> {
  readonly type = 'OperationBatchReceived';

  constructor(public readonly payload: OperationBatchReceivedEventData) {
    super(payload);
  }
}

export class RemoteUserConnectedEvent extends DomainEvent<RemoteUserConnectedEventData> {
  readonly type = 'RemoteUserConnected';

  constructor(public readonly payload: RemoteUserConnectedEventData) {
    super(payload);
  }
}

export class RemoteUserDisconnectedEvent extends DomainEvent<RemoteUserDisconnectedEventData> {
  readonly type = 'RemoteUserDisconnected';

  constructor(public readonly payload: RemoteUserDisconnectedEventData) {
    super(payload);
  }
}

export class OperationConflictEvent extends DomainEvent<OperationConflictEventData> {
  readonly type = 'OperationConflict';

  constructor(public readonly payload: OperationConflictEventData) {
    super(payload);
  }
}
