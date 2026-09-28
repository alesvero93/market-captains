import { createServer } from 'node:http';
import { Server, ServerError, createEndpoint, createRouter } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ROOM_NAME, ARENA_ROOM_NAME } from '@liquidity/shared';
import { FoundationRoom } from './room.js';
import { ArenaRoom } from './arena-room.js';
import type { MarketSource } from './arena-room.js';
import { clientEndpoints, originGuard } from './client-assets.js';

export function createGameServer(options:{singlePlayer?:boolean;market?:MarketSource;botCount?:number;replayDirectory?:string;durationTicks?:number;clientDirectory?:string;publicOrigin?:string}={}) {
  const httpServer = createServer();
  const guard=options.publicOrigin?originGuard([options.publicOrigin]):()=>undefined;
  const server = new Server({transport: new WebSocketTransport({server: httpServer, maxPayload: 2048,beforeUpgrade:guard}),
    greet: false, gracefullyShutdown: false});
  server.router = createRouter({...options.clientDirectory?clientEndpoints(options.clientDirectory,options.publicOrigin??'http://127.0.0.1:2567'):{},market: createEndpoint('/api/market', {method:'GET'}, async () =>
    new Response(JSON.stringify(options.market?.frame()??null),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=30'}})),health: createEndpoint('/health', {method: 'GET'}, async () =>
    ({status: 'ok', milestone: 'M2-M5', marketMode: options.market?.frame().mode??'SYNTHETIC', cmcCalls: options.market?.stats?.().requests??0,
      budget:options.market?.stats?.()??null}))},{onRequest:guard,onResponse:async response=>{
        // Explicit lengths keep local browser forwarding and reverse proxies from waiting on chunked responses.
        if(options.clientDirectory&&response.body&&!response.headers.has('content-length'))response.headers.set('content-length',String((await response.clone().arrayBuffer()).byteLength));
        // Colyseus uses 52x application codes, which reverse proxies may treat as
        // upstream outages. Keep its JSON code but use a standard HTTP failure.
        return response.status>=520&&response.status<=529?new Response(response.body,{status:400,headers:response.headers}):response;
      }});
  if(!options.clientDirectory)server.define(ROOM_NAME, FoundationRoom);
  // Never merge untrusted matchmaking options into service or filesystem configuration.
  let activeRooms=0;
  class ConfiguredArena extends ArenaRoom {
    private counted=false;
    override onCreate():void {
      if(activeRooms>=8)throw new ServerError(503,'All arenas are busy. Please retry shortly.');
      super.onCreate(options);activeRooms++;this.counted=true;
    }
    override onDispose():void {super.onDispose();if(this.counted){activeRooms--;this.counted=false;}}
  }
  if(!options.singlePlayer)server.define(ARENA_ROOM_NAME,ConfiguredArena);
  return {server, httpServer};
}
