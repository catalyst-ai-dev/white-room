import { NamespaceError } from '@namespace/shared';

export class WebSocketAuthenticationError extends NamespaceError {
  constructor(message = 'WebSocket authentication failed') {
    super({
      name: 'WebSocketAuthenticationError',
      message,
      statusCode: 401,
    });
  }
}

export class SessionNotFoundError extends NamespaceError {
  constructor(sessionId: string) {
    super({
      name: 'SessionNotFoundError',
      message: `Session '${sessionId}' not found`,
      statusCode: 404,
    });
  }
}

export class InvalidMessageError extends NamespaceError {
  constructor(message = 'Invalid message format') {
    super({
      name: 'InvalidMessageError',
      message,
      statusCode: 400,
    });
  }
}

export class RateLimitError extends NamespaceError {
  constructor(message = 'Rate limit exceeded') {
    super({
      name: 'RateLimitError',
      message,
      statusCode: 429,
    });
  }
}

export class OperationDeniedError extends NamespaceError {
  constructor(message = 'Operation denied') {
    super({
      name: 'OperationDeniedError',
      message,
      statusCode: 403,
    });
  }
}
