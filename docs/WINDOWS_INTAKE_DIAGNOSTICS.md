# Lokálna diagnostika a príprava fotografií – PR #25

Základ opravy: `86bc8cc3b6a4217e56783b6bc3585e1729ba3d90` z PR #25. Táto oprava nemení NTFS bránu ani identifikačné/valuačné prahy. PowerShell helper `private-intake-storage.ps1` zostáva byte-identický. Nikde sa nepoužíva zmena ExecutionPolicy, `Bypass`, `Unblock-File`, odstránenie Zone.Identifier, zápis registra, výnimka Defendera ani úprava ACL existujúceho priečinka. Helper sa vždy vykonáva cez `-File`; jeho obsah sa nikdy nespúšťa cez `-Command`.

## Čo znamená pôvodná chyba

`windows_private_storage_unverified:probe_line_0_unknown_unknown` znamená, že Node nedostal úspešný, rozpoznateľný report helpera. PR #25 zlieval chýbajúci PowerShell/helper, timeout, odmietnutie spustenia a chybný JSON do jednej správy. **Nepotvrdzuje, že NTFS ACL sú nesprávne ani že príčinou určite je ExecutionPolicy.**

`Test-Path=False` bez presného testovaného objektu príčinu neurčuje. Neexistujúci nový archív po neúspešnej inicializácii je očakávaný; neexistujúci `scripts\private-intake-storage.ps1` je chýbajúci projektový súbor. Diagnostika tieto stavy rozlišuje.

Nové chyby označujú napr. `helper_missing`, `powershell_not_found`, `powershell_timeout`, `powershell_script_security_block`, `powershell_output_empty`, `powershell_json_invalid` alebo zachovávajú sanitizovaný stupeň/riadok chyby NTFS helpera. `powershell_script_security_block` je pozorované bezpečnostné odmietnutie, nie dôkaz jeho konkrétneho pôvodu; môže byť potrebné posúdenie správcom. Neznáme/lokalizované chyby zostávajú blokované.

## Priama diagnostika zo zdrojov tohto PR – bez opravného ZIP-u

V priečinku tejto pracovnej vetvy, bežným účtom a bez práv správcu:

```powershell
node scripts/diagnose-windows-storage.mjs
```

Na kontrolu už existujúceho archívu možno pridať `--vault "C:\ABSOLUTNA-CESTA-K-ARCHIVU"`. Bez parametra sa kontroluje náhodne pomenovaný **neexistujúci** cieľ v dočasnom priečinku. Diagnostika ho nevytvorí, nekopíruje fotografie a nemení kód. Nepotrebuje Sharp ani `npm.ps1`. `diagnostic_complete=true` a exit 0 znamenajú úspešné získanie diagnostiky a spustenie helpera. Pri predvolenom neexistujúcom cieli je `check.valid=false` očakávané; neznamená to overený archív. Identita a ocenenie zostávajú zablokované.

Výstup obsahuje iba sanitizovaný JSON, bez cesty k cieľu, používateľského mena, SID alebo celého stderr. Pri zablokovanom helperi je `diagnostic_complete=false`, exit 1 a odmietavý dôvod. Nepoužívajte obídenie politiky. Získaná diagnostika nie je odborný dôkaz o minci.

## Voliteľný pomocník pôvodného súkromného balíka

Nový reprodukovateľný balík na dvojklik a presný prehľad súborov sú opísané v [slovenskom návode na GitHubu](https://github.com/dachsystemesro-sudo/numis-via/blob/feat/windows-one-click-helper/windows-helper/README.md). Pôvodné obmedzenia zostávajú zachované; nový pomocník navyše odmieta akúkoľvek inú predbežnú chybu než očakávaný chýbajúci nový cieľ po úspešnej kontrole disku a rodičov.

Nasledujúca časť opisuje osobitný offline balík s `SPUSTIT.cmd`, `SPUSTIT.mjs` a pripnutým `fix-manifest.json`, nie automatický krok tohto PR. Tieto výstupné balíky, súkromné archívy a fotografie sa do repozitára nepublikujú. Pre samotnú diagnostiku použite príkaz vyššie; nie je potrebné sťahovať opravný ZIP z cloudového pracovného prostredia.

1. ZIP rozbaľte celý do nového lokálneho priečinka **mimo projektu NUMIS VIA** (napr. vedľa jeho priečinka). Pôvodný projekt ani fotografie neprepisujte. Spustite **SPUSTIT.cmd** bežným účtom, bez „Spustiť ako správca“. Ak Windows súbor blokuje, zastavte sa; nevypínajte ochrany ani neodblokovávajte súbory.
2. Vyberte priečinok existujúceho projektu s `package.json` a `scripts`. Program najprv vykoná iba diagnostiku.
3. Len ak helper smie bežať a je dostupný FullLanguage, otvorí sa výber fotografií v priečinku Obrázky. Vyberte presne šesť lokálnych JPG/JPEG/PNG/WebP, ktoré chcete skopírovať. Nástroj nevyberá súkromné fotografie za vás. HEIC a offline/cloudové zástupné súbory sa týmto importérom nepodporujú.

Alternatíva v existujúcom termináli projektu (nahraďte iba cestu k rozbalenému balíku, ktorý musí zostať mimo projektu):

```powershell
node "C:\CESTA-K-BALIKU\SPUSTIT.mjs" --project . --prepare
```

Iba čítanie diagnostiky, bez kópií a opravy kódu:

```powershell
node "C:\CESTA-K-BALIKU\SPUSTIT.mjs" --project .
```

Balík používa už nainštalovaný Node a závislosti existujúceho projektu. Nevykonáva `npm install`, nevolá sieť, model, GitHub ani cloud. Nevyžaduje zmenu `npm.ps1`; vstup je Node a `.cmd`.

## Presné správanie

Windows PowerShell načíta svoj vstavaný modul `Microsoft.PowerShell.Security` z vlastného `$PSHOME`. Nevyhľadáva náhradný modul v projekte ani nespolieha na modulový kontext zdedený z PowerShellu 7. Načítanie systémového modulu nezmení ExecutionPolicy, register ani trvalé premenné prostredia. Ak ho systém odmietne, diagnostika zostáva neúplná a blokovaná; report obsahuje sanitizovaný stupeň zlyhania.

Diagnostika číta efektívnu ExecutionPolicy a jej päť rozsahov, LanguageMode, verziu Windows PowerShellu, existenciu helpera, prítomnosť/ZoneId internetovej značky a stav podpisu. Neloguje jej HostUrl, používateľské cesty, účty ani SID. `-Command` obsahuje len samostatné čítacie príkazy; druhý proces vykoná pôvodný helper pomocou `-File -Mode Check` proti navrhnutému **neexistujúcemu** cieľu. Štruktúrovaná chyba „cieľ neexistuje“ dokazuje spustenie helpera, nikdy súkromnosť archívu. Tá sa musí následne úspešne overiť pri skutočnom Create/Check.

Pri odmietnutí spustenia sa všetko zastaví **pred kopírovaním fotografií a opravou projektu**. Výpis diagnostiky možno skopírovať na posúdenie. Nevkladajte celý priečinok Obrázky, súkromnú cestu archívu, fotografie ani `source-map.json` do issue/GitHubu. Pri Restricted, AllSigned alebo RemoteSigned s nepodpísaným internetovým súborom môže byť potrebné vaše výslovné schválenie a posúdenie správcom pre podpis alebo iný povolený spôsob; tento balík nič z toho nemení. [Microsoft: Execution Policies](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_execution_policies?view=powershell-5.1).

Po úspešnej diagnostike a výbere šiestich súborov:

- kontrola miestneho pevného NTFS zdroja, reparse/offline atribútov a odkazov; žiadna úprava pôvodných súborov;
- overenie presného základu menených súborov aj všetkých pôvodných projektových závislostí prípravného importéra podľa hashov (normalizácia CRLF/LF je povolená len pri porovnaní kódu/JSON); iné lokálne úpravy zastavia opravu pred zápisom;
- záloha pôvodných menených **kódových** súborov do nového `code-backup-<UUID>` v rozbalenom balíku; následne lokálna aplikácia diagnostickej opravy a testov. PowerShell helper sa neprepisuje, jeho internetová značka sa zachováva;
- úplné dekódovanie všetkých šiestich fotografií podľa pôvodných limitov PR #25 a SHA-256 bajtov aj orientovaných pixelov; poškodenie, duplicita alebo nepodporovaný formát zablokuje celú dávku pred vytvorením archívu;
- vytvorenie nového `%LOCALAPPDATA%\NUMIS-VIA-1c2020-<UUID>` mimo projektu. Iba nový archív dostane pôvodnú chránenú DACL aktuálny používateľ + SYSTEM; existujúce ACL sa nemenia. Všetky následné súbory/priečinky sa kontrolujú rovnakou NTFS bránou;
- byte-identické kópie do `incoming\PHOTO-001.*` až `PHOTO-006.*`, bez premenovania originálov. Kontrola hashov kópií a opätovne čítaných zdrojov, mtime/ctime zdrojov;
- `capture-draft.json`, `technical-report.json` a súkromná mapa zdroj → kópia. Náhodné specimen/session ID označuje pracovnú dávku, nepotvrdzuje rovnakú fyzickú mincu alebo fotografovanie v jednej sérii;
- žiadny finálny import, žiadna modelová požiadavka, žiadne VERIFIED ani ocenenie. `intakes` zostáva prázdny. Časy snímania, roly, súhlasy, merania, pôvod a posudky zostávajú prázdne/pending. Zaznamenaný čas operácie nie je čas fotografovania.

Názvy kópií sú nové ASCII názvy; obsah originálov je nezmenený. Výpočty pixelových hashov používajú dočasné RAM pracovné PNG; tieto odvodeniny sa pri príprave neukladajú. Read-only čítanie môže systémovo aktualizovať prístupový čas súboru; nástroj nezapisuje obsah, mtime, ctime ani metadáta originálu. Hash a úspešné dekódovanie nepreukazujú Samsung pôvod, pravosť mince ani kvalitu rozhodujúcich detailov.

Pri neskoršej chybe môžu zostať nové čiastočné súbory; nástroj **nič neodstraňuje ani automaticky neupravuje existujúci archív**. Nie sú považované za prijatý intake. Po zdokumentovaní príčiny sa použije nový názov. Výnimky sanitizuje; surové systémové chyby/cesty sa nezverejňujú.

## Nedokončené overenia

Linux regresné testy a simulácia chýb PowerShellu nenahrádzajú podpis/politiku konkrétneho počítača ani meranie úspešnosti rozpoznávania fotografií. Workflow overuje presný head PR: celý balík na Linuxe a intake/diagnostické testy na Windows s Node 22 a 24. Testy na Windows používajú skutočný PowerShell a NTFS syntetických dočasných archívov; neoverujú používateľov počítač ani fotografie. Skutočný stav a odkazy na CI konkrétneho commitu patria do popisu PR; samotná existencia workflow nie je úspešný výsledok.

Po príprave treba človekom overiť skutočný pôvod a dátumy šiestich súborov, rovnaký exemplár, čitateľnosť 2020, líce/rub, mincovú/autorskú značku, symboly a hranu; doplniť pravdivé roly a právny titul. Následne reálne merania a dva nezávislé odborné posudky podľa [postupu PR #25](FIRST_SPECIMEN_SK_2020.md). Žiadne chýbajúce údaje sa neodhadujú z názvu či mtime. Fyzický pilot zostáva **NOT READY**, `identity=null`, `valuation_allowed=false`, `ready_for_physical_pilot=false`.
