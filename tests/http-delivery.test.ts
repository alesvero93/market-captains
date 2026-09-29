import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const serverRequire=createRequire(new URL('../apps/server/package.json',import.meta.url));
const coreRequire=createRequire(serverRequire.resolve('@colyseus/core'));
const {setResponse}=await import(pathToFileURL(coreRequire.resolve('@colyseus/better-call/node')).href);

for(const streamed of [false,true])test(`HTTP adapter completes ${streamed?'multi-chunk streams':'large assets under backpressure'}`,async()=>{
 const bytes=Buffer.alloc(512*1024,77);
 const server=createServer((_req,res)=>{
  const body=streamed?new ReadableStream({start(controller){controller.enqueue(bytes.subarray(0,12));controller.enqueue(bytes.subarray(12));controller.close();}}):bytes;
  void setResponse(res,new Response(body));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 try{const response=await fetch(`http://127.0.0.1:${address.port}`,{signal:AbortSignal.timeout(2000)});assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
