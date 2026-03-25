import AgentAPI from 'apminsight';
AgentAPI.config()

import express from 'express';
import matchRouter from './routes/matches.js';
import commentaryRouter from './routes/commentary.js';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';
// import { securityMiddleware } from './arcjet.js';
import 'dotenv/config';


if (!process.env.PORT) {
    throw new Error('PORT is not defined in .env file');
}

if (!process.env.HOST) {
    throw new Error('HOST is not defined in .env file');
}

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';


// express app
const app = express();
const server = http.createServer(app)

app.use(express.json());
// app.use(securityMiddleware());

// Routers
app.use("/api/matches", matchRouter);
app.use("/api/matches/:id/commentary", commentaryRouter);

// attch websocket server to the existing HTTP server
const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server)
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;


server.listen(PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server running at ${baseUrl}`);
    console.log(`WebSocket Server is running ${baseUrl.replace('http', 'ws')}/ws`);
});