# NUMIS VIA – Digitálny trezor a komunita

Tento dokument definuje technologický smer po CoinPrinte. Cieľom je, aby používateľ mohol zbierku spracúvať postupne, bezpečne ju evidovať a podľa vlastného rozhodnutia vybrané časti prezentovať, vymieňať alebo ponúkať na predaj.

## Zásada vlastníctva a súkromia

Digitálny trezor je predvolene súkromný. Verejná prezentácia, prijímanie ponúk, výmena ani predaj sa nikdy nezapnú automaticky. Používateľ rozhoduje samostatne pre zbierku, kazetu aj mincu.

Fyzické umiestnenie mince, adresa, bezpečnostné poznámky, nákupné doklady a interné ocenenia sa nesmú objaviť vo verejnom profile.

## Dátová hierarchia

User
→ Vault
→ Collection
→ Container (kazeta / album / box)
→ Slot
→ Coin
→ CoinPrint identity
→ NUMIS VIA Passport
→ Valuation history
→ Visibility / market intent
→ Ownership and provenance events

Jedna minca dostane stabilné NUMIS VIA ID. Zmena kazety, ceny alebo vlastníka nesmie vytvoriť novú identitu tej istej mince.

## Postupné oceňovanie

Používateľ nemusí nahrať celú zbierku naraz. Typický tok:

1. vytvorí účet a súkromný trezor;
2. založí kazetu, napríklad 24 pozícií;
3. odfotí celok a následne potrebné strany jednotlivých mincí;
4. CoinPrint identifikuje mince fail-closed spôsobom;
5. nejasný kus si vyžiada lepšiu fotografiu, hranu, hmotnosť alebo rozmery;
6. iba overená identita môže pokračovať do ocenenia;
7. výsledky sa uložia do rovnakej kazety a trezoru;
8. ďalšiu kazetu možno pridať kedykoľvek neskôr.

Report kazety musí oddeliť počet prijatých, overených, blokovaných a odborne eskalovaných mincí. Súhrnná hodnota nesmie predstierať cenu blokovaných kusov.

## NUMIS VIA Passport

Pas mince má uchovávať minimálne:
- NUMIS VIA ID;
- fotografie a ich dôkazový pôvod;
- CoinPrint identitu a mieru istoty;
- katalógové referencie;
- stav overenia;
- fyzické údaje, ak sú dodané;
- históriu ocenení s dátumom a zdrojmi;
- príslušnosť ku kolekcii/kazete/pozícii;
- históriu vlastníckych a významných provenance udalostí, ak sú dôveryhodne doložené.

Digitálny pas nie je automaticky certifikát fyzickej pravosti. Typová identita a fyzická autenticita zostávajú oddelené.

## Súkromný trezor

Po prihlásení používateľ vidí celé portfólio: zbierky, kazety, fotografie, stavy spracovania, ocenenia a fyzické umiestnenie.

Fyzické umiestnenie má samostatné polia, napríklad:
trezor → box A → kazeta 2 → pozícia 17.

Tieto údaje sú private-only a API ich nesmie vrátiť verejnému profilu ani marketplace vrstve.

## Verejná vitrína

Pre mincu/kazetu/zbierku sa navrhuje stav viditeľnosti:
- PRIVATE;
- SHOWCASE;
- COMMUNITY_VISIBLE.

Trhový zámer je oddelený od viditeľnosti:
- NONE;
- OPEN_TO_OFFERS;
- FOR_EXCHANGE;
- FOR_SALE.

Takto možno mincu verejne ukázať bez toho, aby bola na predaj.

Verejná vrstva obsahuje iba bezpečný odvodený pohľad: fotografie povolené majiteľom, verejné údaje pasu, príbeh a zberateľský kontext. Nikdy fyzickú adresu alebo presnú polohu uloženia.

## Komunita

Komunitná vrstva má nad verejnými vitrínami podporovať profily zberateľov, tematické zbierky, sledovanie, diskusiu a dobrovoľné párovanie MÁM ↔ HĽADÁM.

Gamifikácia nemá byť iba rebríček najvyššej finančnej hodnoty. Vhodnejšie metriky sú dokončenosť série, tematické cesty, dokumentácia, vzdelávací prínos a komunitné výzvy.

Technická platforma komunity sa vyberie až podľa potrieb a nákladov v čase implementácie. Dátový model NUMIS VIA však musí byť pripravený tak, aby komunita nemusela meniť identitu mincí ani trezor.

## Bezpečnostné hranice

- autentifikácia používateľa a autorizácia vlastníctva každého objektu;
- verejné API používa allowlist verejných polí, nie blacklist tajných polí;
- zmena visibility alebo market intent musí byť auditovateľná;
- predaj/výmena nikdy nesmie meniť vlastníka iba na základe správy alebo ponuky;
- vlastnícky transfer je samostatná potvrdená udalosť;
- citlivé údaje nesmú byť súčasťou verejných URL, analytiky ani vyhľadávacieho indexu;
- používateľ musí vedieť verejnú prezentáciu vypnúť bez straty súkromného pasu a histórie.

## Implementačné fázy

Fáza A: CoinPrint + overený katalóg + fyzický pilot.

Fáza B: účet, súkromný trezor, zbierky, kazety, pozície, pasy a postupné oceňovanie.

Fáza C: bezpečná verejná vitrína a profily zberateľov.

Fáza D: komunita a MÁM ↔ HĽADÁM.

Fáza E: ponuky, výmena, marketplace, aukcie a bezpečný transfer vlastníctva.

Poradie je zámerné: obchodná a komunitná vrstva nesmie obísť identifikačné, súkromné a vlastnícke hranice.
