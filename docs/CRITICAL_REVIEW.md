# Revisione critica — 27 settembre 2026

Richiesta: debug, verifica candidatura, 10 personaggi totali, bot sostituibili, nuova mappa, wallet e hosting gratuito indipendente. Non esiste una skill killcritic installata; questa è una revisione diretta. Nessuna garanzia di perfezione.

## Correzioni implementate

| Problema | Correzione / verifica |
|---|---|
| 12 persone + 4 bot | Limite server e simulazione 10 totali. I bot cedono posti; undicesima persona in altra arena. Test con connessioni SDK reali. |
| Nessun ingresso personalizzato | Nome filtrato e limitato a 16 caratteri sul server, 10 avatar originali, stessa abilità per tutti. |
| Troppi nodi e layout identico | Sei nodi: BTC centrale, ETH in orbita deterministica di 180 secondi, quattro estratti per partita da un insieme verificato nella top 20. Seed server casuale, registrabile nei replay. |
| Dimensioni dominanti | Dimensione compressa e limitata; BTC 66, ETH 45, altri al massimo 37 unità. La capitalizzazione influenza forza e dimensioni senza scala realistica. |
| LONG / SHORT incomprensibili | Q alterna le due modalità. Indicatore del nodo vicino, direzione della corrente e frecce. LONG respinge sui nodi in salita; SHORT inverte. Gravità separata. Non sono posizioni finanziarie. |
| Deposito troppo macchinoso | Wallet automatico dopo tre secondi da fermo. Movimento, boost, impulso o contatto interrompono il deposito. |
| Wallet fuori dalla chiusura finale | Un wallet rimane interamente entro il cerchio finale. Test su tutta la partita. |
| Personaggi più grossi incoerenti con i pianeti | Crescita dal wallet limitata a 16 unità aggiuntive più massimo 4 dal cargo; collisioni con i nodi adeguate al raggio. |
| Scatti visivi | Interpolazione dei remoti senza attraversare la mappa al respawn; smoothing visivo locale. La simulazione resta autoritativa. Il playtest Internet rimane necessario. |
| SVG e canvas nascosto | Icone SVG come file compilati, avatar in base64; Phaser inizializzato dopo l'ingresso, non dentro un contenitore nascosto. |
| Hosting effimero | Ogni nuovo ledger consulta l'uso account CMC prima delle quote; limite account 10.000/mese e 320/giorno, inferiore a Basic. Un solo collector, una sola istanza. Replay disattivati salvo opt-in. |
| Creazione incontrollata di stanze | Limite di 8 arene per processo. Il laboratorio non è registrato sul server compilato. Non equivale a protezione DDoS. |

## Dubbi di prodotto da verificare con due persone

- Un wallet più grosso rende più facile raccogliere ma anche essere colpiti; non dà forza offensiva crescente. Valutare l'effetto sul recupero degli svantaggi.
- L'orbita lenta è deliberatamente arcade: una simulazione astronomica realistica ostacolerebbe il controllo.
- LONG/SHORT agiscono sulla navigazione, non sul punteggio come un trading simulator. Se i tester si aspettano profitto/perdita, rivedere i nomi o aggiungere un tutorial, senza descrivere la meccanica in modo falso.
- Il single player non è una correzione dello stuttering. Prima misurare latenza e correzioni in due su hosting reale; i bot garantiscono una partita anche da soli.
- Le icone CC0 non equivalgono a una liberatoria sui marchi: vedere THIRD_PARTY_ASSETS.md.
- Render Free si sospende quando inattivo; non garantisce disponibilità continua. Il video di candidatura deve restare accessibile come alternativa.
- Gioco divertente e utilità del dato sono criteri differenti: il nodo inspector e le correnti devono dimostrare concretamente la proposta Data and Visualisation.

## Stato ancora aperto

Account/registrazione campagna da confermare; GitHub Desktop passo passo con l'utente; repository pubblico e deploy non ancora eseguiti; playtest umano, video, BUIDL e post X da completare. Nessun esito di test umano o accettazione degli organizzatori è presunto.

## Verifica del candidato

`pnpm check`: **44 test superati**, build e separazione server/client valide. Test espliciti: 10 slot con sostituzione bot, overflow su altra arena, invito SDK per ID, massimo 8 arene, slot liberato e riutilizzato; selezione a sei nodi e orbita senza sovrapposizione per tutta la partita; wallet dentro la zona finale; validazione identità; crescita limitata; Basic/account quota; percorsi privati e origini estranee respinti.

Carico sintetico: 10 bot, 18.000 tick, checksum 64ff7c7c, media 0,0679 ms, p95 0,1114 ms, massimo 1,9781 ms. 339 raccolte, 20 depositi, 137 interruzioni, 10 eliminazioni. Il tempo è CPU locale e non rappresenta latenza Internet, prestazioni del server gratuito o bilanciamento umano.

Browser: schermata iniziale e scelta avatar verificate; nella sessione di test, ingresso tramite pulsante, CMC LIVE, pianeti e avatar renderizzati, nessun errore JavaScript. Il controllo finale del collegamento di invito nella UI è rimasto incompleto per timeout del browser integrato dopo i riavvii. L'invito server è coperto dal test SDK, ma manca la verifica sui due dispositivi dell'utente. Non dichiarare il progetto perfetto o pubblicato.

GitHub Desktop aperto: schermata Welcome, accesso personale ancora necessario. Nessuna chiave esposta e nessun repository pubblico creato.

Aggiornamento 27 settembre: l’utente conferma iscrizione DoraHacks con la stessa email CMC. Nessuna email è stata registrata nei sorgenti. Hosting Render richiesto come ultimo passaggio; registrazione aperta nel browser.

## Chiusura locale successiva

Verificato nel browser l'invito generato dal pulsante: secondo client con WHALEY nella medesima arena, popolazione e classifica condivise. Provato Q: LONG/SHORT cambia e l'indicatore distingue anche corrente quasi nulla.

Corretto il recupero da invito scaduto: risposta HTTP standard 400 con codice applicativo Colyseus conservato; prima il 522 poteva restare in attesa nel browser integrato. Test HTTP incluso nella suite e percorso UI verificato: errore → ENTRA IN UN’ALTRA ARENA → connessione LIVE. Aggiunto limite di attesa di 65 secondi, pulsante disabilitato durante l'ingresso, chiusura delle connessioni tardive, protezione da callback di vecchie partite. Aggiornato il selettore dei nodi quando cambia il roster.

Suite finale: 44/44. Preparata VIDEO_RECORDING_READY.md. Il video non è stato registrato e il playtest Internet umano resta da fare dopo Render. Nessun deploy o repository pubblico creato; la registrazione Render è aperta per l'utente e il deploy è concordato come ultimo passaggio.


## MARKET CAPTAINS — revisione del 27 settembre, nuova richiesta

Rinominata l'interfaccia e il materiale corrente di candidatura. Interfaccia giocabile, messaggi dati e field lab in inglese; schema rete 5. Le vecchie verifiche sopra sono storiche, non attestazioni del nuovo candidato.

Correzione verificata: i contatti minimi tra vicini fermi interrompevano ripetutamente il deposito. Ora solo un impatto significativo interrompe per collisione; gli impulsi continuano a interrompere. Bot: meno spam di impulsi, aggiramento nuclei, raccolta fuori dai nuclei, scelta wallet meno affollati, fuga dall'hacker. Stesso seed e partita completa con 10 bot: 2.684 raccolte, 223 depositi, 146 impulsi contro 339, 20, 1.435 del precedente candidato. Restano 533 interruzioni aggregate su molti più tentativi: non viene dichiarato eliminato ogni conflitto. CPU locale p95 0,2024 ms, non latenza di rete o prova umana.

Hacker: sostituisce un bot durante due finestre casuali deterministiche di 60 e 90 secondi, massimo 150 secondi prima della chiusura. Nessun undicesimo personaggio. Se dieci umani occupano l'arena, non compare. La visuale rossa sparisce a fine finestra e il bot normale rientra. Drena solo cargo, 1 punto ogni 15 tick a contatto, mai wallet; zone wallet protette anche dal knockback. Il dato CMC non influisce sui tempi dell'hacker.

Guida iniziale in quattro schede, frecce tastiera e pulsanti, Esc, riapertura; input di movimento rilasciati mentre è aperta. Non mette in pausa gli altri giocatori. LONG/SHORT: chevron animati con direzione selezionata; soglia di quasi-zero preservata. Due endpoint CMC, non sei: quotes/latest in batch e key/info per quote. Sei pianeti non richiedono sei richieste separate.

Prossimo miglioramento da decidere dopo prova umana: feedback di salvataggio quando si raggiunge il wallet inseguiti dall'hacker. Evitato un bonus economico ripetibile che potrebbe essere sfruttato per accumulare punteggio senza giocare.

Restano da completare: prova umana del bilanciamento e su Internet, video, repository via GitHub Desktop insieme all'utente, Render, URL reciproci BUIDL/X/video. Non dichiarare il gioco perfetto o la candidatura inviata.
`pnpm check`: 51/51 test superati nel candidato MARKET CAPTAINS. Verificati nel browser guida (tastiera, pulsante, Esc), ingresso LIVE, cambio Q e hacker rosso visibile. Il messaggio feed caricato dalle vecchie cache viene ora ricostruito in inglese. Prova umana Internet ancora pendente.


Nuova revisione: due finestre hacker di 60 secondi ciascuna (120 secondi massimi). Dieci avatar PNG da una sola generazione: tutti caricati e verificati nel browser. Opportunities sotto l'arena: frammenti realmente presenti, corrente scelta, deposito, allerta hacker; sospensione suggerimenti di mercato con feed STALE/DEGRADED. Guida esplicita: LONG e SHORT controllano una corrente, non una posizione di trading. Scie direzionali, pulsazioni da volume normalizzato e alone da volatilita, con supporto reduced-motion. 54 test superati. Nessun endpoint premium presente da rimuovere: restano quotes/latest e key/info, gia verificati con Basic. Non aggiunti global-metrics, Fear & Greed o storico. Feed in backoff dopo errori di rete durante la verifica: autorizzazione rete concessa, contatore e backoff preservati. Non dichiarare LIVE prima di una risposta fresca.


Planet layout update: BTC remains central and ETH retains its orbit. Each new arena selects 3–5 additional eligible planets, for 5–7 total. Seeded random coordinates replace the four fixed corners. Altcoin radii span 22–42 and influence radii 95–185, using relative logarithmic market capitalization; BTC (66/280) and ETH (45/205) remain visual anchors. Geometry stays fixed for a match except ETH orbit. Old caches lacking raw market cap use cap-derived gravity until fresh quotes arrive. Fields may overlap deliberately; solid cores, the entire ETH orbit and wallet approaches are protected. 55 tests pass, including 120 seeded layouts with all three counts, unique arrangements, cap ordering and full orbit collision checks. No extra API requests.


## Single-player stability release — 28 September 2026

Reported: a Brave desktop player experienced uncontrolled drift and jitter. Live probe accepted 177 of 179 sequential inputs over six seconds; snapshot intervals averaged 66 ms and peaked at 153 ms. This does not establish Render CPU congestion. Confirmed design weaknesses: combined gravity could overcome steering, drag was weak, and prediction reconciled a latest-input server rather than a one-command-per-tick simulation.

Public mode now runs locally with three bots, fixed 30 Hz steps capped at three per render frame, pause on focus loss/guide, HUD updates at 5 Hz, capped combined field forces, and stronger idle braking. No gameplay WebSocket or server position corrections. CMC stays server-side; clients read cached normalized frames once per minute without triggering provider requests. Production arena matchmaking is disabled. Remaining risks: slow GPUs can still drop frames; local scores are not authoritative; Brave hardware acceleration and human playtesting remain to verify. Deployment requires pushing the prepared commit.


## Five-minute refinement — 29 September 2026

Arcade gravity previously extended beyond visible halos and continued accelerating idle players. It now tapers to zero at halo edges; released controls engage braking and settle to zero velocity. Player rendering uses the same fixed-step interpolation as other contestants, removing a separate self-position filter. Matches last 9000 ticks (five active minutes); market close lasts one minute and both sixty-second hacker visits remain. Music and loader added; deployment/browser audio validation is pending.

### 2026-09-29 — Cold-load HTTP delivery failure
- Public first visits could stall on scripts, styles and the loading poster. Parallel public GETs reproduced timeouts for the shared JS bundle and arena CSS while other assets returned 200.
- Found a concrete defect in the pinned @colyseus/better-call 1.3.3 Node adapter: res.end() ran inside the read loop rather than when the stream ended. After write() backpressure, the final read could exit without ending the response; multi-chunk streams could end prematurely.
- Added a pnpm dependency patch for both ESM and CJS adapters, committed through patchedDependencies and the lockfile so Render applies it during frozen installs. Remove this patch only after upgrading to an upstream version verified by the regression tests.
- Reproduced the large-body timeout before applying the patch. Both backpressure and multi-chunk regression tests pass afterward. Production tests now download and compare every built asset, including poster and audio, instead of testing only the entry script.
- Startup now logs the actual failure and offers a Retry loading button. No automatic reload loop; gameplay and music timing unchanged.
- Validation: pnpm check, 64 tests passed; offline frozen-lockfile install passed. Public deployment verification still pending push/deploy.

### 2026-09-29 — Whale authority, mouse controls and final-minute balance
- Replaced individual polarity authority with one shared current controlled by the active leader in banked wallet points. Ties preserve the incumbent; reversal cooldown is 60 ticks. Leaderboard now sorts and displays wallet points, with existing bonus scores used only as tie-breakers.
- Whale tail/ring and one blue 10-point diamond every 90 ticks. Collection excludes the current whale (not the historical emitter). Special drops displace ordinary fragments when necessary; the total remains capped at 140.
- BTC only: tangential flow, no radial attraction, halo damage and instant destruction on core contact, including during spawn protection. Other planet fields and idle braking remain. Health reduced to 85; fuel remains a separate regenerating action resource. Thrust, boost and pulse strengthened.
- Closing center moved to (720,590), final radius 230, leaving a usable wallet instead of forcing everyone into the solar core. Storm ramps from 22 to 52 damage/second and blocks deposits outside; newly spawned closing fragments are worth 10. Respawns choose a safe-circle wallet.
- One seeded fictional memecoin out of five follows a moving, core-avoiding route for 900 ticks and drops 450 points total. No extra provider endpoints, persistent particles or additional contestant slots.
- Three bot difficulty levels change steering, target valuation, deposit thresholds, competition awareness and boost/pulse decisions. Bots now use velocity-aware arrival steering to avoid overshooting pickups. Relaxed bots use gentler throttle; all share the same health/physics limits. Automatic bank channels are not interrupted artificially to create difficulty.
- Left mouse held: velocity-aware cursor steering; release: braking; right mouse: boost while moving. Keyboard/touch retained. Input releases on blur, cancel and guide opening. Guide expanded and labels aligned; centered logo and removed header tagline.
- Critical tradeoffs: shared whale control deliberately removes polarity control from followers; retaining wallet points across deaths keeps the lead resilient, while cargo loss, catch-up diamonds and the airdrop provide comeback opportunities. Banked-wallet ranking now takes precedence over event/bounty bonus points. Difficulty results vary by map and competition; simulated performance is not proof of subjective game feel.
- Validation: 72 tests pass, including nine full five-minute bot simulations across difficulty levels; solar damage/death, authority/cooldown/ties, diamond succession, 30-second drop budget, storm respawn, and mouse arrival/braking covered. Browser startup and slider verified at 1280x720 with no document overflow or console errors. Public release still needs GitHub Desktop push and Render verification.

### 2026-09-29 — Optional multiplayer with shared waiting lobbies
- Start screen now offers Singleplayer / Multiplayer; solo opponent count is explicitly selectable between 3, 4 and 5. Solo difficulty stays local; shared public multiplayer uses one consistent default difficulty.
- Production enables public arena matchmaking with a server-controlled 180,000 ms waiting deadline from the first participant. New arrivals do not restart it. Full lobbies launch immediately, and only the current host may start early. Host control transfers to a connected participant on departure/drop. Invite links target a specific waiting room; expired/full/started rooms show an error and an explicit alternative-lobby action.
- Lobby simulation is frozen. On launch, empty slots fill to ten total participants and the room locks; future joins find another waiting room. A reconnecting user retains their slot for 15 seconds, then an abandoned slot is replaced by a bot. No player-provided duration, bot count or lobby timeout can override server configuration.
- Multiplayer uses server authority, own-player motion prediction, gradual visual corrections and a 120 ms remote interpolation buffer. Prediction uses the authoritative whale polarity and extrapolated ETH orbit. Inputs stop on focus loss; only one release packet is sent instead of one per animation frame. Prediction freezes after 500 ms without fresh server state. Online time continues during a guide or background tab; solo pause behavior remains.
- Snapshots reduced to 10 Hz; physics remains 30 Hz. Hidden arenas stop rendering. No new CMC endpoint or per-player provider polling was introduced. The eight-room server limit remains.
- Validation: 76 tests pass. Added public matching/invite, timer persistence, deadline start and fill, ten-human immediate start, overflow separation, host permission/transfer, locked-room reconnection, solo roster choices and whale-aware prediction checks. Existing delayed-snapshot tests still pass. Two browser sessions joined the same lobby and entered the same two-human/eight-bot match without JavaScript errors. Real cross-device latency and free-host load still require the public playtest after deployment; local testing is not a guarantee against internet jitter.
