# M7 — candidate locale, 24 settembre 2026

È stato preparato il controllo ripetibile della consegna: `node scripts/submission-check.mjs` legge `submission.json`, verifica la presenza delle prove, genera lo stato in `release/` e inventaria i sorgenti con SHA-256.

Il controllo non effettua chiamate CMC, non pubblica file e non invia candidature. La presenza di un URL non dimostra che sia pubblico o funzionante; la verifica esterna resta esplicita. Una risposta locale valida non prova da sola la provenienza: occorre mostrarne l'esecuzione autenticata con la chiave oscurata.

L'inventario esclude credenziali, dati di esecuzione, replay, dipendenze, build e documenti originali di handoff. Se trova la chiave configurata all'interno dei sorgenti, interrompe l'esportazione senza stamparla. Questo controllo mirato non sostituisce una revisione di altri eventuali segreti.

Il pacchetto include codice, test, istruzioni e copione demo. Mancano ancora: prova API reale, playtest umano compilato, repository pubblico, demo pubblica, video, feedback API, BUIDL e post social. M7 è quindi in preparazione, non completata.

Verifica finale: compilazione, confini dei pacchetti e 37 test superati, inclusi esclusione dei file privati e blocco di una credenziale di prova nei sorgenti.
