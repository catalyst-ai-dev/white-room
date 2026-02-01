import type { OperationDto } from '../collaboration.schemas';
import { OperationTransformError } from '../collaboration.errors';

export interface TransformResult {
  transformed: OperationDto;
  inverseTransformed: OperationDto;
}

export class OTTransformer {
  static transform(op: OperationDto, against: OperationDto): OperationDto {
    try {
      if (op.type === 'insert' && against.type === 'insert') {
        return this.transformInsertInsert(op, against);
      }
      if (op.type === 'insert' && against.type === 'delete') {
        return this.transformInsertDelete(op, against);
      }
      if (op.type === 'delete' && against.type === 'insert') {
        return this.transformDeleteInsert(op, against);
      }
      if (op.type === 'delete' && against.type === 'delete') {
        return this.transformDeleteDelete(op, against);
      }
      return op;
    } catch (error) {
      throw new OperationTransformError(
        `Failed to transform operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  static transformAgainstMany(op: OperationDto, others: OperationDto[]): OperationDto {
    let result = op;
    for (const other of others) {
      result = this.transform(result, other);
    }
    return result;
  }

  private static transformInsertInsert(
    op: OperationDto,
    against: OperationDto,
  ): OperationDto {
    const opPos = op.position;
    const againstPos = against.position;

    if (opPos < againstPos) {
      return op;
    }
    if (opPos > againstPos) {
      return {
        ...op,
        position: opPos + (against.content?.length || 0),
      };
    }
    if (op.clientId < against.clientId) {
      return op;
    }
    return {
      ...op,
      position: opPos + (against.content?.length || 0),
    };
  }

  private static transformInsertDelete(
    op: OperationDto,
    against: OperationDto,
  ): OperationDto {
    const opPos = op.position;
    const againstStart = against.position;
    const againstEnd = against.position + against.length;

    if (opPos <= againstStart) {
      return op;
    }
    if (opPos >= againstEnd) {
      return {
        ...op,
        position: opPos - against.length,
      };
    }
    return {
      ...op,
      position: againstStart,
    };
  }

  private static transformDeleteInsert(
    op: OperationDto,
    against: OperationDto,
  ): OperationDto {
    const opStart = op.position;
    const opEnd = op.position + op.length;
    const againstPos = against.position;
    const insertLength = against.content?.length || 0;

    if (opEnd <= againstPos) {
      return op;
    }
    if (opStart >= againstPos) {
      return {
        ...op,
        position: opStart + insertLength,
      };
    }
    return {
      ...op,
      length: op.length + insertLength,
    };
  }

  private static transformDeleteDelete(
    op: OperationDto,
    against: OperationDto,
  ): OperationDto {
    const opStart = op.position;
    const opEnd = op.position + op.length;
    const againstStart = against.position;
    const againstEnd = against.position + against.length;

    if (opEnd <= againstStart) {
      return op;
    }
    if (opStart >= againstEnd) {
      return {
        ...op,
        position: opStart - against.length,
      };
    }
    if (opStart <= againstStart && opEnd >= againstEnd) {
      return {
        ...op,
        length: op.length - against.length,
      };
    }
    if (opStart >= againstStart && opEnd <= againstEnd) {
      return {
        ...op,
        position: againstStart,
        length: 0,
      };
    }
    if (opStart < againstStart && opEnd > againstStart) {
      return {
        ...op,
        length: op.length - (opEnd - againstStart),
      };
    }
    return {
      ...op,
      position: againstStart,
      length: op.length - (againstEnd - opStart),
    };
  }

  static compose(op1: OperationDto, op2: OperationDto): OperationDto {
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return {
          ...op1,
          content: op1.content + op2.content,
        };
      }
      if (op1.position >= op2.position + (op2.content?.length || 0)) {
        return {
          ...op1,
          position: op1.position - (op2.content?.length || 0),
          content: op1.content + op2.content,
        };
      }
      return op1;
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position === op2.position) {
        return {
          ...op1,
          length: op1.length + op2.length,
        };
      }
    }

    return op1;
  }
}
