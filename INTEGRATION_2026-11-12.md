# CoinPrint – integračný návrh 2026-11-12

Stav: **technicky overený návrh v izolovanej vetve; NOT READY FOR PHYSICAL PILOT**. Výsledky regresií sú simulácie odpovedí modelu a lokálnych Git operácií, nie test presnosti na fotografiách.

## Obsah a hranice integrácie

- Východiskový main: `720710ccc819cd98a4b2f73b3ec57df3c3ebd0c7`; PR #17: `c5f0ba27b76ebc5d93cc3396d7d9719dc10008fa`; aktualizovaný PR #16: `d5ca16a`.
- Vetva `integration/coinprint-safety-20261112` obsahuje PR #17, aktuálny main, opravy PR #16 a dodatočné opravy z tejto kontroly. Konflikt PR #11 v `.github/workflows/ci.yml` je tu vyriešený zachovaním Bash pipefail aj artefaktu readiness-report. PR kontroly používajú presný head SHA; následná kontrola po OCRE importe naďalej kontroluje aktuálny main.
- `data/catalogue.json`, `data/import-state.json` a `data/staging/ocre.json` sú bajtovo zhodné s uvedeným main. Deväť návrhov pilotných referencií zostáva oddelených a neoverených. Produkcia ani žiadny spoločný main/pilot ref sa týmto návrhom neposúvajú.
- Pokus o požadované zlúčenie PR #17 do pilotnej vetvy zamietla automatická bezpečnostná kontrola s dôvodom chýbajúceho schválenia zmeny spoločnej vetvy. Zákaz nebol obídený pushom. PR #17 zostal otvorený; pôvodný PR #11 preto ešte nemá aktualizovanú zdieľanú pilotnú vetvu. Tento integračný návrh cieli do pilotnej vetvy a umožňuje schváliť konkrétny výsledok. PR #11 do main ani PR #16 do main neboli zlúčené.

## Dokončené bezpečnostné opravy

1. OCRE zapisujúci job aj push trigger sú obmedzené na main. Samostatný publikačný skript overuje event, ref, skutočný checkout, neprítomnosť cudzích commitov a neočakávaných zmien. Publikuje iba dva importné súbory. Po rebase opakuje regresie; pri chybe nepushuje. Oba pôvodné cron plány a manuálne spustenie na main zostávajú zachované.
2. Presný variant vyžaduje presný ročník; aj údaj bez parsovateľného roku, napríklad `9999`, `unknown` alebo `202O`, je rozpor, nie vynechaná kontrola. Značky a symboly zachovávajú veľkosť písmen, otázniky a interpunkciu. Geometria aj každý dodaný fyzický rozmer sa porovnávajú; nesprávny rozmer nemožno prehlasovať dvoma správnymi. Pole/objekt namiesto merania sa blokuje.
3. Každé uvedené konfliktné kritické pozorovanie sa zohľadní aj pri nízkom skóre. Duplicitné položky jedného priechodu nevytvoria nezávislé potvrdenie. Skóre musí byť konečné číslo 0–100. Stále sú potrebné aspoň dva priechody s viditeľným dôkazom a regiónom; toto nie je tvrdenie štatistickej nezávislosti modelov.
4. Oponentské pozorovania nesmú odporovať kladnému verdiktu ani označiť rozhodujúci znak za nečitateľný. Rozporné verdikty pre tú istú identitu a viac kladne podporených identít blokujú výsledok. Kladný verdikt musí potvrdiť presné serverové katalógové ID. Požadovaný chýbajúci pohľad zostáva blokátorom.
5. `BLOCKED` regresie vyžadujú `valuation_allowed=false`, `identity=null` a odmietnutie cez `requireValuation`. Podvrhnuté klientské status/identity/príznaky nemôžu autorizovať analýzu. Pozitívne syntetické kontroly overujú, že sa systém neopravoval trvalým blokovaním všetkých prípadov.
6. Referenčné dôkazy naďalej vyžadujú dve skupiny nezávislého pôvodu, presné registrované URL, hashe, ľudské review a rozsah `supports`. Aj voliteľné rozhodujúce mikrosymboly potrebujú vlastné dôkazy. Neznáme rozhodujúce polia, zdroj mimo deklarovaného zoznamu, netextová geometria, neplatný dátum, malformed konflikty a schválené obrazové práva bez právneho podkladu sa odmietajú. Zhoda s hashom zamknutého katalógu zostáva povinná pri CLI benchmarku/audite.

## Overenie

| Kontrola | Výsledok |
| --- | --- |
| Pôvodné rozšírené scenáre pred opravou | 23 reprodukovaných zlyhaní; ide o chyby nájdené počas vývoja |
| Finálne `npm run check`, Node 24.22.1, integračný obsah | 181 PASS / 0 FAIL |
| Finálne `npm run check`, samostatný PR #16 | 77 PASS / 0 FAIL |
| Cielené API + referenčné kontroly | 85 PASS / 0 FAIL |
| OCRE publikačný skript | 14 testov so samostatnými dočasnými lokálnymi bare remotes: schedule/manual/push, zakázané refy/eventy, cudzie commity, staged/unstaged zmeny, no-op, úspešný rebase a zlyhanie validácie po rebase |
| Bash a collector/evaluator syntax, YAML, git diff whitespace | PASS |
| Readiness audit | integrity=true, verified_reference=0, pokrytie=0/9, skutočné slepé prípady=0, otvorené predpilotné položky=11, ready=false |
| `readiness:require` | exit 1 – očakávané odmietnutie nesplnenej pripravenosti, nie zlyhaná regresia |

Presné finálne head SHA a GitHub Actions odkazy sú zaznamenané v popise integračného PR po dokončení CI. Lokálne testy nenahrádzajú GitHub kontrolu finálneho commitu.

## Nevyriešené riziká a ďalší postup

- **Zdieľaná pilotná vetva:** vyžaduje výslovné schválenie integračného návrhu; automatická kontrola zablokovala pôvodný merge #17. Až po schválenom posune pilotnej vetvy možno opäť potvrdiť mergeability a CI pôvodného PR #11 voči vtedy aktuálnemu main. Pri ďalšom importe OCRE zopakovať kontrolu aktuálnosti main.
- **Fyzický pilot:** 0/9 overených variantov, 0 slepých obrazových prípadov, 11 nesplnených predpilotných podmienok. Potrebné sú nezávislé referenčné exempláre a review, osobitné práva, uzamknutá sada aspoň 90 podporovaných + 30 negatívnych prípadov, runtime/modelové dôkazy, produkčné a mobilné smoke testy, odborné postupy a schválené/vynútené pilotné limity meraní. Užšie pilotné tolerancie sa touto integráciou automaticky nepovoľujú ani nevynucujú.
- **Ocenenie:** reálny cenový endpoint v repozitári stále nie je. Dokázané je správanie analýzy a odmietnutie na pomocnej serverovej bráne pri simulovaných chybách; skutočná cenová transakcia a serverové overenie uloženého výsledku nie sú overené.
- **Fotografie a pravosť:** zatiaľ bez dôkazu obrazovej presnosti, schopnosti odhaliť falzifikát či pravdivosti referenčného tvrdenia. Kvalitný hash/review záznam sám osebe neoveruje obsah fotografie alebo zdroja. Produkčný smoke test ani platený obrazový benchmark sa počas tejto integrácie nespustili.
- **OCRE:** plánované importy na main uspeli, ale sieťové timeouty sa môžu opakovať. Celý katalóg ešte nie je dokončený; jeho dokončenie nie je podmienkou ohraničeného SK pilotu. Živý zapisujúci workflow nebol testom spustený.

Odporúčanie: schváliť najprv konkrétnu integráciu do pilotnej vetvy, overiť nové CI/mergeability PR #11 a až potom samostatne rozhodovať o zlúčení do main. Žiadny z týchto softvérových krokov neoprávňuje začať fyzický pilot.
