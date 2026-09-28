# Pubblicazione guidata: GitHub Desktop e Render Free

Stato: configurazione pronta da verificare in cloud, nessun URL pubblico ancora generato.

## 1. Repository

In GitHub Desktop: File → Add local repository → scegliere la cartella outputs/liquidity-io. Se non è ancora un repository, usare il collegamento per crearlo lì. Verificare la lista dei file: .env.local, .data, node_modules, dist, docs/handoff e archivi ZIP devono essere assenti. Il controllo `node scripts/submission-check.mjs` rifiuta una chiave locale copiata nei sorgenti. Non fare screenshot della chiave.

Creare il commit dopo la revisione. Publish repository → nome liquidity-io → pubblico (necessario per la candidatura). Questo passaggio è da svolgere insieme all'utente, non è già stato eseguito.

## 2. Hosting indipendente

Render: creare un Web Service dal repository pubblico. Impostazioni presenti anche in render.yaml:

- Runtime Node, regione Frankfurt, piano **Free**, una sola istanza.
- Build: `npx --yes pnpm@11.19.0 install --frozen-lockfile --prod=false && npx --yes pnpm@11.19.0 build`.
- Start: `node scripts/start.mjs`.
- Node 24.19.0, HOST=0.0.0.0, DATA_DIR=/tmp/liquidity-io, RECORD_REPLAYS=0.
- Inserire CMC_API_KEY solo come secret del servizio. Non nel repository o nel frontend.
- PORT e RENDER_EXTERNAL_URL sono forniti dal servizio; quest'ultimo determina la policy delle origini HTTP e WebSocket.
- Prima di attivare la chiave in cloud, fermare il collector locale: tutte le arene devono condividere un unico collector.

I [WebSocket sono supportati](https://render.com/docs/websocket). Il [piano gratuito](https://render.com/docs/free) può sospendersi dopo 15 minuti di inattività e ripartire in circa un minuto. I file locali sono effimeri: al riavvio la volatilità deve riscaldarsi di nuovo. Il collector legge prima le quote account, così la perdita del contatore locale non ripristina l'allowance dell'account. Non usare repliche o altre applicazioni con la stessa chiave senza rivedere il coordinamento.

Non aggiungere una carta o un upgrade a pagamento per questo test. Controllare le quote mensili di servizio e traffico nel dashboard. Nessun trucco di keep-alive per aggirare la sospensione del piano.

## 3. Verifica prima di condividere

Aprire il dominio HTTPS da due dispositivi. Entrare con nomi diversi; INVITA UN AMICO genera il link della stessa stanza. L'invito scade con la stanza e non entra in una stanza piena. Verificare LONG/SHORT, deposito automatico, respawn, riconnessione e fine partita. Riavvio/cold start distruggono le partite in memoria: nessun punteggio persistente tra partite è promesso.

La candidatura deve includere anche un video accessibile: non dipendere solo dal cold start della demo. Compilare submission.json soltanto con URL effettivamente creati e verificati.
