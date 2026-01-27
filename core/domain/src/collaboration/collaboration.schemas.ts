import { z } from 'zod';

export const WebSocketMessageSchema = z.object({
  type: z.enum(['operation', 'heartbeat', 'subscribe', 'unsubscribe']),
  sessionId: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.number().optional(),
});

export type WebSocketMessageDto = z.infer<typeof WebSocketMessageSchema>;

export const OperationMessageSchema = z.object({
  type: z.literal('operation'),
  sessionId: z.string().min(1),
  payload: z.object({
    documentId: z.string().min(1),
    operation: z.record(z.unknown()),
    version: z.number().int().positive(),
  }),
  timestamp: z.number().optional(),
});

export type OperationMessageDto = z.infer<typeof OperationMessageSchema>;

export const HeartbeatMessageSchema = z.object({
  type: z.literal('heartbeat'),
  sessionId: z.string().min(1),
  timestamp: z.number().optional(),
});

export type HeartbeatMessageDto = z.infer<typeof HeartbeatMessageSchema>;

export const SubscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  sessionId: z.string().min(1),
  payload: z.object({
    documentId: z.string().min(1),
  }),
  timestamp: z.number().optional(),
});

export type SubscribeMessageDto = z.infer<typeof SubscribeMessageSchema>;

export const UnsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  sessionId: z.string().min(1),
  payload: z.object({
    documentId: z.string().min(1),
  }),
  timestamp: z.number().optional(),
});

export type UnsubscribeMessageDto = z.infer<typeof UnsubscribeMessageSchema>;

export const ClientSessionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  subscribedDocuments: z.array(z.string()),
  lastActivityTime: z.number(),
});

export type ClientSessionDto = z.infer<typeof ClientSessionSchema>;

export const BroadcastMessageSchema = z.object({
  type: z.enum(['operation', 'notification']),
  documentId: z.string().min(1),
  data: z.record(z.unknown()),
  excludeSessionId: z.string().optional(),
  timestamp: z.number(),
});

export type BroadcastMessageDto = z.infer<typeof BroadcastMessageSchema>;
