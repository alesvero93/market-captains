import { createGameServer } from './server.js';
import { MarketService } from './market/service.js';
import path from 'node:path';
const port = Number(process.env.PORT ?? 2567);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const dataDirectory=path.resolve(process.env.DATA_DIR??'.data');
const serveClient=process.env.SERVE_CLIENT==='1';
const publicOrigin=process.env.PUBLIC_ORIGIN??process.env.RENDER_EXTERNAL_URL??`http://127.0.0.1:${port}`;
const market=new MarketService(dataDirectory,process.env.CMC_API_KEY??'');
const {server} = createGameServer({singlePlayer:true,market,...(process.env.RECORD_REPLAYS==='1'?{replayDirectory:path.join(dataDirectory,'replays')}:{}),
  ...(serveClient?{clientDirectory:path.resolve('apps/client/dist'),publicOrigin}:{})});
await server.listen(port, process.env.HOST??'127.0.0.1');
market.start();
console.log(`MARKET CAPTAINS arena: http://127.0.0.1:${port} (${market.frame().mode})`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { market.stop();void server.gracefullyShutdown(false).then(() => process.exit(0)); });
}
