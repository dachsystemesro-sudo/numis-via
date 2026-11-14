# Audit dôkazov – issue #19

Vstupom je nezlúčený PR #18 na `a0f9b1d344c21a597e1b792061d07d537d0a9034`. Tento nadväzujúci návrh má obsahovať iba auditné dáta, dokumentáciu, ich validátor a testy. Produkčný katalóg, deväť pending kandidátov, register pre produkčné overovanie a CoinPrint API sa nemenia. Issue #20 je samostatná úloha.

- [Deväťriadková matica a rozpis všetkých 153 buniek](ISSUE_19_MATRIX.md).
- [Pozorované tvrdenia, presné URL, lokátory, podmienky a pokusy o prístup](../../data/pilot/evidence-audit/observations-2026-11-12.json).
- [Strojovo čitateľné medzery každého variantu a poľa](../../data/pilot/evidence-audit/gaps-2026-11-12.json).

`npm run evidence:audit` overí schému, väzby, hash poznámok a reprodukovateľnosť matice. `npm run check` vykoná všetky existujúce regresie aj testy auditu. `node scripts/audit-reference-evidence.mjs --write` deterministicky obnoví maticu; nezískava dáta zo siete a nič nepovyšuje na referenciu.

Poznámky vznikli čítaním verejných primárnych stránok NBS, ECB, Mincovne Kremnica a indexu Európskej komisie cez webovú službu. Všetkých deväť priamych požiadaviek na evidované URL zastavil proxy CONNECT 403; od originálu sa neprijal HTTP obsah. EUR-Lex cez webovú službu tiež nevrátil obsah právnych predpisov. Hash preto patrí našim poznámkam, nie stránkam vydavateľov. Konkrétne originálne snímky a ich hashe zostávajú nezískané.

Oficiálny opis Kriváňa a nominálne parametre sú použiteľné ako kontext auditu. NBS uvádza jednotlivé roky a počty, pričom zahŕňa aj ročníkové súbory; mincovňa pri súboroch 2020 a 2021 uvádza viac úprav. Žiadny z týchto údajov nie je meraním alebo nezávislým určením konkrétnej mince. Autor dizajnu nie je prepis jeho monogramu. Zhodná informácia NBS/ECB sa nepočíta dvakrát; samostatná doména nedokazuje nezávislosť.

Metadáta vyžadujú aplikačné posúdenie podmienok, zdrojové obrázky neboli zaradené do projektu a ich práva zostávajú otvorené. Používateľské fotografie ani súhlasy neboli získané. Odborné review, kalibrované merania, presné značky a polohová geometria zostávajú potrebné pri všetkých deviatich kandidátoch. `material`, `designer_name` a `finish` sú doplnené auditné otázky; tento PR nimi nemení produkčnú schému ani neoznačuje neznámu vlastnosť za neprítomnú.

Výsledok: **0 povýšení, 0 nezávisle potvrdených presných polí, 0/9 verified_reference, ready_for_physical_pilot=false**. Úspešný audit potvrdzuje konzistentnosť záznamov o medzerách, nie pravdivosť každého externého tvrdenia, schválené licencie alebo presnosť rozpoznávania fotografií.

Jediná úprava existujúceho CI je zahrnutie cieľovej vetvy PR #18 do filtra pull requestov, aby sa tento izolovaný nadväzujúci PR testoval na presnom head SHA. Importné workflow, plány, nasadenie ani produkčné nastavenia sa nemenia.
