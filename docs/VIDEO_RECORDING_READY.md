# Video candidato — scaletta pronta (circa 2 minuti)

Questo è un copione da registrare, non un video già prodotto. Non mostrare .env.local, dashboard delle chiavi o impostazioni dei secret. Registrare la finestra del gioco; per la prova API aprire esclusivamente docs/evidence/CMC_QUOTE_EVIDENCE.json e apps/server/src/market/service.ts. La risposta esportata è un campione reale con timestamp, non una promessa di quotazione corrente.

## Prima di registrare

Aprire la demo locale, scegliere due personaggi con nomi diversi in due finestre. Dal primo usare INVITE A FRIEND e aprire quel link nel secondo. Il secondo deve mostrare lo stesso tempo residuo e gli stessi nomi in classifica. Chiudere tab di vecchie partite. Attendere LIVE; se compare volatilità in riscaldamento, dirlo oppure attendere quattro campioni complessivi. Non sostituire SYNTHETIC con una scritta LIVE.

## Riprese e testo parlato in inglese

**0:00–0:15 — Schermata iniziale, scelta avatar, ingresso.**

“Market Captains turns a shared market snapshot into an arcade universe. Bitcoin is the central sun; Ethereum orbits it, with three to five smaller crypto planets. Players collect fragments and protect their score in a wallet.”

**0:15–0:40 — Aprire ‘How the market changes the map’ e confrontare due nodi.**

“Market capitalization controls field strength and compressed planet size. Volume changes the distribution of fragments. One-hour momentum controls the current. Near a rising planet, LONG pushes outward and SHORT reverses that current. Gravity remains. These are game forces, not trading positions or price predictions.”

Mostrare Q vicino all'alone. Se il momentum è quasi zero, scegliere un altro nodo e spiegare che una variazione debole produce una corrente debole. Non fingere un effetto che il dato non supporta.

**0:40–1:00 — Raccogliere e fermarsi nel wallet.**

“Cargo is at risk and makes movement heavier. Stand still in a wallet for three seconds to secure it. Your character grows as the wallet fills. A pulse or collision can interrupt a deposit; elimination loses cargo but preserves the wallet.”

**1:00–1:20 — Passare al secondo client, mostrare nomi e classifica. Riprendere l’hacker quando appare; non fingere che sia sempre presente.**

“Each arena has at most ten characters. Bots yield their places to human players. A slow red hacker makes two timed visits, draining carried cargo on contact while wallet balances stay safe. The server owns movement, collection and scores; invitation links bring friends into the same match.”

**1:20–1:45 — Codice della chiamata, risposta sanificata e timestamp.**

“One server-side collector batches ten assets in USD every five minutes. Every arena shares that data. The game uses quotes/latest and key/info, with a conservative ceiling below the Basic plan. The key never reaches the browser. Stale data is labelled, and volatility needs a warm-up period.”

**1:45–2:00 — Tornare al gioco, mostrare esito test e conclusione.**

“The candidate passes 55 automated tests, including room limits, real client connections, replay and API budgets. Market Captains is a playful visualization of market relationships. Thank you for trying it.”

## Controllo del file registrato

- Leggibilità di HUD, indicatori e timestamp; audio chiaro, nessuna notifica privata.
- Nessuna chiave API visibile, nemmeno in un singolo fotogramma.
- Dimostrazione autentica di due client e del dato CMC; nessuna dichiarazione di playtest umano già superato.
- Se il video è registrato in locale, dirlo nella descrizione; aggiungere il link del deploy solo dopo la pubblicazione.
- Aprire il file esportato e controllare inizio, centro e fine. Poi caricarlo su un indirizzo accessibile ai giudici, ancora da scegliere con l'utente.

Ordine concordato: completamento locale e registrazione → repository con GitHub Desktop insieme all'utente → Render come ultimo passaggio tecnico → aggiornamento degli URL e candidatura.
