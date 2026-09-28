import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decodeQuotes, creditCount, statusError } from '../apps/server/dist/market/normalize.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const raw=JSON.parse(readFileSync(path.join(root,'.data/cmc-evidence.json'),'utf8'));
if(raw.endpoint!=='/v3/cryptocurrency/quotes/latest'||!Number.isFinite(raw.receivedAt)||statusError(raw.response))throw Error('Successful live evidence required');
const quotes=decodeQuotes(raw.response,raw.receivedAt);
// Explicit market-data allowlist. No raw account response, headers, key, request IDs or identity.
const safe={endpoint:raw.endpoint,receivedAt:new Date(raw.receivedAt).toISOString(),conversion:'USD',
  reportedCredits:creditCount(raw.response)??null,
  assets:quotes.map(q=>({id:q.id,price:q.price,marketCap:q.marketCap,volume24h:q.volume,percentChange1h:q.change1h,sourceTime:new Date(q.sourceTime).toISOString()}))};
const destination=path.join(root,'docs/evidence');mkdirSync(destination,{recursive:true});
writeFileSync(path.join(destination,'CMC_QUOTE_EVIDENCE.json'),JSON.stringify(safe,null,2)+'\n');
writeFileSync(path.join(destination,'README.md'),`# CMC authenticated quote evidence\n\nCaptured: ${safe.receivedAt}.\n\nThe running server requested ${quotes.length} fixed IDs with one USD conversion through ${safe.endpoint}. Provider-reported cost: ${safe.reportedCredits??'unavailable'} credits. The JSON is a whitelisted extract of the actual response; full raw evidence remains in ignored local storage. No credentials or account identity are included.\n\nRequest and reservation code: apps/server/src/market/service.ts. Response validation and mapping: apps/server/src/market/normalize.ts. This sample proves a successful request at capture time, not continuous uptime or all endpoint entitlements.\n`);
console.log(`Exported ${quotes.length} verified quote records; reported credits=${safe.reportedCredits}; no account or credential fields.`);
