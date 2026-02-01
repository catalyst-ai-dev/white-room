import { z } from 'zod';
import { CollaborationMode, RemoteEditApplyStrategy } from './collaboration.constants';

export const OperationSchema = z.object({
  id: z.string(),
  type: z.enum(['insert', 'delete']),
  position: z.number().int().nonnegative(),
  content: z.string().nullable(),
  length: z.number().int().nonnegative(),
  clientId: z.string(),
  timestamp: z.coerce.date(),
  version: z.number().int().nonnegative(),
});

export const CursorPositionSchema = z.object({
  line: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
});

export const SelectionSchema = z.object({
  start: CursorPositionSchema,
  end: CursorPositionSchema,
});

export const RemoteUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  cursor: CursorPositionSchema.nullable(),
  selection: SelectionSchema.nullable(),
  isActive: z.boolean().default(true),
  lastSeen: z.coerce.date(),
});

export const CollaborationStateSchema = z.object({
  mode: z.nativeEnum(CollaborationMode),
  isPending: z.boolean().default(false),
  isConnected: z.boolean().default(false),
  error: z.string().nullable().default(null),
  currentVersion: z.number().int().nonnegative().default(0),
});

export const EditorSnapshotSchema = z.object({
  id: z.string(),
  content: z.string(),
  version: z.number().int().nonnegative(),
  timestamp: z.coerce.date(),
  clientId: z.string(),
});

export const OperationBatchSchema = z.object({
  id: z.string(),
  operations: z.array(OperationSchema),
  clientId: z.string(),
  timestamp: z.coerce.date(),
  baseVersion: z.number().int().nonnegative(),
});

export const CursorBroadcastSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  cursor: CursorPositionSchema.nullable(),
  selection: SelectionSchema.nullable(),
  timestamp: z.coerce.date(),
});

export type OperationDto = z.infer<typeof OperationSchema>;
export type CursorPositionDto = z.infer<typeof CursorPositionSchema>;
export type SelectionDto = z.infer<typeof SelectionSchema>;
export type RemoteUserDto = z.infer<typeof RemoteUserSchema>;
export type CollaborationStateDto = z.infer<typeof CollaborationStateSchema>;
export type EditorSnapshotDto = z.infer<typeof EditorSnapshotSchema>;
export type OperationBatchDto = z.infer<typeof OperationBatchSchema>;
export type CursorBroadcastDto = z.infer<typeof CursorBroadcastSchema>;
