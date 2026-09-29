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
