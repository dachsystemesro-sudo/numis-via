# NUMIS VIA – pilot SK eurocenty v1

Stav k 2026-11-09: **IMPLEMENTED PREPARATION / NOT READY FOR PHYSICAL PILOT**.
Referencie ani obrazová presnosť zatiaľ nie sú potvrdené. Zelené CI znamená úspešné softvérové kontroly, nie úspešný fyzický alebo slepý obrazový test.

## Rozsah a pilotná sada

| Nominál | Ročníky | Kombinácie |
| --- | --- | --- |
| 1 cent | 2019, 2020, 2021 | 3 |
| 2 centy | 2019, 2020, 2021 | 3 |
| 5 centov | 2019, 2020, 2021 | 3 |

Cieľ: bežné slovenské obehové vyhotovenie. Proof, chyboražby, repliky, iné ročníky, krajiny a nominály sú mimo rozsahu. Toto je test rozpoznania deklarovaných variantov, nie certifikácia pravosti, kovu, stavu alebo trhovej ceny.
Deväť návrhov je v `data/pilot/sk-eurocents.json`. Všetky majú `needs_reference_review` a NIE sú načítané v produkčnom katalógu. Chýbajúce značky a geometria zostávajú null. Žiadny kandidát sa automaticky nepovýši na verified_reference. Import OCRE a jeho workflow zostávajú bez zmeny; úplnosť OCRE nie je podmienkou tohto pilotu.

## Overiteľné zdroje a limity

Zdroje boli čítané 2026-11-09; presný register URL a závislostí je v `data/pilot/sources.json`.

- NBS, národné strany: https://nbs.sk/en/banknotes-and-coins/euro-coins/circulation-coins/national-sides-of-slovak-euro-coins/ – dizajn Kriváňa, autor. Neosvedčuje značky na konkrétnom ročníku.
- NBS, počty mincí: https://nbs.sk/bankovky-a-mince/eurove-mince/obehove/pocet-slovenskych-obehovych-eurominci/ – východisko pre kontrolu emisie podľa roku a nominálu. Pred schválením každého variantu uložiť presný riadok, snímku zdroja a jeho hash; tento PR netvrdí dokončenie kontroly jednotlivých ročníkov.
- ECB, Slovensko: https://www.ecb.europa.eu/euro/coins/html/sk.en.html – spoločné motívy najnižších nominálov. NBS a ECB konzervatívne patria do jednej línie pôvodu dizajnu; dva weby neznamenajú dva nezávislé dôkazy.
- ECB, spoločné strany: https://www.ecb.europa.eu/euro/coins/common/html/index.en.html – nominálne rozmery, hmotnosti a hrana. Pre 1/2/5 centov: 2,30/3,06/3,92 g; 16,25/18,75/21,25 mm; hrúbka 1,67 mm. Hrana 2 centov má drážku, pri 1 a 5 centoch je hladká. Ide o nominálne parametre, nie tolerancie výroby ani dôkaz pravosti.

Druhá nezávislá línia: odborne skontrolovaný fyzický referenčný exemplár s vlastnými makrofotografiami, identifikáciou držiteľa, meraním a podpísaným posudkom, prípadne nezávislý pôvodný archívny záznam. Zatiaľ nebol získaný ani zaradený do registra. Fotografie pre referencie a pre slepú sadu musia byť z rôznych fyzických mincí. Práva na metadáta a obrázky sa posudzujú oddelene. V tomto PR nie sú prevzaté obrázky zo zdrojov.

## Dátová štruktúra a povýšenie referencie

`api/pilot-reference.js` kontroluje úplnosť presného variantu. Povinné polia: krajina, názov krajiny, nominál, presný rok, motív, znak, mincovná a autorská značka, geometria, hrana a tri fyzické parametre.
Každé rozhodujúce pole vyžaduje dve zhodné nezávislé línie; skupinu určuje register, nie tvrdenie samotné. Každý prvok reference_evidence má:

```json
{
  "source_id": "ID z posúdeného registra",
  "field": "mint_mark",
  "value": "presne skontrolovaná hodnota, nie odhad",
  "source_url": "presná HTTPS adresa evidovaná v registri",
  "locator": "strana/riadok/oblasť fotografie a ID exemplára",
  "snapshot_sha256": "64 hex znakov odtlačku skutočného podkladu",
  "review_status": "approved",
  "reviewed_by": "identifikátor skutočného posudzovateľa",
  "reviewed_at": "YYYY-MM-DD"
}
```

Pre číselné polia musí byť value číslo. Uchovať celý nezmenený podklad a práva k nemu; samotný hash bez dostupného podkladu nestačí na odborné review. Záznam obsahuje aj `rights.metadata`, `rights.images`, `review` a prípadné `reference_conflicts`. Parser overuje štruktúru, zhodu hodnôt, presnú registrovanú URL, quorum a záznam posúdenia; nepreukazuje pravdivosť dokumentu ani identitu posudzovateľa. Nové zdroje a schválené varianty vyžadujú samostatný recenzovaný PR. Produkčná katalógová brána odmieta verified_reference bez úplnej dôkazovej kontroly. OCRE importér nič z toho nesmie obísť.

## Dve oddelené digitálne skúšky

1. `test/pilot-*.test.js`: deterministické softvérové kontrakty s výslovne syntetickými odpoveďami modelu a pozitívnou kontrolou. Preverujú rozpory, nečitateľnosť, poškodený znak, nulovú kvalitu, podobných kandidátov, nepodporovanú krajinu, chýbajúci rub, dôkazy a oceňovací príznak. NIE sú dôkazom obrazovej presnosti.
2. Nezávislá slepá obrazová sada: zatiaľ **PENDING_COLLECTION**, 0 skutočných prípadov. Minimálne 90 podporovaných prípadov (10 rôznych fyzických mincí na každú kombináciu) a 30 negatívnych (aspoň 5 v každej kategórii similar_year, other_country, damaged, unreadable, unsupported, missing_view). Negatívne damaged znamená poškodenie znemožňujúce čítanie rozhodujúceho znaku; podobný rok je nepodporovaný rok alebo nerozlíšiteľná číslica. Pridať podozrivé/replikové kusy ako unsupported bez tvrdenia, že obraz určí falzifikát.

Správca sady skontroluje ročník, nominál, krajinu a variant nezávisle od výstupu modelu; sporný ground truth vyradiť pred uzamknutím. Žiadny referenčný exemplár, jeho fotografia ani jeho ďalší záber nesmie byť v slepej sade. Vývojár nesmie použiť finálnu sadu na ladenie. Jedna fyzická minca je jedna primárna jednotka; ďalšie pohľady nie sú ďalšie nezávislé prípady. Známe tréningové/referenčné použitie vylúčiť a zdokumentovať; úplný tréningový korpus poskytovateľa modelu nepoznáme.

### Manifest a spustenie

`data/pilot/blind-manifest.json` zostáva prázdny, nie je fiktívnym výsledkom. Pred skúškou doplniť cases, source/reference specimen IDs a hashe všetkých referenčných fotografií. Každý prípad:

```json
{
  "case_id": "slepý identifikátor",
  "specimen_id": "jedinečný fyzický kus",
  "category": "supported",
  "expected_catalogue_id": "SK-EUR-002-2020-PILOT",
  "images": [{"path":"images/lice.jpg","mime":"image/jpeg","sha256":"skutočný SHA-256"}, {"path":"images/rub.jpg","mime":"image/jpeg","sha256":"skutočný SHA-256"}],
  "measurements": {},
  "label_review": {"reviewer":"skutočný posudzovateľ","reviewed_at":"YYYY-MM-DD"},
  "rights": {"status":"approved","basis":"doložené právo na konkrétne fotografie"}
}
```

Negatívny prípad má expected_catalogue_id null. missing_view obsahuje iba jeden pohľad. Uzamknúť status LOCKED, locked_at a custodian; uchovať hash súboru, referencií, commit, konfiguráciu modelov a prahy PRED odhalením výsledkov. Konfigurácia behu je JSON s commit (40 hex), model, micro_model, verify_model, coinprint_version a reference_sha256; overiť ju oproti nasadeniu. Kolektor posiela iba fotografie a merania, nikdy očakávané štítky:

```
node scripts/run-pilot.mjs MANIFEST.json https://TESTOVACIE-NASADENIE/api/analyze RUN-CONFIG.json RUN.json
npm run pilot:evaluate -- MANIFEST.json RUN.json
```

Kolektor pred prvou požiadavkou kontroluje všetky lokálne hashe obrázkov, práva a minimálne počty. Vyžaduje autenticky zdokumentovanú konfiguráciu testovacieho nasadenia; deklarovaný model v konfiguračnom súbore sám osebe nie je dôkazom runtime modelu. Spúšťanie môže spotrebovať AI kredit; nevykonáva sa v CI ani bez skutočných podkladov. Po odhalení výsledkov neladiť a znovu nemerať na tej istej finálnej sade.

### Kritériá digitálneho prijatia

- Nula kritických chýb: nesprávne automatické potvrdenie identity; povolenie ceny pri BLOCKED; identity pri BLOCKED; potvrdenie negatívneho prípadu.
- 100 % BLOCKED odpovedí má valuation_allowed false a identity null. Chýbajúci rub musí skončiť HTTP 400 bez AI volania. Technické chyby 5xx/timeout sú zlyhanie skúšky, nie úspešné odmietnutie.
- Aspoň 80 % správnych automatických potvrdení v KAŽDEJ podporovanej kombinácii. Všetko blokujúci systém nesmie prejsť len vďaka nulovým falošným potvrdeniam.
- Uviesť počty správnych/nesprávnych potvrdení, odmietnutí a chýb po kombinácii a kategórii. Pri nule chýb zo 120 nezávislých prípadov je jednostranná 95 % horná binomická hranica približne 2,47 %; nejde o dôkaz nulovej prevádzkovej chybovosti.

Pri kritickej chybe STOP, analýza príčiny, oprava a nová nezávislá finálna sada. Audit pripravenosti nenahrádza vyhodnotenie obrazovej sady. Pre tvrdú kontrolu pripravenosti uložiť uzamknutý manifest do data/pilot/blind-manifest.json a skutočný beh do data/pilot/blind-run.json; audit ich znovu vyhodnotí. Obrázky nezverejňovať bez práv a rozhodnutia správcu sady.

## Oceňovanie a produkčné overenie

Backend počíta príznak zo svojich výsledkov; request.valuation_allowed, status ani identity nesmú autorizovať ocenenie. `api/valuation-policy.js` kontroluje VERIFIED, bool true, identitu a prázdne blokátory. Budúci cenový endpoint musí použiť requireValuation na čerstvom serverovom výsledku alebo na serverovo overenom uloženom výsledku, nie na JSON zaslanom klientom. Samostatný cenový endpoint zatiaľ v tomto repozitári nie je; produkčný tok cenovej transakcie týmto PR nebol overený.

Pred fyzickým pilotom doložiť aktuálne CI, testovacie a produkčné smoke testy API, aktuálny commit/verziu/model, mobilný tok a blokovanie cenovej transakcie, keď bude existovať. Pozitívna kontrola musí používať skutočne overené referencie. Nikdy nepovýšiť kandidátov len kvôli zelenému testu.

## Fyzický pilotný protokol – ešte nespúšťať

Vstup: všetkých 11 bodov PRODUCTION_READINESS.md s dátumom, výsledkom PASS a overiteľným dôkazom; schválených všetkých 9 referencií; úspešná nezávislá digitálna skúška; menovaný odborný posudzovateľ a uzavreté práva.

- Sada: 5 nových fyzických kusov na každú kombináciu (45), plus 15 negatívnych kusov, aspoň 3 poškodené/nečitateľné, 3 iné krajiny, 3 iné nominály, 3 susedné nepodporované ročníky, 3 podozrivé/replikové kusy s odborným štítkom. Žiadny kus z referencií alebo digitálnej finálnej sady.
- Správca kusy očísluje, zapečatí očakávané identity a náhodné poradie; obsluha výsledky nepozná. Dvaja posudzovatelia uzavrú sporné referenčné štítky pred testom.
- Nástroje: váha s rozlíšením 0,01 g, posuvné meradlo 0,01 mm; overiť nulovanie a kontrolné závažie/rozmer pred a po meraní. Každý rozmer 3-krát, uložiť všetky hodnoty a priemer. Zaznamenať identifikátor prístroja a neistotu. Žiadne ničivé skúšky ani čistenie mincí.
- Navrhnuté konzervatívne limity pre tento experiment: odchýlka od nominálu najviac 0,10 g, priemer 0,20 mm, hrúbka 0,20 mm. To sú pravidlá skúšky, NIE úradné výrobné tolerancie. Musí ich vopred schváliť odborník; pri prekročení BLOCKED/review. Produkčné všeobecné tolerancie sú širšie, preto treba osobitne doložiť uplatnenie pilotných limitov pred začatím.
- Fotografovanie: dva skutočné mobilné telefóny rôznych modelov, difúzne svetlo a bežné interiérové svetlo; líce → rub → detail značky/roku → hrana podľa potreby. Zaznamenať model telefónu, OS, prehliadač, osvetlenie, ostrenie, odlesk, trvanie, opakovanie a presné súbory s hashmi. Jeden určený primárny beh na kus; ďalšie zábery reportovať ako opakované merania, nie nezávislé úspechy.
- Záznam: specimen_id, sealed_expected_id, hodnotiteľ, merania a neistoty, fotografie/hashes/rights, commit a deployment, modely a verzia CoinPrint, request ID, HTTP stav, úplná odpoveď, latency, verdict, blokátory, valuation_allowed, odborný výsledok, čas a poznámka k chybe. Súkromné údaje držiteľa nepublikovať.
- Úspech: 0 kritických falošných potvrdení, 100 % zákaz ceny pri BLOCKED, 100 % negatívnych prípadov odmietnutých, aspoň 4/5 správnych potvrdení v každej podporovanej kombinácii, žiadny nevyriešený pád/timeout a dokončený mobilný tok na oboch telefónoch. Pre n=60 aj nula chýb necháva približne 4,87 % jednostrannú 95 % hornú hranicu chybovosti; vyhodnotiť s obmedzeniami.
- STOP pri prvom nesprávnom automatickom potvrdení alebo povolení ceny pri neistote. Pozastaviť aj pri poruche meradla, strate slepoty, rozpore posudzovateľov alebo zámene fotografií. Uchovať logy, opraviť príčinu a pred opakovaním novú sadu/preregistráciu.

## CI a aktuálne blokátory

CI spúšťa npm run check a readiness:audit a uchová JSON artifact. Audit odmietne neúplné claimed verified_reference. Bežné CI môže byť zelené so správou NOT READY; npm run readiness:require je tvrdá predpilotná kontrola a musí teraz skončiť kódom 1. Ani prechod tohto inventúrneho auditu sám neosvedčuje pravdivosť dôkazov.

Zostáva: nezávislé podklady konkrétnych variantov a ich review, licencie, zber/uzamknutie skutočných fotografií, slepé meranie presnosti, produkčné a mobilné skúšky, schválenie a uplatnenie pilotných meracích limitov a dôkaz cenovej hranice v skutočnej integrácii. Fyzický pilot sa zatiaľ nezačal.

## Bezpečnostné sprísnenie pri kontrole 2026-11-11

Následná kontrola PR #11 našla sedem reprodukovateľných falošných potvrdení na syntetických odpovediach modelu. Oprava vyžaduje presnú normalizovanú zhodu zachovávajúcu interpunkciu a otázniky (alebo explicitný katalógový alias), viditeľný dôkaz a oblasť fotografie v aspoň dvoch priechodoch, presné serverové catalogue_id v oponentskom verdikte a žiadne požadované chýbajúce pohľady. Každý dodaný fyzický rozmer musí vyhovieť; dve zhodné merania neprebijú tretie rozporné. Prísnejšia zhoda môže zvýšiť podiel blokovaní; reálny vplyv treba zmerať na nezávislej sade.

Register zdrojov musí pre každé tvrdenie explicitne povoľovať príslušné pole v `supports`. Zhodné URL, hash a dve skupiny pôvodu samy osebe nepovoľujú použiť všeobecný opis dizajnu ako dôkaz ročníka alebo značky. Aktuálny register a návrhy sa týmto nepovyšujú ani nedopĺňajú o neoverené tvrdenia.

Collector vyžaduje `reference_sha256` z aktuálnych bajtov `data/catalogue.json`; CLI evaluator aj audit porovnávajú hash s týmto súborom. Zmena katalógu zneplatní starý benchmark. Hash lokálneho katalógu však sám nedokazuje zhodu so vzdialeným deploymentom: jeho commit, modely, prahy a použité referencie musí doložiť runtime audit. CI používa explicitný Bash s pipefail, aby `tee` neskrylo chybu integrity auditu.

Nové regresie zahŕňajú nesprávne roky 2009/2016/2022, SLOVENIJA, alternatívy v texte, značku LP, nečitateľné značky, rozpornú geometriu, chýbajúci dôkaz/pohľad, nesprávne ID oponenta a nahlásené podozrenie na falzifikát. Ide o simulované výstupy, nie dôkaz rozpoznania falzifikátov z fotografií. Produkčný cenový endpoint stále chýba a reálny cenový tok nebol overený.
