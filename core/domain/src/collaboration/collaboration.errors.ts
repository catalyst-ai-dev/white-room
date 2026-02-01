import { BadRequestError, NotFoundError } from '@namespace/shared';

export class OperationTransformError extends BadRequestError {
  constructor(message = 'Failed to transform operation') {
    super(message);
  }
}

export class OperationNotFoundError extends NotFoundError {
  constructor(message = 'Operation not found') {
    super(message);
  }
}

export class OperationApplyError extends BadRequestError {
  constructor(message = 'Failed to apply operation') {
    super(message);
  }
}

export class VersionConflictError extends BadRequestError {
  constructor(message = 'Operation version conflict') {
    super(message);
  }
}

export class EditorSnapshotNotFoundError extends NotFoundError {
  constructor(message = 'Editor snapshot not found') {
    super(message);
  }
}

export class InvalidCursorPositionError extends BadRequestError {
  constructor(message = 'Invalid cursor position') {
    super(message);
  }
}

export class CollaborationDisabledError extends BadRequestError {
  constructor(message = 'Collaboration is disabled or not available') {
    super(message);
  }
}

export class OperationBatchValidationError extends BadRequestError {
  constructor(message = 'Operation batch validation failed') {
    super(message);
  }
}
