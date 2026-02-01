export enum CursorBroadcastInterval {
  MIN_MS = 50,
  MAX_MS = 100,
  DEFAULT_MS = 75,
}

export enum OperationBatchSize {
  MIN = 1,
  MAX = 100,
  DEFAULT = 10,
}

export enum CollaborationMode {
  ACTIVE = 'active',
  READ_ONLY = 'read_only',
  DISCONNECTED = 'disconnected',
}

export enum RemoteEditApplyStrategy {
  TRANSFORM = 'transform',
  REBASE = 'rebase',
}
