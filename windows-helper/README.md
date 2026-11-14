# NUMIS VIA – pomocník na dvojklik

[Stiahnuť balík z GitHubu](https://github.com/dachsystemesro-sudo/numis-via/raw/refs/heads/feat/windows-one-click-helper/downloads/NUMIS-VIA-Windows-pomocnik.zip)

1. Rozbaľte **celý ZIP do nového priečinka mimo existujúceho projektu NUMIS VIA**.
2. Pred spustením si prečítajte `PRED-SPUSTENIM.txt` v balíku. Obsahuje presný zoznam súborov a zmien.
3. Dvojklik na **SPUSTIT.cmd**, bežným účtom, bez práv správcu. Nespúšťajte ho vo vnútri ZIP-u. Pri blokovaní Windows ochrany nevypínajte.
4. Ak sa nájde práve jeden podporovaný projekt s nainštalovanými závislosťami, vyberie sa automaticky. Inak vyberiete jeho priečinok. Po úspešnej diagnostike sa otvorí okno **Obrázky**; vyberte presne šesť fotografií.

Netreba ručne zadávať príkazy do PowerShellu. Pomocník nepripája počítač na GitHub, cloud alebo platený model. Potrebuje už nainštalovaný Node 22/24 a projekt PR #25/#26 so Sharp 0.35.5 po úspešnom `npm.cmd ci`. Žiadne závislosti neinštaluje ani nemaže.

## Čo vytvorí alebo upraví

Diagnostika je iba čítanie. Pri jej odmietnutí sa zastaví pred výberom fotografií a zmenou kódu. Získané hodnoty politiky sú pozorovanie, nie povolenie meniť politiku. Pre neoverenú príčinu nevymýšľa vysvetlenie.

Po výbere fotografií skontroluje známe súbory PR #25/#26, zálohuje pôvodné menené bajty do nového `code-backup-UUID` v rozbalenom balíku a pripraví tieto súbory projektu:

- `scripts/intake-storage.mjs`
- `scripts/windows-intake-diagnostics.mjs`
- `scripts/diagnose-windows-storage.mjs`
- `scripts/specimen-local-prepare.mjs`
- `scripts/windows-local-assistant.mjs`
- `scripts/windows-helper-ui.mjs`
- `test/specimen-intake.test.js`
- `test/specimen-local-prepare.test.js`
- `test/windows-intake-diagnostics.test.js`
- `test/windows-local-assistant.test.js`
- `docs/WINDOWS_INTAKE_DIAGNOSTICS.md`

Neznáme lokálne úpravy odmietne. Pôvodný PowerShell helper, package.json, package-lock.json, závislosti, API, katalóg ani prahy sa neprepisujú.

Celú dávku dekóduje pred vytvorením archívu. Pri úspechu vytvorí **nový** `%LOCALAPPDATA%\NUMIS-VIA-1c2020-UUID` s pôvodnou NTFS ochranou používateľ + SYSTEM. V ňom budú šesť byte-identických kópií v `incoming`, prázdne `documents`/`intakes`, `specimen.json`, `capture.json`, `dossier.json`, `capture-draft.json`, `technical-report.json`, súkromná `source-map.json` a `DALSIE-KROKY.txt`.

Kontroluje úplné dekódovanie, duplicity bajtov aj pixelov, SHA-256 kópií a opätovne čítaných zdrojov, mtime/ctime zdrojov. Originály nemení. Čítanie môže systémovo aktualizovať prístupový čas. Výber súborov a hash nepotvrdzujú Samsung pôvod, totožnú mincu alebo správnosť ročníka.

Žiadny finálny import, expertízne schválenie ani modelová požiadavka sa nespúšťa. Časy snímania zostanú `null`, roly `[]`, merania a potvrdenia nevyplnené. Vždy `identity=null`, `valuation_allowed=false`, `ready_for_physical_pilot=false`.

## Pri zlyhaní

Okno zobrazí konkrétny sanitizovaný kód a slovenské vysvetlenie. Pri Restricted, AllSigned, internetovej značke alebo firemnom obmedzení musí prípadný ďalší postup osobitne schváliť vlastník/správca. Pomocník nikdy nepoužije Bypass, Unblock-File, zmenu ExecutionPolicy, Defendera, registra ani existujúcich ACL.

Nič automaticky neodstráni. Pri neskoršej chybe môžu zostať nové čiastočné súbory a zálohy kódu; nie sú prijatým intake. Fotografie, `source-map.json` a súkromné cesty neposielajte na GitHub. Na kontrolu stačí sanitizovaný JSON z okna.

## Overenie balíka pre vývojárov

`python3 scripts/build-windows-helper.py --write` vytvorí foto-free ZIP a SHA-256 z explicitného zoznamu zdrojov a pripnutých základov #25/#26. `--check` kontroluje CRC, zoznam členov, všetky bajty proti aktuálnym zdrojom a kontrolný súčet. Windows CI používa rovnakú kontrolu a natívny príjem syntetických obrázkov. Dialógy a výber skutočných fotografií na konkrétnom počítači vyžadujú lokálne spustenie; úspech CI nie je rozpoznávacia presnosť ani pripravenosť fyzického pilotu.
