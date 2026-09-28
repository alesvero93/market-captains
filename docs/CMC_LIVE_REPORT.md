# CMC Basic — verifica reale del 27 settembre 2026

Integrazione autenticata riuscita. Il server e l'arena nel browser mostrano LIVE; la UI espone il timestamp della fonte e la volatilità in riscaldamento.

## Risultati osservati

- /v1/key/info: HTTP 200, error_code 0, credit_count 0. L'account riporta 15.000 crediti mensili e 50 richieste/minuto.
- /v3/cryptocurrency/quotes/latest: HTTP 200; dieci asset, conversione USD; credit_count 1. Tutti i record superano la validazione.
- Al primo collaudo riuscito: quattro richieste totali e un credito consumato. Tre richieste di controllo account a costo zero precedono il batch di quotazioni.
- Programmazione invariata: un batch ogni 300 secondi, nessuna moltiplicazione per stanza o giocatore; tetti locali 320/giorno e 10.000/mese, ulteriormente ridotti dalla disponibilità dell'account.
- 38 test superati dopo la correzione. La prova nel browser conferma LIVE e timestamp fonte 15:23:59 (Europe/Rome) per il campione iniziale.

## Correzione emersa con l'account reale

La risposta Basic di key/info include current_day.credits_used ma omette current_day.credits_left. Il parser precedente, basato sull'esempio documentato, rifiutava l'assenza. Ora, solo in presenza di un piano valido, applica il tetto locale giornaliero meno l'utilizzo dell'intero account. Un limite giornaliero esplicito del provider, se presente, può solo ridurre il tetto. Valori malformati restano bloccanti.

Le due risposte diagnostiche iniziali non sono state usate per azzerare o anticipare il contatore. I tentativi successivi hanno rispettato la scadenza persistente.

## Prova per la candidatura

`docs/evidence/CMC_QUOTE_EVIDENCE.json` contiene un estratto consentito per campi della risposta autentica: ID, prezzi, capitalizzazione, volume, variazione a un'ora, timestamp e costo dichiarato. Non contiene intestazioni, chiave o identità dell'account. Il codice della richiesta è in apps/server/src/market/service.ts; mapping e validazione sono in normalize.ts. La risposta completa resta in .data, esclusa dagli archivi.

Il test prova il funzionamento della chiave e degli endpoint usati al momento del collaudo. Non prova ancora continuità per l'intero giudizio, bilanciamento umano o disponibilità pubblica. La volatilità richiede almeno quattro campioni; il collaudo iniziale non dimostra l'intero ciclo di riscaldamento.
