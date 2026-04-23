# Generatore 3D del Modello di Abell

Applicazione web per creare, modificare e visualizzare box 3D sul modello di Abell in modo rapido e interattivo.

## Panoramica

Questo progetto permette di:

- definire assi del modello (x clienti, y bisogni, z modalita/tecnologie),
- aggiungere più box con origine e dimensioni personalizzate,
- assegnare un colore per ogni box,
- usare zoom e pan sul canvas,
- salvare e caricare configurazioni in formato JSON.

## Demo locale

Progetto statico: non richiede build.

1. Clona o scarica la repository.
2. Apri [index.html](index.html) nel browser.

In alternativa puoi usare un piccolo server locale (consigliato in sviluppo):

1. `python3 -m http.server 8000`
2. Apri `http://localhost:8000`

## Struttura del progetto

- [index.html](index.html): interfaccia utente.
- [css/styles.css](css/styles.css): stile principale.
- [js/app.js](js/app.js): logica applicativa e rendering canvas.

## Crediti

Creato da EhiPi con l'aiuto del suo amico Claude Code.

## Licenza d'uso

Uso gratuito consentito solo per scopi personali e didattici.
Non è consentito l'uso commerciale senza autorizzazione esplicita dell'autore.
