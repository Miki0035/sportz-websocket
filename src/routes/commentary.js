import { Router } from 'express';
import { db } from '../db/db.js'; // Adjust path as needed
import { commentary } from '../db/schema.js'; // Adjust path as needed
import { createCommentrySchema, listCommentryQuerySchema } from '../validation/commentary.js';
import { matchIdParamSchema } from '../validation/matches.js'; // Adjust path as needed

import { eq, desc } from 'drizzle-orm';

const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get(
    '/',
    async (req, res) => {
        const paramsResult = matchIdParamSchema.safeParse(req.params);
        if (!paramsResult.success) {
            return res.status(400).json({ error: 'Invalid match ID', details: paramsResult.error.issues });
        }

        const queryResult = listCommentryQuerySchema.safeParse(req.query);
        if (!queryResult.success) {
            return res.status(400).json({ error: 'Invalid query params', details: queryResult.error.issues });
        }

        try {
            const MAX_LIMIT = 100;
            const { id: matchId } = paramsResult.data
            const { limit = 10 } = queryResult.data
            const safeLmit = Math.min(limit, MAX_LIMIT);

            const rows = await db
                .select()
                .from(commentary)
                .where(eq(commentary.matchId, matchId))
                .orderBy(desc(commentary.createdAt))
                .limit(safeLmit);

            return res.status(200).json({ data: rows });
        } catch (error) {
            return res.status(500).json({ error: 'Internal server error', details: error?.message });
        }
    }
);


commentaryRouter.post(
    '/',
    async (req, res) => {
        const paramsResult = matchIdParamSchema.safeParse(req.params);

        if (!paramsResult.success) {
            return res.status(400).json({ error: 'Invalid match ID', details: paramsResult.error.issues });
        }

        const bodyResult = createCommentrySchema.safeParse(req.body);

        if (!bodyResult.success) {
            return res.status(400).json({ error: 'Invalid commentary data', details: bodyResult.error.issues });
        }

        try {
            const { minutes, ...rest } = bodyResult.data;

            // Insert into commentary table
            const [result] = await db
                .insert(commentary)
                .values({ matchId: paramsResult.data.id, minute: minutes, ...rest })
                .returning();

            return res.status(201).json({ data: result });
        } catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

export default commentaryRouter;