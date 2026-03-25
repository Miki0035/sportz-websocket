import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema } from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match.status.js";
import { desc } from "drizzle-orm";

const matchRouter = Router();

const MAX_LIMIT = 100;

// GET MATCHES - List matches with optional limit
matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid query', details: parsed.error.issues });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT)
    try {
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to list matches.' });

    }
})


// POST MATCH - Create a new match
matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
    }

    const { data: { startTime, endTime, homeScore, awayScore } } = parsed;

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime) || 'scheduled',
        }).returning();

        // boroadcast the newly created match to all connected WebSocket clients
        if (res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event)
        }

        return res.status(201).json({ data: event })
    } catch (error) {
        return res.status(500).json({ error: 'Failed to create match.' });
    }
})


// PATCH MATCH SCORE - Update the score of a match
matchRouter.patch("/:id/score", async (req, res) => {
    const matchId = Number(req.params.id);

    if (!Number.isInteger(matchId)) {
        return res.status(400).json({ error: "Invalid match ID" });
    }

    const { homeScore, awayScore } = req.body;

    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore)) {
        return res.status(400).json({ error: "homeScore and awayScore must be integers" });
    }

    try {
        const [updated] = await db
            .update(matches)
            .set({ homeScore, awayScore })
            .where(eq(matches.id, matchId))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "Match not found" });
        }

        res.status(200).json({ data: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update score" });
    }
});


export default matchRouter;