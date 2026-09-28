# M1 — Gravità, polarità e slingshot

## Risultato

Tre nodi fissi e sintetici: BTC ed ETH con momentum positivo, SOL negativo. Non sono quotazioni reali. Simulazione server a 30 Hz; snapshot a 15 Hz. Nessuna API CMC, nessuna pubblicazione online.

La fisica implementa gravità ammorbidita vicino al centro, corrente radiale con `alignment = polarity × momentumN`, turbolenza seedata interpolata tra campioni, limite all'accelerazione e alla velocità. NEUTRAL annulla la corrente, conserva gravità e turbolenza. I nuclei sono solidi e sicuri: contatto senza danno, eliminazione o rimbalzo energetico. Le frecce rappresentano la corrente, non la risultante di tutte le forze.

## Uso della demo

- WASD / frecce: spinta.
- 1 / 2 / 3 o pulsanti: LONG / NEUTRAL / SHORT.
- Riproduci slingshot: il server esegue una traiettoria di quattro secondi su un singolo nodo isolato; i comandi sono sospesi durante la riproduzione. Poi il controllo torna al pilota.
- Riparti con tre nodi: ripristina l'arena sintetica. Reset limitati a uno ogni due secondi.

La dimostrazione usa lo stesso integratore del volo libero, con turbolenza disattivata per isolare il fenomeno: velocità iniziale tangenziale 100 u/s, raggio di ingresso 160, cambio da NEUTRAL a LONG al tick 30. Non aggiunge impulsi e non usa spinta. Il vantaggio arriva dal campo, non da una traiettoria imposta al client.

## Evidenza quantitativa

`pnpm slingshot`:

| Misura | Risultato |
|---|---:|
| Velocità iniziale | 100 u/s |
| Uscita dal campo, raggio 360 | tick 99 / 3,3 s |
| Velocità all'uscita | 137,2705 u/s |
| Guadagno rispetto all'ingresso | 37,27% |
| Distanza minima dal centro | 101,6131 |
| Distanza di contatto col nucleo | 74 |
| Checksum a 120 tick, seed 20260923 | `816cb7f7` |

Il controllo con la stessa partenza e NEUTRAL permanente rimane dentro il campo. Il test verifica anche uscita verso il quadrante destro-inferiore, velocità radiale uscente, assenza di contatto e ripetibilità. Questi sono risultati di un fixture di accettazione, non una garanzia di bilanciamento di ogni traiettoria di gioco.

## Verifiche

20 test coprono i quattro casi momentum/polarità; NEUTRAL; centro del campo senza singolarità; attenuazione della corrente; turbolenza limitata, riproducibile e continua ai confini dei campioni; validazione/clamp dei nodi; contatto dei nuclei; topologia fissa; 10.000 tick con cambi di polarità; input e ownership; vero collegamento Colyseus, selezione della polarità e riproduzione gestita dal server.

Il replay standard di 10.000 tick ha checksum `6f916d7f`. I test 30/60/144 FPS restano simulazioni di diverse cadenze di rendering; non misure su monitor fisici. I file originali di handoff sono conservati invariati.

Verifica nel browser: server M1 connesso, selettori LONG/SHORT confermati dallo stato autorevole, ingresso NEUTRAL e uscita LONG della riproduzione, riabilitazione dei comandi a fine demo e ripristino dell'arena a tre nodi. Controllo visivo eseguito su campi, etichette, scia e simbolo della polarità.

## Decisioni e limiti

- Schema di rete 2: polarità richiesta e validata; vecchi client schema 1 rifiutati. Lo stato include nodi e modalità della dimostrazione.
- Attrito ridotto da 2,4 a 0,22/s per conservare momentum; spinta 380 u/s², velocità massima 520 u/s, accelerazione massima 1000 u/s². Valori iniziali da playtestare.
- Il nodo BTC usa forza corrente 1000, momentum normalizzato 0,85. La corrente favorevole può essere insufficiente a vincere la gravità vicinissimo al nucleo: la UI lo dichiara.
- Nessuna forza tangenziale artificiale: la curvatura emerge da velocità tangenziale e gravità.
- I nodi non si spostano. La loro validazione limita anche outlier sintetici; non sostituisce la futura pipeline CMC.
- Restano da valutare latenza percepita, collisioni tra giocatori, bilanciamento in arena completa e accessibilità su touch. M2 aggiungerà multiplayer e prediction/reconciliation.
- Resta valido il progetto Basic: polling globale ogni cinque minuti e budget inferiore alla quota; non è stato anticipato alcun adapter live.
