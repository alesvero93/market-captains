// Same compiled build for client and server, one HTTP/WebSocket origin, no Vite.
process.env.SERVE_CLIENT='1';
process.env.PORT??='5173';
await import('../apps/server/dist/index.js');
