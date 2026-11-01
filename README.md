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

## Kako deluje
Stran nima strežnika. Računi, oglasi, prijave in napotnice se shranijo v brskalnik (localStorage),
zato veljajo na napravi in v brskalniku, kjer so bili vpisani. Gesla so shranjena zgoščeno, EMŠO se ne shrani.
Povezava »Ponastavi prototip« v nogi izbriše vse in vrne testne podatke.

## Testna računa (izmišljena)
| Vloga | E-pošta | Geslo |
|---|---|---|
| Študent (status je potekel) | luka.novak@student.um.si | Student123 |
| Podjetje (Kavarna Lent, 2 čakajoči prijavi) | kavarna@lent-primer.si | Podjetje123 |

Na strani Prijava ju izpolniš z gumboma »Testni študent« in »Testno podjetje«. Testni EMŠO: `0101004500123`.

## Celotna pot za preizkus
1. **Podjetje:** Vpis partnerja (ustvari račun) → Oddaja oglasa → oglas je takoj med prostimi deli.
2. **Študent:** odjava → odpri ta oglas → Včlani se (ustvari račun) → Pošlji prijavo.
3. **Podjetje:** prijava → Moj račun → Prijave kandidatov → Sprejmi (vidi kontakt študenta).
4. **Študent:** prijava → Moj račun pokaže »Delodajalec te je izbral« → Naroči napotnico.
5. **Podjetje:** Moj račun → Napotnice → Potrdi. Študent vidi napotnico kot potrjeno.

Druga pot: testni študent → Napotnica → »Najprej podaljšaj status« → podaljšanje v 3 korakih → nazaj na napotnico.
