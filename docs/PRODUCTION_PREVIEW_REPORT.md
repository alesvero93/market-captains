> Rapporto storico v0.7. Per il candidato aggiornato e Render Free vedere CRITICAL_REVIEW.md e HOSTING_AND_GITHUB.md.

# M7 — modalità di consegna compilata

Verifica del 27 settembre 2026. La demo locale ora può funzionare senza Vite: un solo processo serve i file compilati, le richieste di ingresso alle partite e il WebSocket sullo stesso indirizzo.

## Avvio riproducibile

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Aprire http://127.0.0.1:5173/. Prima fermare il vecchio `pnpm dev`, se attivo. `PORT` può cambiare la porta; `PUBLIC_ORIGIN` deve coincidere esattamente con l'origine del browser, senza slash finale. In assenza di configurazione viene usato http://127.0.0.1:5173. La chiave rimane in apps/server/.env.local, letta solo dal backend.

Il server rimane vincolato a 127.0.0.1. Questo avvio non pubblica la demo in Internet. Per una pubblicazione successiva occorrono un reverse proxy HTTPS/WebSocket, PUBLIC_ORIGIN con il dominio effettivo, volume persistente per .data e revisione dei controlli di ammissione/abuso. Non avviare due collector CMC né copiare il progetto con un contatore nuovo durante lo stesso periodo.

## Verifiche eseguite

- 40 test passati: compilazione, simulazione, economia, riconnessione, quote Basic, archivio e distribuzione.
- Pagina compilata e partita Colyseus servite dallo stesso server; nessuna risorsa Vite richiesta.
- Sono pubblici soltanto index.html e gli asset compilati enumerati all'avvio. .env.local, .data, sorgenti, percorsi di risalita e asset inesistenti restituiscono 404.
- Origini estranee respinte con 403 sia per le richieste HTTP sia per l'upgrade WebSocket. I client senza Origin sono ammessi: questo filtro protegge dai browser di altri siti, non costituisce autenticazione o protezione anti-abuso completa.
- Header di sicurezza, policy sui contenuti e cache per gli asset compilati.
- Content-Length esplicito per risorse e risposte del router. Senza tale header il browser integrato rimaneva in attesa su alcune risposte chunked; la correzione è stata verificata nel browser.
- Arena verificata visivamente: Connesso, LIVE, quattro bot, raccolta e classifica. La volatilità ha completato il riscaldamento con campioni reali.

Cache, contatore API e chiave sono stati mantenuti durante il passaggio. Nessun contatore azzerato e nessuna pubblicazione eseguita. La cattura LIQUIDITY_IO_RELEASE_LIVE.png negli outputs mostra la versione compilata in esecuzione.

## Stato della candidatura

Completata la modalità locale di consegna. M7 complessiva rimane aperta: playtest umano, hosting pubblico, repository pubblico, video e invio DoraHacks/social restano da eseguire. Il pacchetto sorgente richiede installazione e build; non contiene dipendenze, file privati o processi già avviati.
