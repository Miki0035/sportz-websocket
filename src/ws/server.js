import { WebSocket, WebSocketServer } from "ws"
// import { wsArcjet } from "../arcjet.js";

//!TODO implement webscocket with dependncy injection pattern or event emitter


const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;

    subscribers.delete(socket);

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

function cleanUpSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function handleMessage(socket, data) {
    let message;
    try {
        message = JSON.parse(data.toString());
    } catch (error) {
        sendJson(socket, { type: 'error', error: 'Invalid JSON' })
    }

    if (message.type === 'subscribe' && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, { type: 'subscribed', matchId: message.matchId })
        return;
    }

    if (message.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, { type: 'unsubscribed', matchId: message.matchId })
        return;
    }
}

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload))
}


function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload))
    }
}

export function attachWebSocketServer(server) {
    // Attach WebSocket server to the existing REST Express HTTP server
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024, // 1MB max payload size
    });

    server.on('upgrade', async (req, socket, head) => {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);

        if (pathname !== '/ws') {
            return;
        }

        // if (wsArcjet) {
        //     try {
        //         const decision = await wsArcjet.protect(req);

        //         if (decision.isDenied()) {
        //             if (decision.reason.isRateLimit()) {
        //                 socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        //             } else {
        //                 socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        //             }
        //             socket.destroy();
        //             return;
        //         }
        //     } catch (e) {
        //         console.error('WS upgrade protection error', e);
        //         socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        //         socket.destroy();
        //         return;
        //     }
        // }

        // wss.handleUpgrade(req, socket, head, (ws) => {
        //     wss.emit('connection', ws, req);
        // });
    });



    wss.on("connection", async (socket, req) => {
        // if (wsArcjet) {
        //     try {
        //         const decision = await wsArcjet.protect(req)
        //         if (decision.isDenied()) {
        //             const code = decision.reason.isRateLimit() ? 1013 : 1008; // Custom close codes for rate limit and forbidden
        //             const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';
        //             socket.close(code, reason)
        //         }
        //     } catch (error) {
        //         console.error('WS connection error')
        //         socket.close(1011, 'Server security error') // 1011 indicates an unexpected condition prevented the request from being fulfilled
        //     }
        // }
        socket.isAlive = true;
        socket.on("pong", () => {
            socket.isAlive = true;
        });
        socket.subscriptions = new Set();
        sendJson(socket, { type: 'Welcome' })
        socket.on("message", (data) => handleMessage(socket, data))
        socket.on("error", () => socket.terminate())
        socket.on("close", (socket) => cleanUpSubscriptions(socket))
    });

    const interval = setInterval(() => {
        wss.clients.forEach((client) => {
            if (client.isAlive === false) {
                return client.terminate();
            }
            client.isAlive = false;
            client.ping()
        })
    }, 30000)

    wss.on("close", () => clearInterval(interval))

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, { type: 'match_created', data: match })
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, { type: 'commentary', data: comment })
    }

    return {
        broadcastMatchCreated,
        broadcastCommentary
    }
}