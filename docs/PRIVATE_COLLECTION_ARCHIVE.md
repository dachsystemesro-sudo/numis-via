# Private Collection Archive – lokálna testovacia zbierka

Súkromný archív ľubovoľných mincí, nezávislý od produkčného katalógu a od povyšovania CoinPrint referencií. Nadväzuje na #25–#27, nepoužíva používateľove fotografie ako verejné testovacie fixtures. Kód neobsahuje sieťový klient, server, platený model, upload, mazanie, vydávanie pasu ani oceňovanie.

Tento samostatný draft má základ #27. Novšie získanie originálnych oficiálnych zdrojov je oddelené v [PR #29](https://github.com/dachsystemesro-sudo/numis-via/pull/29); jeho vetva ani súkromné originály sa tu neprepisujú. Zdrojový audit zdedený zo základu #27 je historický stav, nie zrušenie novších výsledkov #29.

## Spustenie na pripravenom Windows

Dvojklik na **SPUSTIT-ZBIERKU.cmd** otvorí lokálne Windows okno. Používa existujúci Node a Sharp z `npm ci`; nič neinštaluje. Pri prvom spustení lokálne skompiluje priložený `native/CollectionStorage.cs` systémovým .NET kompilátorom do ignorovaného `.local-runtime/`. Binárka nie je podpísaná vydavateľom. Kód sa nespúšťa cez PowerShell a nemení ExecutionPolicy, Defender, register, certifikáty ani existujúce ACL. Ak ochrana Windows zostavenie alebo spustenie odmietne, zastaví sa; žiadne odblokovanie ani obchádzanie.

Predvolený nový archív je `%LOCALAPPDATA%\NUMIS-VIA-PrivateCollection`, **mimo repozitára a synchronizácie**. Existujúci priečinok sa neprevezme ani neopraví: musí byť už platným súkromným archívom s overenou hlavičkou. Existujúci súkromný príjem šiestich snímok 1 centu 2020 zostáva nedotknutý; prototyp ho bez výberu nepovažuje za potvrdenú mincu a automaticky ho nemigruje.

Okno má zoznam mincí, počty a tieto operácie:

1. **Pridať mincu**: v Obrázkoch vybrať 1 až 30 fotografií jednej fyzickej mince naraz. Pridelí sa nové UUID `NVC-…`. Jedna minca môže začať jedinou fotografiou, čím sa nepotvrdzuje úplnosť capture sady.
2. **Doplniť fotografie**: vybrať existujúcu mincu a ďalšie snímky. Bajtovo totožná už priradená fotografia sa znovu nespracuje ani nepridá. Pri zmiešanej dávke sa dekódujú len nové originály.
3. **Predbežná karta**: uložiť názov/poznámku a prípadný návrh krajiny, nominálu a roka. Návrh sa uloží do `identity_proposal`; nikdy do potvrdenej `identity`.
4. **Otvoriť index**: nový súkromný offline HTML prehľad počtov, názvov, ID a stavov. Má CSP bez siete, formulárov a skriptov. Neobsahuje pôvodné cesty k zdrojovým fotografiám. Otvára sa lokálne v predvolenom prehliadači, nič sa neposiela na web.

Používateľ nemusí písať PowerShell príkazy. Prílohy, podrobné roly, merania a návrhy pasov vie agent spravovať cez rovnaké lokálne API/CLI. GUI v1 je zámerne obmedzené na pridávanie fotografií, návrhy kariet a index; nemá formulár na odborné schválenie, merania alebo dokumenty. Pri zrušení výberu sa vráti na prehľad; pri ostatnej chybe sa zastaví s konkrétnym sanitizovaným kódom.

## Štruktúra a verzovanie

```text
collection.json                       nemenné ID a verzia zbierky
coins/NVC-UUID/
  originals/SHA256.jpg|jpeg|png|webp    byte-identické originály
  working/PIXEL_SHA256.png             orientované sRGB PNG bez metadát
  cards/000001-CARD_SHA256.json        prvá nemenná karta
  cards/000002-CARD_SHA256.json        ďalšia verzia s hashom predchodcu
  reports/UUID.json                    technický report každej operácie
  documents/SHA256.bin                 voliteľné miestne dôkazy, bez spúšťania
  passport-review/UUID.json            len návrhy na odbornú revíziu
indexes/TIME-UUID.json|html             znovuvytvoriteľné lokálne prehľady
```

Karta sa zapíše až po úplnej kontrole celej dávky, uložení a overení fotografií a reportu. Staršie bajty sa neprepisujú ani nemažú. Rozpracovaný priečinok bez karty je `incomplete`, nie zaevidovaná minca. Pri neskorej chybe sa nové čiastočné súbory ponechajú; nie sú prijatým záznamom. Obnova vyžaduje posúdenie, nie automatické mazanie alebo prepis.

Pred ďalším zápisom sa overuje aktuálny hash karty. Súbežné vetvenie revízií sa pri čítaní odmietne namiesto tichého výberu posledného zápisu. Toto je prototyp pre jedného používateľa a jedného zapisujúceho agenta, nie viacpoužívateľová databáza. Nespušťajte súčasne dve relácie.

## Polia karty

[Prázdna JSON šablóna](../templates/private-collection-card.json) neobsahuje súkromné údaje. Nulové vzorové ID v šablóne nie je vytvorená skutočná minca; aplikácia generuje UUID. Čas vytvorenia karty nie je čas fotografovania.

| Pole | Význam |
| --- | --- |
| `schema_version`, `collection_id`, `coin_id` | verzia formátu a stabilné interné ID |
| `revision`, `previous_card_sha256`, `created_at`, `updated_at` | nemenná história a nadväznosť |
| `title`, `notes` | súkromný názov a poznámky používateľa |
| `archive_status` | `archived` až po technickom dokončení |
| `identification_status`, `identity_proposal`, `identity` | stav, oddelený predbežný návrh a potvrdená identita |
| `valuation_status`, `valuation_allowed` | vždy `valuation_blocked` / `false` v tomto prototype |
| `provenance` | držiteľský odkaz, dátum získania, pôvod a ľudské potvrdenie rovnakého exemplára |
| `rights` | autor snímok, oprávnenie na lokálne spracovanie a prípadná retenčná lehota; bez automatického mazania |
| `measurements` | skutočné opakované merania hmotnosti, priemeru, hrúbky a neistoty; prázdne hodnoty sa nenahrádzajú nominálom |
| `images` | ID, originál/pracovná kópia, SHA-256 bajtov a pixelov, rozmery, veľkosť, roly a nepotvrdený čas snímania |
| `images[].processing` | hash implementácie dekódera, verzie Sharp/libvips a samostatná verzia pipeline |
| `evidence_documents` | typ a hash súkromnej prílohy; samotné priloženie nie je odborné schválenie jej obsahu |
| `technical_report` | cesta a hash technického reportu; všetky reporty v histórii sa kontrolujú |
| `passport` | stav prípravy ľudskej revízie, blokátory a vždy `ready_for_issue=false` |

## Stavy sa nezamieňajú

- `archived`: technicky uložené dáta; nevyjadruje identitu ani úplnosť pohľadov.
- `provisional_identity`: existuje iba používateľov návrh. **`identity=null`**.
- `confirmed_identity`: rezervovaný budúci stav po dôkazovej bráne a nezávislom review. **V1 ho nevytvára ani neprijíma ako ručnú zmenu karty.** Musí vzniknúť až v samostatnom odborne recenzovanom integračnom návrhu; potvrdenie nemožno nahradiť prepnutím JSON príznaku.
- `valuation_blocked`: samostatná os platná pre všetky karty tohto prototypu, aj pri pripravenosti na revíziu.
- `ready_for_pass_review`: zostavené podklady na **ľudskú kontrolu**, nie pripravenosť vydať pas. Vyžaduje návrh identity, zadané roly oboch strán a hrany (pri známom roku aj detail roka), časové údaje k označeným pohľadom, doložené súkromné prílohy typov pôvod/práva/kalibrácia, držiteľské a fotografické údaje, ľudskú deklaráciu rovnakého exemplára a najmenej tri merania hmotnosti a priemeru s neistotou. Tieto deklarácie sa neoznačujú za nezávisle overené. **`identity=null`, `ready_for_issue=false`, `valuation_allowed=false` naďalej platia.**

`passport.blockers` ukazuje chýbajúce podklady. Roly sa nikdy nevymýšľajú z počtu fotografií. Jedna celá strana sa nesmie zároveň vykazovať ako detail. V1 používa obe národné/spoločné roly alebo obverse/reverse pre iné mince. Finálna CoinPrint revízia si naďalej vyžiada všetky rozhodujúce značky/symboly, skutočne nezávislé línie a kontext konkrétneho variantu.

## Čo sa nemusí robiť odznova

Každý originál má hash a stabilnú referenciu v karte. Pracovná kópia vzniká len pri prvom pridaní daných bajtov k minci. Pri opakovaní sa existujúce originály, pracovné kópie a reporty overia hashom, ale obrázok sa znova nedekóduje. Zmena poznámok, návrhu identity alebo rolí nevytvára nové obrazové dáta. Budúca zmena pipeline musí byť explicitná migrácia s novou verziou; staré originály a výsledky sa nesmú potichu prepísať.

Duplicitné dekódované pixely v rozdielne zakódovaných súboroch sú odmietnuté, nie maskované úpravou fotografie. Bajtovo totožná snímka už priradená inej minci je odmietnutá. Archív nevie zaručiť, že rôzne fotografie zobrazujú rovnaký fyzický kus; to zostáva ľudským dôkazom. Index pre správne počty overuje integritu aktívnych assetov, bez nového dekódovania. Pri veľkej zbierke je to zámerne konzervatívny, zatiaľ neoptimalizovaný postup.

## Ochrana dát

Windows: kontrolovaný lokálny pevný NTFS disk, cesty bez reparse/offline atribútov a hardlinkov, mimo OneDrive. Nové objekty dostanú chránenú DACL a vlastníka pri exkluzívnom vytvorení cez Windows API; FullControl majú iba aktuálny používateľ a SYSTEM. Existujúce rodičovské ACL sa nemenia. Zdrojové fotografie sa iba čítajú, overujú sa ich bajty, mtime a ctime. Samotné čítanie môže systémovo aktualizovať prístupový čas; nástroj ho spätne nezapisuje.

POSIX: adresáre 0700, súbory 0600, kontrola vlastníka a odkazov. Súkromná zbierka nikdy nesmie byť v repozitári. Cesty sa nepreberajú ako príkazy; natívne procesy dostávajú argumenty bez shellu. Dokumenty sa ukladajú ako neaktívne `.bin`, nie ako vykonateľné prílohy.

Limity fotografie: 10 MiB, aspoň 512 × 512, najviac 25 miliónov pixelov, jedna snímka JPEG/PNG/WebP. Pracovný PNG má limit 12 MiB a nová dávka 128 MiB v RAM. Žiadne zmenšovanie, retuš, ostrenie či úpravy na obídenie duplicít. Nedôveryhodný vstup môže zlyhať; zlyhané nové súbory sa ponechajú.

NTFS oprávnenia nie sú šifrovanie. Hashe a lokálna história nie sú podpis ani ochrana proti škodlivému procesu rovnakého používateľa, ktorý môže prepísať kód aj dáta. Archív nie je náhrada zálohy disku. Automatické zálohovanie na ďalší disk, šifrovanie, viacpoužívateľové zamykanie a obnovovací nástroj nie sú súčasťou v1.

## Budúce pasy a profil zbierky

`preparePassReview` vytvára nový nemenný súkromný JSON **DRAFT_NOT_A_PASSPORT**, viazaný na presný hash karty, fotografií a príloh. Tak bude možné podklady opätovne použiť bez nového fotografovania alebo dekódovania. Žiadny export nepotvrdzuje identitu, neoceňuje a nepovoľuje zverejnenie. Pred vydaním pasu bude potrebná samostatná dôkazová a odborná brána, kontrola práv, explicitný výber verejných polí a schválenie používateľa.

Súkromný profil je odvodený index: počet archivovaných, predbežne identifikovaných, potvrdených (v1 vždy 0), blokovaných na ocenenie, pripravených na ďalšiu ľudskú revíziu a rozpracovaných záznamov. Verejný profil sa v1 nevytvára a nie je automatickou kópiou súkromného indexu.

## API a overenie pre vývojárov

CLI operácie `init`, `add`, `revise`, `document`, `index`, `audit`, `pass-review` sú v `scripts/private-collection.mjs`, vždy s explicitným `--root` mimo repozitára. `add` bez `--coin` vytvorí mincu; s `--coin` doplní existujúcu. `revise --metadata` prijíma len povolené súkromné polia. Potvrdenie identity alebo oceňovanie sú zakázané. GUI používa to isté API, nie samostatnú slabšiu cestu.

Testy v `test/private-collection.test.js` používajú iba generované syntetické obrázky a dokumenty. Overujú natívne/OS oprávnenia, zachovanie originálov a časov, idempotentnosť s nulovým novým dekódovaním, append-only revízie, odmietnutie duplicít a poškodenia, pokusy o povýšenie identity, bezpečný index a blokované návrhy pasov. Syntetická pripravenosť na revíziu nie je dôkaz úspešného rozpoznania mince. Testovacie priečinky sa ponechávajú; nič zo zbierky používateľa sa nemaže.

Prvé reálne použitie vyžaduje len výber fotografií jednej mince v okne. Môžeš vybrať aj existujúce lokálne originály svojho 1 centu 2020; pôvodný príjem zostane zachovaný. Názov a návrh identity sú voliteľné. Práva, pôvod, presné capture údaje, merania a odborné posudky môžu pribúdať neskôr, kým zostávajú príslušné blokátory.
