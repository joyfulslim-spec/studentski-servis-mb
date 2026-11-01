/* Vzorčni podatki za prototip. V pravi aplikaciji bi prišli iz API-ja (/api/dela, /api/novice …). */

window.SS = window.SS || {};

/* Stopnje za informativne izračune – na enem mestu, da jih je ob spremembi zakonodaje lahko posodobiti (tveganje T-03). */
SS.STOPNJE = {
  prispevkiStudent: 0.155,   // prispevki za PIZ, ki jih plača študent
  dajatveDelodajalec: 0.2738 // informativni pribitek delodajalca (koncesijska dajatev + prispevki) – preveri pri FURS
};

SS.REGIJE = ["Mariborska", "Pomurska", "Ptujska", "Celjska", "Savinjska", "Velenjska", "Koroška", "Delo od doma"];

SS.KATEGORIJE = [
  "Strežba", "Delo v trgovini", "Skladiščna dela", "Računalniška dela, informatika", "Administrativna dela",
  "Poučevanje", "Promocije, degustacije, hostese", "Raznos, razvoz, dostava", "Proizvodna dela", "Delo z otroki"
];

SS.JOBS = [
  { id: 2611, naziv: "Strežba v kavarni ob Lentu", podjetje: "Kavarna Lent", kat: "Strežba", regija: "Mariborska", kraj: "Maribor – Lent", urna: 8.20, cas: "Vikendi, 8.00–16.00", trajanje: "Dolgoročno", dijaki: true, od: "takoj", objavljeno: "31. 10. 2026", img: "strezba.jpg",
    opis: "Iščemo prijazne študente in dijake za strežbo pijač in sladic na terasi ob Dravi. Uvajanje traja en dan.",
    naloge: ["strežba gostov in sprejemanje naročil", "priprava enostavnih napitkov", "pospravljanje miz"], pogoji: ["status dijaka ali študenta", "komunikativnost", "vsaj 2 vikenda na mesec"] },
  { id: 2610, naziv: "Pomoč pri razvoju spletnih strani", podjetje: "Pixel d.o.o.", kat: "Računalniška dela, informatika", regija: "Mariborska", kraj: "Maribor – Tabor", urna: 11.50, cas: "20 ur na teden, delno od doma", trajanje: "Dolgoročno", dijaki: false, od: "15. 11. 2026", objavljeno: "30. 10. 2026", img: "it.jpg",
    opis: "Pridruži se ekipi, ki izdeluje spletne strani za lokalna podjetja. Delo poteka v pisarni in od doma.",
    naloge: ["izdelava in urejanje spletnih strani (HTML, CSS, JavaScript)", "testiranje na telefonih", "pomoč pri vzdrževanju"], pogoji: ["status študenta", "osnovno znanje HTML/CSS", "prenosni računalnik"] },
  { id: 2609, naziv: "Programer – študentska praksa", podjetje: "Dravacode", kat: "Računalniška dela, informatika", regija: "Delo od doma", kraj: "Od doma / Maribor", urna: 12.50, cas: "Po dogovoru", trajanje: "6 mesecev", dijaki: false, od: "1. 12. 2026", objavljeno: "29. 10. 2026", img: "it.jpg",
    opis: "Razvoj notranjih orodij v ekipi petih razvijalcev. Mentor ti je na voljo vsak dan.",
    naloge: ["razvoj funkcionalnosti v JavaScriptu", "pregledovanje kode", "pisanje testov"], pogoji: ["status študenta", "osnovno znanje Gita"] },
  { id: 2608, naziv: "Prodajalec v trgovini z oblačili", podjetje: "Moda Europark", kat: "Delo v trgovini", regija: "Mariborska", kraj: "Maribor – Tezno", urna: 8.00, cas: "Popoldne, 16.00–20.00", trajanje: "Dolgoročno", dijaki: true, od: "takoj", objavljeno: "29. 10. 2026", img: "hero-studenti.jpg",
    opis: "Pomoč kupcem, zlaganje blaga in delo na blagajni v trgovskem centru.",
    naloge: ["svetovanje kupcem", "urejanje polic", "delo na blagajni po uvajanju"], pogoji: ["status dijaka ali študenta", "urejenost"] },
  { id: 2607, naziv: "Inventura v skladišču (enkratno)", podjetje: "Logistika Hoče", kat: "Skladiščna dela", regija: "Mariborska", kraj: "Hoče", urna: 9.00, cas: "Sobota, 15. 11., 7.00–15.00", trajanje: "Enkratno", dijaki: true, od: "15. 11. 2026", objavljeno: "28. 10. 2026", img: "skladisce.jpg",
    opis: "Enodnevna inventura v skladišču. Prevoz iz centra Maribora je organiziran.",
    naloge: ["štetje blaga", "vnos podatkov v ročni čitalec"], pogoji: ["status dijaka ali študenta", "natančnost"] },
  { id: 2606, naziv: "Dostava hrane s kolesom", podjetje: "Dostavko", kat: "Raznos, razvoz, dostava", regija: "Mariborska", kraj: "Maribor", urna: 9.50, cas: "Fleksibilno, sam izbereš termine", trajanje: "Dolgoročno", dijaki: false, od: "takoj", objavljeno: "27. 10. 2026", img: "maribor.jpg",
    opis: "Dostava naročil po mestu. Kolo in termo torbo dobiš od nas.",
    naloge: ["prevzem naročil v restavracijah", "dostava strankam"], pogoji: ["status študenta", "pametni telefon"] },
  { id: 2605, naziv: "Inštruktor matematike", podjetje: "Učni center Pohorje", kat: "Poučevanje", regija: "Mariborska", kraj: "Maribor – Studenci", urna: 13.00, cas: "2× tedensko popoldne", trajanje: "Šolsko leto", dijaki: false, od: "takoj", objavljeno: "26. 10. 2026", img: "hero-studenti.jpg",
    opis: "Inštrukcije za osnovnošolce in dijake v skupinah do 4 učencev.",
    naloge: ["priprava in izvedba inštrukcij", "sporočanje napredka staršem"], pogoji: ["status študenta", "dobro znanje matematike"] },
  { id: 2604, naziv: "Hostesa na sejmu", podjetje: "Pomurski sejem", kat: "Promocije, degustacije, hostese", regija: "Pomurska", kraj: "Gornja Radgona", urna: 9.80, cas: "20.–23. 11., 9.00–18.00", trajanje: "4 dni", dijaki: false, od: "20. 11. 2026", objavljeno: "25. 10. 2026", img: "podjetja.jpg",
    opis: "Sprejem obiskovalcev in deljenje promocijskega gradiva na sejmu.",
    naloge: ["sprejem obiskovalcev", "informiranje", "deljenje gradiva"], pogoji: ["status študenta", "znanje angleščine"] },
  { id: 2603, naziv: "Administrativna pomoč v pisarni", podjetje: "Računovodstvo Ptuj", kat: "Administrativna dela", regija: "Ptujska", kraj: "Ptuj", urna: 8.80, cas: "Dopoldne, 8.00–12.00", trajanje: "3 mesece", dijaki: false, od: "takoj", objavljeno: "24. 10. 2026", img: "podjetja.jpg",
    opis: "Skeniranje, vnos dokumentov in urejanje arhiva.",
    naloge: ["vnos podatkov", "skeniranje in arhiviranje"], pogoji: ["status študenta", "natančnost", "osnove Excela"] },
  { id: 2602, naziv: "Pomoč v proizvodnji", podjetje: "Kovinar Velenje", kat: "Proizvodna dela", regija: "Velenjska", kraj: "Velenje", urna: 9.20, cas: "Izmensko delo", trajanje: "Dolgoročno", dijaki: false, od: "takoj", objavljeno: "23. 10. 2026", img: "skladisce.jpg",
    opis: "Enostavna montažna dela in pakiranje izdelkov.",
    naloge: ["montaža", "pakiranje", "kontrola kakovosti"], pogoji: ["status študenta", "izmensko delo"] },
  { id: 2601, naziv: "Animator za otroške rojstne dneve", podjetje: "Igralnica Mavrica", kat: "Delo z otroki", regija: "Celjska", kraj: "Celje", urna: 9.00, cas: "Vikendi", trajanje: "Dolgoročno", dijaki: true, od: "takoj", objavljeno: "22. 10. 2026", img: "hero-studenti.jpg",
    opis: "Vodenje iger in delavnic na otroških zabavah.",
    naloge: ["vodenje iger", "pomoč pri pogostitvi"], pogoji: ["status dijaka ali študenta", "veselje do dela z otroki"] },
  { id: 2600, naziv: "Strežba na dogodkih", podjetje: "Catering Savinja", kat: "Strežba", regija: "Savinjska", kraj: "Žalec", urna: 8.60, cas: "Po razporedu", trajanje: "Občasno", dijaki: true, od: "takoj", objavljeno: "20. 10. 2026", img: "strezba.jpg",
    opis: "Strežba na porokah in poslovnih dogodkih v Savinjski dolini.",
    naloge: ["strežba", "postavitev miz"], pogoji: ["status dijaka ali študenta"] },
];

SS.NEWS = [
  { id: 1, datum: "28. 9. 2026", naslov: "Bruc Survival Pack – nagradna igra", kat: "Nagradna igra", povzetek: "Za vse nove člane, ki se včlanijo do konca oktobra, pripravljamo paket za lažji začetek študija." },
  { id: 2, datum: "23. 6. 2026", naslov: "Poletna sezona v podjetjih: kdaj je pravi čas za študentsko pomoč?", kat: "Za podjetja", povzetek: "Kako pravočasno objaviti oglas in najti študente za poletne mesece." },
  { id: 3, datum: "22. 6. 2026", naslov: "Prvi poletni job? Naj bo začetek lažji", kat: "Za študente", povzetek: "Kaj potrebuješ za prvo delo: včlanitev, napotnica in kako hitro dobiš plačilo." },
  { id: 4, datum: "5. 6. 2026", naslov: "Nagradna igra »Končno do svojega keša!« – vpis devetošolcev 2026", kat: "Nagradna igra", povzetek: "Devetošolci, ki se vpišejo v srednjo šolo, lahko sodelujejo v nagradni igri." },
  { id: 5, datum: "15. 5. 2026", naslov: "Rok za podaljšanje statusa", kat: "Pomembno", povzetek: "Status za novo šolsko leto podaljšaš s potrdilom o vpisu – zdaj tudi s telefonom v treh korakih." },
];

/* Vzorčni podatki – kraji poslovalnic so s trenutne strani, naslovi (razen sedeža) in urniki so primer. */
SS.OFFICES = [
  { mesto: "Maribor (sedež)", naslov: "Gregorčičeva ulica 23, 2000 Maribor", tel: "02 000 00 00", urnik: [["Pon–pet", "8.00–15.00"], ["Sreda", "8.00–17.00"], ["Sob, ned", "zaprto"]] },
  { mesto: "Murska Sobota", naslov: "Slovenska ulica 10, 9000 Murska Sobota", tel: "02 000 00 01", urnik: [["Pon–pet", "8.00–14.00"], ["Sob, ned", "zaprto"]] },
  { mesto: "Ptuj", naslov: "Novi trg 5, 2250 Ptuj", tel: "02 000 00 02", urnik: [["Pon–pet", "8.00–14.00"], ["Sob, ned", "zaprto"]] },
  { mesto: "Slovenske Konjice", naslov: "Mestni trg 3, 3210 Slovenske Konjice", tel: "03 000 00 03", urnik: [["Pon, sre, pet", "9.00–13.00"], ["Tor, čet", "zaprto"]] },
  { mesto: "Velenje", naslov: "Titov trg 2, 3320 Velenje", tel: "03 000 00 04", urnik: [["Pon–pet", "8.00–14.00"], ["Sob, ned", "zaprto"]] },
  { mesto: "Žalec", naslov: "Savinjska cesta 1, 3310 Žalec", tel: "03 000 00 05", urnik: [["Pon, sre", "9.00–14.00"], ["Ostali dnevi", "zaprto"]] },
];

/* Testni študent za »Moj račun« */
SS.DEMO_USER = {
  ime: "Luka Novak", email: "luka.novak@student.um.si", clanska: "SS-104 552", sola: "Univerza v Mariboru – FERI",
  zasluzki: [ ["Jun", 412.40], ["Jul", 655.10], ["Avg", 702.85], ["Sep", 318.20], ["Okt", 486.00], ["Nov", 0] ],
};
