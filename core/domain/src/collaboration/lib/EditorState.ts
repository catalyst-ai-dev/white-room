import type { OperationDto } from '../collaboration.schemas';
import { CollaborationMode } from '../collaboration.constants';
import { OperationApplyError, InvalidCursorPositionError } from '../collaboration.errors';

export class EditorState {
  private content: string = '';
  private operations: OperationDto[] = [];
  private undoStack: OperationDto[] = [];
  private redoStack: OperationDto[] = [];
  private version: number = 0;
  private mode: CollaborationMode = CollaborationMode.ACTIVE;
  private isTransforming: boolean = false;

  constructor(initialContent: string = '') {
    this.content = initialContent;
  }

  applyOperation(operation: OperationDto): string {
    if (this.mode === CollaborationMode.DISCONNECTED) {
      throw new OperationApplyError('Cannot apply operations in disconnected mode');
    }

    if (operation.type === 'insert') {
      if (operation.position < 0 || operation.position > this.content.length) {
        throw new InvalidCursorPositionError(
          `Invalid insert position ${operation.position}, content length: ${this.content.length}`,
        );
      }
      if (!operation.content) {
        throw new OperationApplyError('Insert operation must have content');
      }
      this.content =
        this.content.slice(0, operation.position) +
        operation.content +
        this.content.slice(operation.position);
    } else if (operation.type === 'delete') {
      const deleteEnd = operation.position + operation.length;
      if (operation.position < 0 || deleteEnd > this.content.length) {
        throw new InvalidCursorPositionError(
          `Invalid delete range [${operation.position}, ${deleteEnd}], content length: ${this.content.length}`,
        );
      }
      this.content =
        this.content.slice(0, operation.position) + this.content.slice(deleteEnd);
    } else {
      throw new OperationApplyError(`Unknown operation type: ${operation.type}`);
    }

    this.operations.push(operation);
    this.version = Math.max(this.version, operation.version + 1);
    this.redoStack = [];

    return this.content;
  }

  applyOperations(operations: OperationDto[]): string {
    for (const op of operations) {
      this.applyOperation(op);
    }
    return this.content;
  }

  getContent(): string {
    return this.content;
  }

  setContent(content: string): void {
    this.content = content;
    this.operations = [];
    this.undoStack = [];
    this.redoStack = [];
    this.version = 0;
  }

  getVersion(): number {
    return this.version;
  }

  getOperations(): OperationDto[] {
    return [...this.operations];
  }

  setMode(mode: CollaborationMode): void {
    this.mode = mode;
  }

  getMode(): CollaborationMode {
    return this.mode;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  pushToUndoStack(operation: OperationDto): void {
    this.undoStack.push(operation);
  }

  pushToRedoStack(operation: OperationDto): void {
    this.redoStack.push(operation);
  }

  popUndoStack(): OperationDto | undefined {
    return this.undoStack.pop();
  }

  popRedoStack(): OperationDto | undefined {
    return this.redoStack.pop();
  }

  clearUndoStack(): void {
    this.undoStack = [];
  }

  clearRedoStack(): void {
    this.redoStack = [];
  }

  setIsTransforming(isTransforming: boolean): void {
    this.isTransforming = isTransforming;
  }

  getIsTransforming(): boolean {
    return this.isTransforming;
  }

  getContentLength(): number {
    return this.content.length;
  }

  getContentAt(start: number, length: number): string {
    return this.content.slice(start, start + length);
  }

  reset(): void {
    this.content = '';
    this.operations = [];
    this.undoStack = [];
    this.redoStack = [];
    this.version = 0;
    this.mode = CollaborationMode.ACTIVE;
    this.isTransforming = false;
  }
}
