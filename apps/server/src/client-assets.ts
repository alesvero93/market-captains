import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { createEndpoint, type Endpoint } from '@colyseus/core';

/** Only the compiled index and explicitly enumerated assets are public. */
export function clientEndpoints(directory:string,origin:string):Record<string,Endpoint>{
  const files=new Map<string,{bytes:Uint8Array;type:string}>();
  const types:Record<string,string>={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
  const add=(name:string,type:string)=>{const file=path.join(directory,name);if(!lstatSync(file).isFile()||lstatSync(file).isSymbolicLink())throw Error('Invalid public asset');files.set(name,{bytes:new Uint8Array(readFileSync(file)),type});};
  add('index.html','text/html; charset=utf-8');
  if(lstatSync(path.join(directory,'assets')).isSymbolicLink())throw Error('Invalid assets directory');
  for(const entry of readdirSync(path.join(directory,'assets'),{withFileTypes:true})){
    const type=types[path.extname(entry.name)];if(entry.isFile()&&type&&/^[a-zA-Z0-9_.-]+$/.test(entry.name))add(`assets/${entry.name}`,type);
  }
  const websocketOrigin=origin.replace(/^http/,'ws');
  const serve=(name:string)=>{
    const file=files.get(name);if(!file)return new Response('Not found',{status:404});
    return new Response(file.bytes,{headers:{'Content-Type':file.type,'Content-Length':String(file.bytes.byteLength),'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${websocketOrigin}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
      'Cache-Control':name==='index.html'?'no-cache':'public, max-age=31536000, immutable'}});
  };
  return {index:createEndpoint('/',{method:'GET'},async()=>serve('index.html')),
    asset:createEndpoint('/assets/:file',{method:'GET'},async ctx=>serve(`assets/${ctx.params.file}`))};
}

export function originGuard(origins:readonly string[]){
  const allowed=new Set(origins.map(value=>{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.origin!==value)throw Error('Expected an exact HTTP(S) origin');return u.origin;}));
  return (request:Request):Response|undefined=>{const origin=request.headers.get('origin');return origin!==null&&!allowed.has(origin)?new Response('Origin not allowed',{status:403}):undefined;};
}
