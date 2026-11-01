# Študentski servis Maribor – prenova spletne strani (prototip)

Študentski projekt, avtor: Timi Svenšek. To ni uradna stran Študentskega servisa Maribor. Podatki o delih, osebah in urnikih so izmišljeni.

## Zagon
- Lokalno: dvoklikni `index.html`, ali poženi `node serve.js` v nadrejeni mapi in odpri http://localhost:5173.
- Splet: GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

## Struktura
- `index.html` … 19 strani (za študente, za podjetja, informativni del, Moj račun)
- `css/style.css` – skupni dizajn (mobile-first)
- `js/data.js` – vzorčni podatki (dela, novice, poslovalnice, stopnje za izračune)
- `js/app.js` – glava, noga, obrazci in logika strani
- `img/` – logotip servisa in fotografije z Unsplash (brezplačna licenca)

## Uporabniški poti za preizkus
1. **Najdi delo in naroči napotnico:** Prosta dela → filtri → delo → Pošlji prijavo → Naroči e-napotnico → (status je potekel) Podaljšaj status → Nadaljuj z napotnico → Oddaj naročilo.
2. **Podaljšaj status:** Domov → Podaljšaj status → podatki → potrdilo (»Uporabi testno potrdilo«) → potrdi.

Testni EMŠO: `0101004500123`. Prijava v Moj račun: gumb »Izpolni testne podatke«.
Stanje se shrani v brskalnik. Povezava »Ponastavi prototip« v nogi ga ponastavi.
