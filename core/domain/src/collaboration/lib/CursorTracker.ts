import type { OperationDto, RemoteUserDto, CursorPositionDto, SelectionDto } from '../collaboration.schemas';

export class CursorTracker {
  private remoteUsers = new Map<string, RemoteUserDto>();

  addRemoteUser(user: RemoteUserDto): void {
    this.remoteUsers.set(user.id, { ...user });
  }

  removeRemoteUser(userId: string): void {
    this.remoteUsers.delete(userId);
  }

  updateRemoteUserCursor(userId: string, cursor: CursorPositionDto | null): void {
    const user = this.remoteUsers.get(userId);
    if (user) {
      user.cursor = cursor;
      user.lastSeen = new Date();
    }
  }

  updateRemoteUserSelection(userId: string, selection: SelectionDto | null): void {
    const user = this.remoteUsers.get(userId);
    if (user) {
      user.selection = selection;
      user.lastSeen = new Date();
    }
  }

  getRemoteUser(userId: string): RemoteUserDto | undefined {
    return this.remoteUsers.get(userId);
  }

  getAllRemoteUsers(): RemoteUserDto[] {
    return Array.from(this.remoteUsers.values());
  }

  getActiveRemoteUsers(): RemoteUserDto[] {
    return this.getAllRemoteUsers().filter((user) => user.isActive);
  }

  setUserActive(userId: string, isActive: boolean): void {
    const user = this.remoteUsers.get(userId);
    if (user) {
      user.isActive = isActive;
      user.lastSeen = new Date();
    }
  }

  transformCursorForOperation(cursor: CursorPositionDto, operation: OperationDto): CursorPositionDto {
    const line = cursor.line;
    const column = cursor.column;

    if (operation.type === 'insert') {
      if (line === 0 && column >= operation.position) {
        return {
          line,
          column: column + (operation.content?.length || 0),
        };
      }
      return cursor;
    }

    if (operation.type === 'delete') {
      const deleteEnd = operation.position + operation.length;
      if (line === 0 && column >= deleteEnd) {
        return {
          line,
          column: Math.max(operation.position, column - operation.length),
        };
      }
      if (line === 0 && column > operation.position && column < deleteEnd) {
        return {
          line,
          column: operation.position,
        };
      }
    }

    return cursor;
  }

  transformSelectionForOperation(
    selection: SelectionDto,
    operation: OperationDto,
  ): SelectionDto {
    return {
      start: this.transformCursorForOperation(selection.start, operation),
      end: this.transformCursorForOperation(selection.end, operation),
    };
  }

  clearAllCursors(): void {
    for (const user of this.remoteUsers.values()) {
      user.cursor = null;
      user.selection = null;
    }
  }

  getUserCount(): number {
    return this.remoteUsers.size;
  }

  hasUser(userId: string): boolean {
    return this.remoteUsers.has(userId);
  }
}
