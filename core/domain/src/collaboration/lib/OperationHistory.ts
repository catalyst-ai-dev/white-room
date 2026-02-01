import type { OperationDto } from '../collaboration.schemas';
import { OperationNotFoundError } from '../collaboration.errors';

export interface HistorySnapshot {
  operations: OperationDto[];
  version: number;
  timestamp: Date;
}

export class OperationHistory {
  private operations: OperationDto[] = [];
  private version = 0;

  addOperation(operation: OperationDto): void {
    this.operations.push(operation);
    this.version = Math.max(this.version, operation.version + 1);
  }

  addOperations(ops: OperationDto[]): void {
    for (const op of ops) {
      this.addOperation(op);
    }
  }

  getOperationAt(index: number): OperationDto {
    if (index < 0 || index >= this.operations.length) {
      throw new OperationNotFoundError(`Operation at index ${index} not found`);
    }
    return this.operations[index];
  }

  getOperationById(id: string): OperationDto | undefined {
    return this.operations.find((op) => op.id === id);
  }

  getOperationsSince(version: number): OperationDto[] {
    return this.operations.filter((op) => op.version >= version);
  }

  getOperationsBetween(startVersion: number, endVersion: number): OperationDto[] {
    return this.operations.filter((op) => op.version >= startVersion && op.version < endVersion);
  }

  getOperationsByClient(clientId: string): OperationDto[] {
    return this.operations.filter((op) => op.clientId === clientId);
  }

  getAllOperations(): OperationDto[] {
    return [...this.operations];
  }

  getVersion(): number {
    return this.version;
  }

  getSnapshot(): HistorySnapshot {
    return {
      operations: this.getAllOperations(),
      version: this.version,
      timestamp: new Date(),
    };
  }

  clear(): void {
    this.operations = [];
    this.version = 0;
  }

  size(): number {
    return this.operations.length;
  }

  isEmpty(): boolean {
    return this.operations.length === 0;
  }

  hasOperation(id: string): boolean {
    return this.operations.some((op) => op.id === id);
  }

  rebase(fromVersion: number, toVersion: number, newOperations: OperationDto[]): void {
    const keepOperations = this.operations.filter((op) => op.version < fromVersion);
    this.operations = [...keepOperations, ...newOperations];
    this.version = toVersion;
  }
}
