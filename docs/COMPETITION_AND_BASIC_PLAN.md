# Competizione e piano Basic — verifica 27 settembre 2026

Fonti: [regolamento DoraHacks](https://dorahacks.io/hackathon/coinmarketcap-api-202609/detail), [criteri dei track](https://dorahacks.io/hackathon/coinmarketcap-api-202609/tracks), letti nel browser.

Chiusura esplicita: **30 settembre 2026, 23:59 UTC**, cioè 1 ottobre 01:59 a Roma. Giudizio 1–16 ottobre, risultati 19 ottobre. Startup della campagna termina alla chiusura e torna Basic. Chiave propria collegata all'iscrizione della campagna; mai condividerla o inserirla nel repository. Verifica personale ancora necessaria: iscrizione, età minima 18 anni, team massimo quattro, originalità del progetto.

Richiesti: repository pubblico, demo o registrazione funzionante, video indicato dal form, endpoint nominati, codice e risposta API reale, feedback, un track e post X con BUIDL, video e #BuildwithCMC. La chiave reale e il feedback sono documentati; gli URL e il playtest umano sono ancora mancanti.

Track proposto: **Data and Visualisation**, non approvato preventivamente dagli organizzatori. Pesi specifici: funzionamento 30; relazione non ovvia resa visibile 25; uso API 20; qualità e chiarezza dell'output 15; presentazione 10. Un gioco soltanto decorato con loghi è una candidatura debole. Mostrare confronto tra nodi, corrente, grandezza compressa e volume/distribuzione dei frammenti.

## CMC

La [pagina prezzi](https://coinmarketcap.com/api/pricing/) consultata dichiara Basic gratuito con 15.000 crediti/mese, 50 richieste/minuto, una conversione per chiamata e uso commerciale. I dati devono restare integrati nel prodotto, non rivenduti come servizio dati autonomo. Il link ai termini commerciali ha restituito una pagina promozionale nella lettura automatica: non dichiariamo una verifica completa di ogni clausola di retention. Conserviamo una sola risposta corrente e una breve storia locale; nessuna API pubblica espone quotazioni grezze.

Endpoint effettivamente verificati con la chiave dell'utente: `/v1/key/info` e `/v3/cryptocurrency/quotes/latest`. Dieci ID, USD, un batch condiviso ogni 300 secondi; una verifica account ogni ora. Tutte le arene usano lo stesso feed. La richiesta quotes reale ha addebitato un credito; key/info zero nel test. Nessuna dipendenza da WebSocket CMC o endpoint Startup.

Limiti applicativi: **10.000/mese e 320/giorno**. Sono più bassi di Basic e restano tali anche se l'account riceve Startup. Con uso continuo per 31 giorni: 8.928 batch; contando prudenzialmente un credito anche per ogni verifica oraria, 9.672 crediti. Sul periodo di giudizio di 16 giorni: 4.608 batch, oppure 4.992 con le verifiche conteggiate a un credito. Non sono consumi osservati.

Ogni richiesta prenota il credito prima dell'invio. Errori di autorizzazione e costi inattesi bloccano il collector; timeout conservano la prenotazione. Il ledger locale mantiene il prossimo polling. Su filesystem effimero il nuovo processo interroga prima l'uso account e sottrae quanto già consumato dal tetto di 10.000. Un solo processo e nessun altro collector con la stessa chiave; prima del deploy spegnere quello locale. Non è un coordinamento distribuito per repliche concorrenti.

LIVE usa timestamp del provider entro 12 minuti, STALE entro 30, poi DEGRADED. La volatilità richiede almeno quattro campioni e riparte in riscaldamento dopo perdita della cache. Non simuliamo come “live” eventi finanziari al secondo da campioni ogni cinque minuti. Le API restano server-side e il browser riceve solo parametri di gioco normalizzati.

## Verdetto attuale

Implementazione tecnicamente compatibile con i vincoli Basic verificati; candidatura incompleta finché mancano registrazione confermata, repository pubblico, deploy/video, playtest e materiali di submission. Nessuna garanzia di ammissione o punteggio. Vedere CRITICAL_REVIEW.md e HOSTING_AND_GITHUB.md.

Aggiornamento 27 settembre: l’utente conferma iscrizione DoraHacks con la stessa email CMC. Nessuna email è stata registrata nei sorgenti. Hosting Render richiesto come ultimo passaggio; registrazione aperta nel browser.


Effetti aggiornati: https://coinmarketcap.com/api/pricing/ ricontrollata il 27 settembre. Nessun endpoint aggiuntivo: pulsazioni da volume_24h, correnti da percent_change_1h, volatilita dai campioni locali del batch quotes. Nessuna dipendenza Startup introdotta.
