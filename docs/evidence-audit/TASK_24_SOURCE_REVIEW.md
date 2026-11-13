# Úloha #24 – získané referenčné podklady a kontrola zdrojov

**NOT READY FOR PHYSICAL PILOT. Žiadna referencia sa nepovyšuje.** Aktualizovaná [matica 9 × 17](TASK_24_MATRIX.md) dopĺňa, nemení ani nemaže [audit #21](ISSUE_19_MATRIX.md). Počet polí: **0 VERIFIED EVIDENCE, 138 PARTIALLY VERIFIED, 9 UNVERIFIED, 6 CONFLICT**. Čiastočné doloženie znamená všeobecný/ročný kontext; nezávisle potvrdených polí konkrétneho exemplára zostáva **0/153**, overených referencií **0/9**.

## Základ a integračný stav

Kontrola 13. 11. 2026 (Europe/Bratislava): #18 `a0f9b1d`, #21 `5787020`, #22 `2a99a58` a #23 `1c74412` sú otvorené drafty. Pri metadata kontrole nemali hlásené konflikty so svojimi základmi. #23 obsahuje #18 + #21 + #22 aj skoršie opravy #17. Jeho [CI 43387710571](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43387710571) prešlo 291/291 na presnom `1c74412eb4b843fe253336d9b29c4d05af2b9ddd`.

Aktuálne načítaný main `d840b4e6f7693f482d8366c1fe97a3a02110e1d3` má úspešné [CI 43403177195](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43403177195). Rozdiel oproti main použitému v #23 sú iba `data/import-state.json` a `data/staging/ocre.json`, nie identifikačný kód. Tento nový návrh má základ vetvu #23, aby sa znovu nerecenzoval celý integračný diff. CI filter povoľuje aj tento základ; produkčné workflow importu sa nemení. Vetvy pôvodných PR, main a jeho dáta zostávajú nedotknuté. Výsledok CI aktuálneho nového headu bude v jeho PR, nie odvodený zo staršieho runu.

Overené posledné Actions na nezmenených headoch: [#18 – 43183659540](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43183659540), [#21 – 43303125067](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43303125067), [#22 – 43310989522](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/43310989522), #23 vyššie; všetky SUCCESS. Existujúce Git prepojenie Vercelu môže po pushi alebo otvorení PR automaticky vytvoriť neprodukčný preview. Nie je to manuálne nasadenie ani runtime skúška a tento návrh ho nepovažuje za dôkaz pripravenosti; nastavenia nemení.

## Čo je nové oproti auditu #21

Register má 16 presných URL: 9 existujúcich dokumentov a **7 nových zdrojových záznamov**. Šesť nových dokumentov bolo dostupných aspoň ako text PDF, webový text alebo metadáta; siedmy je iba indexovaný výňatok blokovaného predpisu. Ani jedno nie je nová nezávislá expertíza exemplára.

| Nový dokument | Skutočne získaný rozsah | Nezávislosť / limit |
| --- | --- | --- |
| [Oznámenie NBS zo 7. júla 2008, PDF](https://www.nbs.sk/_img/documents/eurint/euro/ozn_tech.pdf) | Text 3-stranového PDF; Čl. 4 opisuje nápis, rok, znak, Z, hviezdy a relatívne polohy | Predpísaný národný dizajn NBS; nedokladá čitateľnosť či vyhotovenie kusu 2019–2021 |
| [Vestník NBS 26/2008, s. 593](https://nbs.sk/_img/documents/legs/2008/oznam_o_vydani_oznam_308-08.pdf) | Text oznámenia o publikovaní pod číslom 308/2008 Z. z. | Publikačný ukazovateľ toho istého aktu, nie druhá expertíza |
| [Slov-Lex, statická verzia 308/2008](https://static.slov-lex.sk/static/SK/ZZ/2008/308/20080809.html) | Metadáta: autor NBS, schválenie 7. 7. 2008, účinnosť od 9. 8. 2008; stránka označená informatívna | Statická verejná alternatíva ponúkaná portálom; zrkadlo rovnakého pôvodu, nie nezávislá línia |
| [Emisný plán mincovne 2019](https://www.mint.sk/index.php/emisny-plan-mincovne-2019) | Plán uvádza špeciálne neobiehajúce aj proof-like súbory | Primárny kontext výrobcu, bez zaradenia konkrétneho kusu k úprave |
| [Emisný plán mincovne 2021, PDF](https://www.mint.sk/sites/default/files/files/emisny_plan_2021.pdf) | Text 2-stranového plánu; februárový súbor má obe uvedené úpravy | Rovnaký pôvod ako HTML plánu, nepridáva nezávislé potvrdenie |
| [Bundesbank, FAQ o eurominciach](https://www.bundesbank.de/dynamic/action/en/tasks/cash-management/frequently-asked-questions/frequently-asked-questions-euro-coins/642694/frequently-asked-questions-about-the-euro-coins) | Tabuľka nominálnych rozmerov, hmotností a hrán; všeobecná mincovná značka Slovenska MK v kruhu, prvý rok 2009 | Samostatný vydavateľ; vlastné meranie/proveniencia tabuľky nepreukázané. Nepovažujeme za nezávislý experiment |
| [EUR-Lex 729/2014, Annex I](https://eur-lex.europa.eu/eli/reg/2014/729/oj/eng) | Iba indexovaný výňatok; pri otvorení HTML/PDF anti-robot výzva | Nie čítaný originál. Slúži na otvorenie konfliktu, nikdy na schválenie hodnoty |

Presná URL, názov, vydavateľ, deň získania, rozsah, lokátor, práva a poznámka o pôvode sú v [strojovom dossier](../../data/pilot/evidence-audit/source-review-2026-11-13.json) a generovanej matici. Časy vytvorenia dossier/histórie sú UTC; získanie webových poznatkov má presnosť dňa, nie vymyslenú sekundu stiahnutia. Nové publikované záznamy sú naše parafrázy a faktické poznámky, nie kópie dokumentov.

## Nezávislosť a otvorený rozpor

NBS PDF, Vestník, Slov-Lex a NBS/ECB opis národnej strany sa konzervatívne zoskupujú ako `official-sk-design`. Rovnaký text na viacerých hostiteľoch ani ďalší formát nepridáva kvórum. Tabuľky ECB, predpis a referenčný prehľad Bundesbank nepreukazujú dve nezávislé merania; zostávajú technickým kontextom. Mincovňa má vlastný emisný kontext, ale jej plán nedokladá mikrodetaily alebo bežnú obehovú úpravu držaného kusu. Dve nezávislé línie pre rozhodujúce tvrdenia žiadneho z deviatich exemplárov zatiaľ získané nie sú.

**Šesť hmotnostných buniek (2/5 centov × tri roky) je CONFLICT, predbežný.** Čítaná ECB a Bundesbank tabuľka uvádzajú 3,06/3,92 g; index EUR-Lex uvádza 3/3,9 g. Nevyvodzujeme, že bol dokázaný rozpor autentického predpisu alebo zmena mincí. Môže ísť aj o presnosť publikovania či extrakciu; vysvetlenie nebolo získané. Treba autentický Annex I, skontrolovať poznámky a príslušnú časovú verziu a požiadať odborníka o posúdenie vzťahu k nominálu a meraniu. Hodnoty sa nepriemerujú a CoinPrint dáta/tolerancie sa nemenia. Ostatných 138 buniek má len čiastočný kontext. Deväť buniek `country_code` nemá samostatné doloženie ISO priradenia k exempláru; názov SLOVENSKO je zdokumentovaný osobitne.

Čl. 4 teraz podkladá predpísané **Z a polohu napravo od znaku**, no nepreukazuje jeho prítomnosť na konkrétnej minci. Všeobecné MK v kruhu sa nesmie rozšíriť na nepozorovanú interpunkciu, razidlá, ročník alebo pravosť. Na spoločnej strane ECB opisuje glóbus s Európou vo vzťahu k Afrike a Ázii; tento doplnkový údaj je mimo pôvodných 17 polí. Žiadne drobné značky spoločnej strany sa z nečítaného obrázka nedopĺňajú.

## Archívy, obmedzenia a práva

Reálny reprodukovateľný GET probe všetkých 16 URL skončil **curl exit 56, HTTP 000, proxy CONNECT 403**. Ide o obmedzenie prostredia, nie dokázanú odpoveď 403 zdrojových serverov. Domény nie sú v aplikovanej sieťovej politike povolené a nástroj na zmenu tejto politiky nie je dostupný. Pri verejnom webovom čítaní boli niektoré dokumenty legálne dostupné ako extrahovaný text; služba neposkytla originálne HTTP/PDF bajty do pracovného priestoru. **Originálne archívy: 0, originálne SHA-256: nezískané.** Hash našich poznámok alebo metadát nie je hash zdroja. Zmena vzdialeného obsahu sa bez úspešného načítania nedá zmerať.

Nebola obchádzaná CAPTCHA, autentifikácia, proxy ani anti-robot výzva. Pri EUR-Lex sa po zistení výzvy nepokračovalo riešením challenge. Slov-Lex sám ponúka statickú verejnú verziu; tá nie je autentifikovaný obsah.

NBS vyžaduje posúdenie atribúcie a reprodukčných pravidiel; ECB presnosť, uvedenie zdroja, označenie úprav a pri platených dokumentoch informovanie o bezplatnom pôvode. VOP mincovne sú predajné podmienky, nie licencia na fotografie. Aplikačné, databázové a obrazové práva pre produkt zostávajú otvorené. Nové originály sa majú uchovávať súkromne; automatické zverejnenie je vždy vypnuté. V tomto PR nie sú prevzaté fotografie ani celé zdrojové dokumenty. Žiadny právny záver o všeobecnej voľnej licencii sa netvrdí.

## Reprodukovateľný nástroj

```sh
npm ci
npm run sources:check
npm run sources:require
```

Prvý príkaz kontroly funguje bez siete: overí pôvodný audit, zdrojové metadáta, chronológiu a hashovú reťaz histórie, rozsah tvrdení a presnú reprodukovateľnosť matice. `valid=true` znamená integritu tohto záznamu, **nie dostupnosť zdrojov ani pravdivosť expertízy**. Dostupnosť je samostatné `availability_passed=false`. `sources:require` musí pri dnešných medzerách skončiť 1 a nikdy nepovolí pilot.

Len pri oprávnenom sieťovom prístupe, s privátnym adresárom mimo repozitára:

```sh
npm run sources:probe -- --vault /absolute/private/source-vault
npm run sources:check -- --vault /absolute/private/source-vault
```

Probe robí jeden ohraničený HTTPS GET na presné registrované URL cez zdedený proxy/CA. Ignoruje curlrc, neposiela vlastné poverenia/cookies, nenasleduje presmerovania a neopakuje blokované požiadavky. Rozlišuje 404/410, presmerovanie na review, odmietnutý prístup, transportnú chybu, challenge, nepodporovaný MIME a zmenený/nečakaný obsah. HTML/plain text musí obsahovať kontrolné markery; PDF sa kontroluje na hlavičku `%PDF-`. To nepreukazuje pravdivosť ani plnú sémantickú správnosť PDF: jeho zmeny vyžadujú odborné review. Zmena hashov sa porovná s posledným úspešným načítaním, aj keď medzi tým zdroj zlyhal.

Úspešný podporovaný obsah sa uloží ako nezmenené bajty iba do privátneho vaultu (adresár 0700, súbory 0600), pod SHA-256 názvom; symlinky, verejné oprávnenia a umiestnenie v repozitári sú odmietnuté. Kontrola s vaultom overuje všetky archivované verzie z histórie, nielen poslednú. Bez vaultu explicitne hlási, že súkromné originály neskontrolovala. POSIX oprávnenia nenahrádzajú šifrovanie/ACL a Windows nie je týmto kontrolórom podporovaný.

Do `source-history/` sa pridá nový JSON cez exkluzívny zápis; starší súbor sa neprepíše. Obsahuje iba metadáta, kópiu vtedajšieho dossier a výsledky dostupnosti, nie dokumentové bajty. Hashová reťaz a Git review chránia auditovateľnosť, nie identitu autora alebo dôveryhodné časové pečiatkovanie. Matica sa regeneruje z nového záznamu. Úprava tvrdení vyžaduje nový záznam a ľudskú kontrolu; obsah stránky sa automaticky neprepisuje na schválené hodnoty. Nástroj nemá operáciu zápisu do produkčného katalógu alebo schvaľovania identity. Prípadné VERIFIED EVIDENCE kontroluje štruktúru dvoch posúdených línií, zhodných tvrdení a zodpovedajúce aktuálne retrieval hashe; bez potvrdenia načítania, pri zmene či nedostupnosti zdroja plný stav neprizná. Pravdivosť a dostupnosť dossier musí napriek tomu nezávisle posúdiť človek.

CI má offline `sources:check`; nemá pravidelný sieťový scraper ani súkromné originály. Regresie kontrolujú falošné kvórum zo zrkadiel, normatívny údaj vydávaný za exemplár, prepis rokov, konflikty, sfalšovaný hash indexu, zmeny histórie, chyby dostupnosti a bezpečné archivovanie. Všetky úspešné testové archívy a posudky sú výslovne syntetické, nie získané dokumenty či ľudské podpisy.

## Čo chýba pre každý variant a prvú referenciu

Všetkých deväť riadkov potrebuje fotografie **oboch celých strán, čitateľného presného roka, značky mincovne, Z a hviezd/ostatných rozhodujúcich detailov a hrany** so skutočnou provenienciou a právami. Pri 2 centoch doložiť aj drážku. Potrebné sú nezávislé prepisy/polohy a porovnanie konkurenčných krajín, ročníkov a úprav, nie iba zhoda všeobecného motívu Kriváňa. Rozdiel 1/2/5 centov sa nesmie určiť samotným spoločným národným motívom. Poškodené/nečitateľné detaily znamenajú blokovanie. Podozrenie na repliku/falzifikát vyžaduje odborný postup, obrazová skúška nie je certifikácia pravosti.

Treba odmerať hmotnosť, priemer a podľa protokolu hrúbku kalibrovanými prístrojmi, opakovane, s metódou a neistotou; zdokumentovať hranu a relevantnú úpravu. Meďou pokrytá oceľ je nominálny kompozitný opis, nie výsledok analýzy materiálu konkrétneho kusu ani percentá zliatiny. Nie sú získané žiadne nové fyzické merania, fotografie, držiteľské súhlasy, originálne snímky ani odborné schválenia.

Odporúčaná prvá cieľová kombinácia na získavanie dossier: **SK-EUR-001-2020-PILOT**, bez schválenia referencie. Jednocentový nominál nemá zistený hmotnostný rozdiel v uvedených kontextoch; to nie je dôkaz pravosti ani pripravenosti.

1. Získať dostupné originály predpisu/dizajnu/technických podkladov legálnym stiahnutím alebo od vlastníka, zachovať bajty, URL/verziu/dátum a overiť SHA-256 vo vaultu. Rešpektovať licencie; nepridávať originály do verejného PR bez samostatného právneho posúdenia.
2. Získať skutočný referenčný kus 1 cent 2020 s doloženým pôvodom a úpravou. Nezávislý odborník má bez modelového výsledku posúdiť obe strany, presné číslice, nápis, značky, geometriu, symboly, hranu, merania a podobné varianty. Značku mincovne nemožno presne doplniť iba z všeobecnej tabuľky; nevymýšľať chýbajúce znaky alebo pozície.
3. Pre KAŽDÉ povinné rozhodujúce pole doložiť dve skutočne nezávislé línie s rovnakým relevantným tvrdením, dostupným podkladom, lokátorom a skutočným review. Predpis + jeho zrkadlo ani ECB + prevzatá tabuľka nestačia. Vyplniť posúdený register s rozsahom `supports`, práva k metadátam/obrázkom a odborné review; nevyplňovať fiktívne osoby či dátumy.
4. Odborne oddeliť nominál, skutočné meranie a neistotu. Existujúca referenčná brána vyžaduje presnú zhodu evidenčnej hodnoty s referenciou; hodnoty sa nesmú zaokrúhliť či zmeniť len kvôli kvóru. Ak poctivé podklady nevedia vyhovieť schéme, pozastaviť príslušné pole a predložiť samostatný odborný návrh. Bez zmeny bezpečnostných prahov v tejto úlohe.
5. Až potom samostatný recenzovaný PR s kompletným dossier, bez rozporov, s úspešnými validačnými a fail-closed testmi. Odborné/licenčné schválenia a prípadná zmena schémy musia byť explicitné. Zlúčenie do main alebo produkčné nasadenie potrebuje výslovné schválenie vlastníka.

Ani prvá schválená referencia nepovolí fyzický pilot. Zostáva [plán #23](../PILOT_HANDOFF_2026-11-13.md), všetkých 9 variantov, nezávislý reálny benchmark, mobilné/runtime dôkazy a všetkých 11 predpilotných kontrol. Pri neistote stále platí `identity=null`, `valuation_allowed=false`, `ready_for_physical_pilot=false`.
