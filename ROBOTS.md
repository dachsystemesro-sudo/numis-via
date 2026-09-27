# NUMIS VIA — Robotický tím

Tento súbor definuje automatizované roly projektu. Hlavný koordinátor riadi priority a žiadny robot nesmie obísť fail-closed pravidlá.

## 1. ORCHESTRATOR — riadiaci robot
- Určuje poradie práce podľa `PRODUCTION_READINESS.md`.
- Spája výsledky ostatných robotov.
- Nikdy neoznačí projekt za pripravený len preto, že deploy alebo CI prešli.
- Najvyššia priorita: presnosť, auditovateľnosť, fyzická overiteľnosť a férovosť.

## 2. CATALOGUE BOT — katalóg
- Synchronizuje povolené otvorené zdroje do stagingu.
- Zachováva zdroj, licenciu a pôvod každého údaja.
- Staging záznam nie je automaticky produkčný referenčný záznam.
- Konflikt alebo neúplný zdroj nesmie odomknúť ocenenie.

## 3. REFERENCE BOT — referenčné dôkazy
- Kontroluje rozhodujúce identifikátory proti nezávislým zdrojom.
- Rozlišuje viditeľný znak od jeho významu.
- Dva zdroje s rovnakým upstreamom sa nesmú tváriť ako dve nezávislé potvrdenia.
- Variant môže byť `verified_reference` iba po splnení referenčných pravidiel.

## 4. ADVERSARY BOT — oponent
- Aktívne hľadá dôvod, prečo je vedúca identifikácia nesprávna.
- Testuje zameniteľné krajiny, roky, nominály, značky, monogramy, motívy a geometriu.
- Nečitateľný znak = UNKNOWN/MISSING, nie domyslená hodnota.
- Rozhodujúci rozpor musí identifikáciu zablokovať.

## 5. REGRESSION BOT — testovací robot
- Udržiava regresné testy pre všetky už objavené chyby.
- Kritické prípady zahŕňajú SLOVENSKO/SLOVENIJA, 2020/2009/2022/2016, MK, Z verzus vymyslené LP a nečitateľné mikrodetaily.
- Kontroluje, že BLOCKED nikdy neprejde do valuation.
- Každá opravená kritická chyba musí dostať test proti návratu chyby.

## 6. PHYSICAL BOT — fyzická kontrola
- Vyhodnocuje hmotnosť, priemer, hrúbku a hranu, keď sú dostupné.
- Fotografia môže potvrdiť typ mince, ale sama osebe nemusí potvrdiť fyzickú pravosť.
- Fyzický rozpor blokuje potvrdenie.

## 7. SECURITY BOT — bezpečnosť
- Kontroluje vstupy, tajomstvá, oprávnenia, závislosti a rizikové dátové toky.
- API kľúče nesmú byť v repozitári ani vo výstupe klientovi.
- Preferuje minimálne oprávnenia a bezpečné zlyhanie.

## 8. LICENSE BOT — licencie a zdroje
- Kontroluje, či je povolené automatické spracovanie, komerčné použitie a zobrazovanie dát/obrázkov.
- Metadata a obrázky sa posudzujú oddelene.
- Nejasná licencia = nepoužiť v produkcii, kým nie je objasnená.

## 9. ECONOMICS BOT — ekonomika
- Sleduje náklady AI, cloudu, dát, platieb a transakcií.
- Preferuje bezplatné alebo lacnejšie riešenie, ak nemení bezpečnosť ani kvalitu.
- Oddeľuje obrat, výnos platformy a čistý zisk.
- Finančné modely označuje ako scenáre, nie garancie.

## 10. FAIRNESS BOT — férovosť
- Používateľ musí vedieť, čo je potvrdené, čo odhad a čo neznáme.
- Ocenenie nesmie spätne ovplyvňovať identifikáciu.
- Poplatky a provízie musia byť transparentné.
- Platforma nesmie využívať informačnú nevýhodu majiteľa mince.

## 11. RELEASE BOT — pripravenosť
- Sleduje CI, produkčný runtime, regresie, katalóg a fail-closed brány.
- Stav `READY FOR PHYSICAL PILOT` je povolený až po splnení všetkých digitálne overiteľných kritických podmienok.
- Stav `READY FOR PUBLIC LAUNCH` až po úspešnom fyzickom pilote a odstránení kritických chýb.

## Pravidlo riadenia
Roboti sú kontrolné a automatizačné roly implementované v kóde, testoch a GitHub Actions. Nie sú to nezávislí ľudia ani nepretržite bežiace AI procesy. Automaticky pracujú iba tam, kde je vytvorený workflow alebo naplánovaný beh. Hlavný koordinátor vyhodnocuje ich výstupy a rozhoduje o ďalšej technickej práci.
