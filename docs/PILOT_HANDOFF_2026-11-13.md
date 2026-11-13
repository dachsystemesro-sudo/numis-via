# CoinPrint: izolovaná integrácia a prvý zber reálnych mincí

Stav kontroly 2026-11-13: **NOT READY FOR PHYSICAL PILOT / NOT MEASURED**.
Tento dokument je plán, nie záznam uskutočneného fotografovania. Existujúce protokoly ani audit sa nenahrádzajú: [matica 9 × 17 polí](evidence-audit/ISSUE_19_MATRIX.md), [slepý benchmark](BLIND_BENCHMARK_PROTOCOL.md), [fyzický protokol](../PILOT_SK_EUROCENTS.md) a [11 povinných kontrol](../PRODUCTION_READINESS.md) zostávajú záväzné.

## Čo je integrované a v akom poradí

Snapshot GitHubu a lokálneho fetchu; stav sa môže neskôr zmeniť. Pracovná vetva je `integration/pilot-review-20261113`, základ `main` = `037ad8ed935eb586bd428ee1e5cdefae1560fe45`.

| PR | Stav pri kontrole | Presný head | Závislosť / konflikt |
| --- | --- | --- | --- |
| [#11](https://github.com/dachsystemesro-sudo/numis-via/pull/11) | open, konflikt s main | `d14139c658f803202954fe1543968bfa816514c3` | pôvodná pilotná vetva; jej pôvodný samostatný návrh nepokrýva novšie opravy |
| [#17](https://github.com/dachsystemesro-sudo/numis-via/pull/17) | open, bez hláseného konfliktu s pilotnou vetvou | `c5f0ba27b76ebc5d93cc3396d7d9719dc10008fa` | bezpečnostné opravy sú už predkami #18 |
| [#18](https://github.com/dachsystemesro-sudo/numis-via/pull/18) | draft, bez hláseného konfliktu s pilotnou vetvou | `a0f9b1d344c21a597e1b792061d07d537d0a9034` | obsahuje #11, #17, workflow ochranu #16 a skoršie main |
| [#21](https://github.com/dachsystemesro-sudo/numis-via/pull/21) | draft, základ vetva #18 | `5787020dae9a718e4c38557b8222f66e553b2ffd` | audit bez povýšenia referencií |
| [#22](https://github.com/dachsystemesro-sudo/numis-via/pull/22) | draft, základ vetva #18 | `2a99a5857cc1e5628bc06b208c3ab9b2f827e5a0` | obrazový preflight a vyhodnotenie; paralelný s #21 |

V izolovanej vetve sa spojili aktuálne main → #18 → #21 → #22. Všetkých päť uvedených headov je jej predkom. Jediný technický konflikt pri tomto spojení bol `package.json`: zachované sú `evidence:audit`, `pilot:preflight`, ostatné príkazy a pripnutý Sharp 0.35.5 s lockfile. CI navyše spúšťa `evidence:audit`, ktorý kontroluje aj presnú reprodukovateľnosť matice. Automatický import, rozvrh a ochrany zápisu do main sú zachované; produkčný katalóg a aktuálne importované OCRE súbory sa oproti uvedenému main nemenia. Register zdrojov a deväť neoverených návrhov sa oproti #18 nemenia.

Odporúčaný spôsob review: tento nový konsolidovaný draft PR do main ako jeden konečný kandidát. Samostatné opätovné zlúčenie #17 alebo #16 by bolo nadbytočné. Alternatívne etapové začlenenie by vyžadovalo najprv #21 + #22 do vetvy #18, potom #18 do pilotnej vetvy a nakoniec aktualizovaný #11 do main; po každom pohybe treba nové CI na presnom heade. Nekombinovať obe cesty. Pôvodné PR ostávajú otvorené a nezmenené, ich uzavretie či zlúčenie vyžaduje rozhodnutie správcu.

Žiadna spoločná vetva ani main sa touto prácou neposunula. Budúce schválenie merge musí zohľadniť existujúcu automatizáciu nasadenia z main; tento návrh ju nevypína ani nespúšťa.

## Rozsah overenia a nová oprava

Syntetické regresie preverujú krajinu, nominál, presný rok vrátane podobných/neplatných číslic, dve strany, mincové a autorské značky, mikrosymboly, geometriu, fyzické rozmery, konkurenčné identity, rozpory a chýbajúce dôkazy. Kritický rozpor, nedostatok dôkazov alebo nejednoznačnosť znamenajú BLOCKED, `valuation_allowed=false`, `identity=null`. Nezávislosť pôvodu referencií určuje posúdený register; štyri modelové priechody nie sú štyri nezávislé katalógové zdroje.

Nový reprodukovaný nález: `null` namiesto vstupu, behu, jedného manifestového prípadu alebo zapečateného štítku vyvolal v evaluátore výnimku. Štyri nové regresie pred opravou zlyhali, po oprave prechádzajú: vzniká odmietavý report bez empirického prijatia či pripravenosti. Kontrola všetkých odpovedí vrátane neznámych/duplicitných kritických potvrdení zostáva zachovaná. Nemení sa identifikačný algoritmus ani bezpečnostné prahy.

Základná kombinácia mala 287 úspešných testov; po oprave je očakávaný celkový počet 291. Skutočný výsledok a presný commit sú v PR a jeho Actions logu. Tieto testy používajú simulované odpovede a pri dekódovaní abstraktné syntetické obrázky; nie sú meraním rozpoznávania mincí. Oceňovací helper je testovaný na serverovom výsledku, nie na dôveryhodnosti JSON od klienta. Samostatný cenový endpoint chýba a skutočná cenová transakcia nebola overená.

Aktuálny audit: integrita PASS, 8 produkčných rodinných záznamov, 0 overených referencií, pokrytie 0/9, 0 nezávisle doložených presných polí zo 153, 0 skutočných slepých prípadov, 11/11 predpilotných bodov otvorených. `readiness:require`, prázdny preflight, evaluator a suchý kolektor končia kódom 1 správne; nejde o zlyhané regresné testy. Kolektor hlási `execution=NOT_REQUESTED`. OCRE staging má 33 649 záznamov, import nie je dokončený; jeho úplnosť nie je podmienkou tohto pilotu. Posledný overený main CI [43312346251](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43312346251) a plánovaný import [43311942182](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43311942182) boli úspešné; import sa tu znovu nespúšťal.

## Chýbajúce podklady pre všetkých deväť variantov

Ku KAŽDÉMU riadku treba odborný dossier so skutočným exemplárom a dvoma nezávislými líniami pre každé rozhodujúce tvrdenie. Spoločné medzery: originálne dostupné podklady a ich SHA-256; presná krajina/nominál/rok a bežná obehová úprava; čitateľný motív, znak, mincová/autorská značka a prípadné symboly; ich presné polohy a geometria; hrana; kalibrované rozmery s neistotou; materiál iba v rozsahu doloženej metódy; konkurenčné varianty; práva a skutočné odborné review. Nominálna tabuľka nepreukazuje meranie ani pravosť konkrétneho kusu. Autor dizajnu nepreukazuje prepis drobnej značky. Ročná emisia vrátane súborov nepreukazuje obehovú úpravu exemplára.

| Variant / úplný zoznam medzier | Potrebné fotografie referenčného exemplára |
| --- | --- |
| [1 cent 2019](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-001-2019-pilot) | celá národná + spoločná strana, čitateľný rok 2019, značky/symboly/geometria, hladká hrana |
| [1 cent 2020](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-001-2020-pilot) | obe celé strany, rok 2020, značky/symboly/geometria, hladká hrana |
| [1 cent 2021](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-001-2021-pilot) | obe celé strany, rok 2021, značky/symboly/geometria, hladká hrana |
| [2 centy 2019](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-002-2019-pilot) | obe celé strany, rok 2019, značky/symboly/geometria, hrana vrátane drážky |
| [2 centy 2020](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-002-2020-pilot) | obe celé strany, rok 2020, značky/symboly/geometria, hrana vrátane drážky |
| [2 centy 2021](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-002-2021-pilot) | obe celé strany, rok 2021, značky/symboly/geometria, hrana vrátane drážky |
| [5 centov 2019](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-005-2019-pilot) | obe celé strany, rok 2019, značky/symboly/geometria, hladká hrana |
| [5 centov 2020](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-005-2020-pilot) | obe celé strany, rok 2020, značky/symboly/geometria, hladká hrana |
| [5 centov 2021](evidence-audit/ISSUE_19_MATRIX.md#sk-eur-005-2021-pilot) | obe celé strany, rok 2021, značky/symboly/geometria, hladká hrana |

Presné polohy a texty drobných značiek zatiaľ nepredpisujeme: musí ich doložiť odborník. Podklad môže vyžadovať viac makrozáberov. Nemožno vopred sľúbiť, že dva zdroje či dva kusy na variant postačia pre všetky polia.

| Možno automatizovať po overení dostupnosti a práv | Vyžaduje človeka / dôkaz mimo samotného parsera |
| --- | --- |
| Stiahnutie presných oficiálnych stránok NBS/ECB/mincovne, archivácia originálnych bajtov, dátum, hash a lokátor; kontrola zmien a emisných tabuliek | Posúdenie významu, nezávislosti pôvodu a použiteľnosti pre konkrétny rok/úpravu; doterajší audit je snapshot 2026-11-12, nie nové schválenie |
| Extrakcia všeobecných opisov a nominálnych parametrov, návrh porovnania | Prepis značiek, mikrosymbolov, geometrie, identita exemplára, merania, stav a vyriešenie rozporov; fotografia sama neosvedčuje pravosť ani zloženie |
| Kontrola formátu, byte/pixel hashov, známych duplicít, právnych polí a termínov | Skutočné vlastníctvo/súhlas, licencie a reprodukčné pravidlá, čitateľnosť a priradenie oboch strán k tomu istému kusu, skutočný podpis/review |

Pôvodné zdrojové snímky v audite chýbajú. V tomto prostredí bol priamy prístup blokovaný proxy; EUR-Lex texty v audite neboli získané pre anti-bot výzvu. Nahradenie originálov našimi poznámkami nie je dovolené. Dva weby NBS/ECB sú konzervatívne jedna línia dizajnu. Nové zdroje/referencie predložiť samostatným posúdeným PR; teraz sa nič nepovyšuje.

## Presný ďalší postup na skutočných minciach

1. **Najprv zber referenčných dôkazov, nie spustenie fyzického pilotu.** Určiť správcu, vlastníkov, odborných posudzovateľov a práva. Získať aspoň jeden referenčný exemplár každej kombinácie a ďalšie nezávislé podklady podľa jednotlivých medzier. Posúdiť všetkých 9 dossierov a nezávislé línie. Konfliktné/nejasné exempláre neschváliť; parser nepreukazuje pravdivosť podpísaného tvrdenia.
2. **Fotografovanie mobilom.** Mince nečistiť ani neupravovať. Použiť zadný fotoaparát, stabilnú podložku/stojan, neutrálne pozadie, difúzne svetlo a podľa reliéfu šikmé svetlo bez odlesku. Očistiť objektív, zaostriť na reliéf, bez digitálneho zoomu, portrétneho filtra, AI doostrenia či generovania detailov. Celá minca a okraj musia byť ostré a nezakryté. V jednej evidovanej session odfotiť národnú aj spoločnú stranu toho istého nepriehľadne označeného exemplára, potom makro roku, rozhodujúcich značiek/symbolov a hranu. Odborník priradí obverse/reverse podľa referenčného kontraktu; nespoliehať sa na odhad z názvu súboru. Mierku zachytiť osobitne; rozmery váhou/meradlom, nie odhadom pixelov. Originály uchovať súkromne, kópie bez EXIF/XMP/IPTC vytvoriť bez dopĺňania obrazového obsahu; uložiť reálne byte/pixel hashe a väzbu na originál. Použiť aspoň dva reálne modely telefónov a rozložiť svetelné podmienky naprieč prípadmi; opakované zábery toho istého kusu nepočítať ako nezávislé prípady. Limity sanitizovaných vstupov: jednorámcové JPEG/PNG/WebP, aspoň 512 × 512 px, najviac 25 Mpx a 10 MiB/súbor, odhad payloadu prípadu najviac 4 MiB.
3. **Dôležitý limit: najviac 5 obrázkov na požiadavku.** Najprv dve celé strany; zostávajú najviac tri doplnkové zábery. Referenčný dossier môže mať viac fotografií, modelová požiadavka nie. Ak všetky rozhodujúce dôkazy nemožno v tomto limite bezpečne ukázať, prípad je BLOCKED a príslušné skúšanie sa zastaví. Rozšírenie limitu či viacstupňový tok je samostatné návrhové a bezpečnostné rozhodnutie, nie úprava v tomto PR. Detaily sa nesmú potichu vynechať kvôli úspechu.
4. **Oddelená slepá digitálna sada.** Po referenciách získať najmenej 120 iných fyzických kusov: 90 podporovaných (10 pre každý variant) + 30 negatívnych (5 pre každú zo šiestich kategórií v protokole). Odporúčaný zber je najmenej 240 originálnych záberov, obe strany každého kusu, plus potrebné makrá/hrany. Päť missing_view prípadov má v modelovom vstupe zámerne iba jednu stranu: minimum modelových obrázkov je teda 235, nie zníženie úplnosti odborného dossieru. Referenčné a projektové tréningové kusy, ich obrázky/pixely ani ďalšie zábery nesmú preniknúť do testu. Korpus poskytovateľa zostáva neznámy a musí sa tak reportovať.
5. **Nezávislé označovanie pred výstupom modelu.** Správca pridelí nepriehľadné case/specimen ID. Posudzovateľ nezávislý od operátora určí presnú krajinu, nominál, rok, úpravu a rozhodujúce detaily; druhý posudzovateľ vyrieši rozpory pred uzamknutím. Nejasný ground truth nepoužiť ako podporovanú identitu. Štítky, odôvodnenia a skutočné review držať v oddelenom súkromnom `labels.json`; manifest ani model ich nedostanú. Uzamknúť inventáre, konfiguráciu a štítky pred behom podľa v2 schémy. SHA-256 chráni integritu bajtov, nie utajenie, identitu človeka ani dôveryhodné časové pečiatkovanie. Finálnu sadu nepoužívať na ladenie.
6. **Súkromné uchovávanie.** Zvážiť šifrované úložisko s obmedzeným prístupom; pri aktuálnom CLI POSIX adresár 0700 a súbory 0600 mimo repozitára, verejného CI a logov. Osobné údaje a GPS odstrániť z kópií, väzbu na držiteľa viesť oddelene. Evidovať vlastníka, právny titul, súhlas, účel a skutočný `retention_until`; po lehote vymazať aj zálohy alebo doložiť oprávnené predĺženie. Samotné chmod nie je šifrovanie ani cloudová prístupová politika. Windows potrebuje osobitne overenú ACL kontrolu. Podmienky spracovania/uchovania u modelového poskytovateľa treba schváliť pred odoslaním.
7. **Technická skúška a až potom reálny digitálny beh.** Získať schválený testovací endpoint a overiť commit, verziu, modely, implementačný a referenčný hash na skutočnom runtime. Formálny atestačný JSON nie je sám dôkazom zhody deploymentu. Preflight a suchý kolektor spustiť súkromne podľa protokolu; bez platných referencií a práv sa reálny beh nesmie začať. Kolektor aktuálne neposkytuje konfiguráciu autentifikácie chráneného preview: bezpečný prístup treba doriešiť, nie vypnúť ochranu. Nasadenie testovacieho runtime a akékoľvek platené modelové volania vyžadujú výslovné schválenie. V tejto úlohe sa žiadne nevykonali.
8. **Digitálne prijatie.** Aspoň 80 % správnych potvrdení v KAŽDOM variante a nula kritických chýb; všetky negatívne prípady bezpečne odmietnuť. Každý BLOCKED musí mať `valuation_allowed=false` a `identity=null`. Úmyselne chýbajúca strana: HTTP 400 bez AI volania. Timeout/5xx je technické zlyhanie, nie úspešná abstencia. Reportovať úplné počty podľa variantu/kategórie vrátane blokovaní a chýb; nula zo 120 ponecháva približne 2,47 % jednostrannú 95 % hornú hranicu chybovosti. Pri kritickej chybe STOP, uchovať dôkazy, opraviť príčinu a pripraviť novú nezávislú finálnu sadu.
9. **Až po všetkých 11 kontrolách fyzický pilot.** Existujúci protokol vyžaduje ďalších 60 nových kusov (45 podporovaných, 5/variant + 15 negatívnych), dva telefóny, trojité kalibrované merania a zapečatené identity. Úspech: aspoň 4/5 v každom variante, všetky negatívne bezpečne odmietnuté, nula kritických potvrdení/cenových únikov, žiadna nevyriešená technická chyba a dokončený mobilný tok. STOP aj pri strate slepoty, zámene strán, rozpore odborníkov či poruche meradla. Navrhnuté pilotné medze 0,10 g / 0,20 mm / 0,20 mm ešte nemajú odborné schválenie ani preukázané runtime uplatnenie; všeobecné dnešné medze sú 0,18 g / 0,30 mm / 0,30 mm. Toto PR ich nemení. Rozhodnutie a implementácia pilotnej politiky sú blokátor pred začatím, nie povolenie použiť širšiu toleranciu.

## Čo potrebuje ďalší dôkaz alebo schválenie

- Dôkazy a ľudské odborné review pre všetkých 9 referencií, skutočné fotografie a merania, práva, úložisko a nezávislé štítky; nič z toho nevytvára syntetická regresia.
- Schválený testovací runtime, bezpečný prístup, aktuálne smoke testy, pravdivá atestácia a osobitné povolenie plateného spracovania fotografií; dnes nevykonané.
- Mobilný tok s rozhodujúcimi detailmi do 5 obrázkov; iný tok vyžaduje samostatný návrh. Odborné schválenie a vynútenie pilotných meracích medzí; bez zmeny pravidiel potichu.
- Nameraný nezávislý digitálny benchmark, následne všetkých 11 predpilotných dôkazov. Produkčný runtime ani cenová transakcia tu neboli otestované. Merge do main a nasadenie ostávajú zakázané bez výslovného schválenia.

**Rozhodnutie: NOT READY.** Pripravený je izolovaný integračný kandidát a vykonateľný zberový plán. Najbližší krok je odborné získanie a posúdenie referenčných dôkazov, následne súkromný zber oddelenej slepej sady. Fyzický pilot sa nezačal a nie je povolený zeleným CI.
