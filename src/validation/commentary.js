import { z } from "zod";

// 1. listCommentryQuerySchema
export const listCommentryQuerySchema = z.object({
    limit: z.coerce.number().positive().max(100).optional(),
});

// 2. createCommentrySchema
export const createCommentrySchema = z.object({
    minutes: z.number().int().nonnegative(),
    sequence: z.number().int(),
    period: z.string(),
    eventType: z.string(),
    actor: z.string(),
    team: z.string(),
    message: z.string().min(1, "Message is required"),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()),
});