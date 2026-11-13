# Prvá minca: Slovensko 1 cent 2020

**Príjem je pripravený na technické skúšanie, referencia ani fyzický pilot nie sú schválené.** Cieľ `SK-EUR-001-2020-PILOT` je požadovaná identita, nie zistený výsledok. Nástroj nevolá model, neprenáša súbory na server, nepovoľuje cenu a nemá príkaz na VERIFIED. Všetky doterajšie obrázkové testy sú syntetické.

## Čo musí majiteľ urobiť osobne

1. Nájsť skutočný slovenský 1 cent s čitateľným rokom **2020**, doložiť jeho pôvod a prideliť mu samostatný obal. Nemiešať s ďalšou mincou. Rok a stav musí posúdiť človek.
2. Na svojom Windows počítači vytvoriť nižšie uvedeným `specimen:init` **nový súkromný lokálny archív**, potom Samsungom nafotiť obe strany, rok, značky/symboly a hranu.
3. Originály skopírovať cez USB priamo do `incoming`, pripraviť a pravdivo doplniť fotografický plán. Spustiť import; nezdieľať adresár, fotografie ani osobné údaje na GitHube.
4. Doplniť skutočné opakované merania, neistoty, prístroje/kalibráciu, pôvod a súhlasy v `dossier.json`. Prázdne položky neodhadovať podľa katalógu.
5. Získať dva nezávislé odborné posudky s podpismi a dostupnými pôvodnými zdrojmi; rozpory odovzdať oprávnenému finálnemu posudzovateľovi. Až kompletné, pravdivé podklady patria do samostatného odborného review referencie.

## Samsung: päť základných záberov a prípadné ďalšie makrá

Použite aplikáciu Fotoaparát, zadný fotoaparát a režim Fotografia. Podľa modelu/One UI sa názvy nastavení líšia. Pre tento import zvoľte **JPEG**, vypnite HEIF/RAW a Motion Photo pre novú sériu; nespúšťajte generatívne úpravy, remaster, filtre, retuš ani digitálny zoom. Nástroj nepodporuje HEIC/HEIF, DNG, videá ani animácie. Telefón ani jeho nastavenia nástroj nemení. [Oficiálne nastavenia Samsung](https://www.samsung.com/us/support/answer/ANS10001353/).

Overte si cloudové zálohovanie Galérie a právny titul uloženia ešte pred fotografovaním; tento program nevie skontrolovať telefón ani cudzie synchronizačné aplikácie. Nezahŕňajte tvár, mená, dokumenty či obrazovky. Osobitne rozhodnite o uchovaní originálov s GPS; pracovné kópie budú metadát zbavené.

Položte jednu mincu na čisté matné neutrálne pozadie, nemanipulujte s ďalšími kusmi v tej istej session. Mincu nečistite, neškrabte ani násilne neupínajte. Očistite objektív. Stabilizujte telefón, použite mäkké difúzne svetlo zboku, bez blesku a ostrého priameho slnka. Na reliéf podľa potreby pridajte šikmé svetlo. Ťuknite na mincu pre zaostrenie; pri odlesku zmeňte svetlo/uhol a urobte nový originálny záber. Nekorigujte nečitateľné číslice softvérom. Kontrolujte fotku zväčšenú pred otočením mince.

| Záber | Čo musí človek vidieť | `roles` v pláne |
| --- | --- | --- |
| Celá národná strana | Celý obvod, nápis, motív a ich rozloženie, bez prstov/orezania | `["national_full"]` |
| Celá spoločná strana | Celá minca, nominál a spoločný motív | `["common_full"]` |
| Makro roka | Samostatný ostrý záber všetkých číslic **2020** | `["year_detail"]` |
| Makro značiek | Mincovná a autorská značka, rozhodujúce symboly a ich vzájomná poloha | `["mint_mark_detail","engraver_mark_detail","symbols_detail"]` iba ak sú všetky naozaj čitateľné |
| Hrana | Ostrá hrana a jej charakter; viac uhlov, ak jeden nestačí | `["edge"]` |

Ak jedna makrofotografia nepokrýva všetky detaily, pridajte ďalšie snímky s príslušnými rolami. Každý detail musí byť priradený tomu istému exempláru a session. Predpísané Z a geometria z [auditu #24](evidence-audit/TASK_24_SOURCE_REVIEW.md) sú orientačný podklad na odborné porovnanie, nie automatické osvedčenie tejto mince.

Súbory musia byť jednorámcový JPEG/PNG/WebP, aspoň 512 × 512 px, najviac 25 Mpx a 10 MiB/originál. Import prijíma 5 až 30 záberov; súčet originálov a pracovných kópií v dávke má strop 128 MiB. Nástroj overuje plné dekódovanie a metadáta, **nerozpoznáva číslice ani optickú ostrosť**. `year_legibility`, prepis a pokrytie detailov sú výslovné ľudské vyhlásenia. Zámena dvoch skutočných mincí s rovnakými vyplnenými metadátami môže byť technicky nezistiteľná a vyžaduje odborný postup.

**Archív nie je modelová požiadavka.** Kompletný archív môže mať viac než päť snímok. Budúci výber má najviac päť, musí obsahovať obe celé strany a všetky rozhodujúce detaily a zmestiť sa do existujúceho 4 MiB odhadu payloadu. V budúcej modelovej konvencii ide prvá spoločná a druhá národná strana; ich priradenie musí potvrdiť odborník. Ak sa dôkazy nezmestia, výsledok zostáva BLOCKED. Tento nástroj žiadnu modelovú požiadavku nevytvára ani pri úplnom dossier.

## Windows: vytvorenie a príjem

Použite Node.js 22 alebo 24, klasický Windows PowerShell 5.1 a lokálny NTFS disk. Pracujte v bežnom termináli svojho používateľa, nie ako správca. V existujúcom checkout-e vetvy tohto PR použite `npm.cmd` (nevynucuje zmenu politiky pre npm.ps1):

```powershell
npm.cmd ci
$vault = Join-Path $env:LOCALAPPDATA 'NUMIS-VIA-1c2020'
npm.cmd run specimen:init -- --vault "$vault"
```

Priečinok `$vault` ešte nesmie existovať; jeho rodič musí existovať. Pri konflikte názvu zvoľte nový názov, nemažte existujúci archív. Inicializácia vytvorí iba nový leaf s chránenou NTFS DACL: plný prístup aktuálnemu SID a SYSTEM, žiadne ďalšie ACE. Existujúce rodičovské priečinky ani ich ACL nemení. Následné kontroly čítajú skutočné ACL/owner a odmietajú iných príjemcov, neoveriteľný stav, hardlinky, junction/reparse body, sieťové/cudzie disky a známe OneDrive lokality. Vytvoria sa `incoming`, `documents`, `intakes`, `specimen.json`, `capture.json` a prázdny `dossier.json`.

Pripojte odomknutý Samsung dátovým USB káblom, povoľte prenos súborov a v Prieskumníkovi **kopírujte** pôvodné snímky z `DCIM/Camera` priamo do `$vault\incoming`. Nepoužívajte messenger, e-mailové zmenšovanie ani cloudový editor. Súbory na telefóne nemažte pred bezpečným potvrdením príjmu a zálohovaním. [Oficiálny prenos Samsung → PC](https://www.samsung.com/us/support/answer/ANS10002839/).

```powershell
npm.cmd run specimen:prepare -- --vault "$vault"
notepad.exe "$vault\capture-draft.json"
```

Prepare načíta reálne názvy z `incoming` a doplní specimen/session ID a PHOTO ID. **Nedopĺňa roly, časy, čitateľnosť ani súhlas.** Existujúci draft neprepíše; ďalšiu verziu vytvoríte napr. `--capture capture-v2.json`. Prípustné sú bežné ASCII názvy JPG/PNG/WebP bez ciest; pri nevyhovujúcom názve môžete premenovať lokálnu kópiu, nikdy nemeníte obrazové bajty.

V pláne pri každom obrázku vyplňte pravdivý `captured_at` v UTC (`YYYY-MM-DDTHH:mm:ssZ`) a `roles` podľa tabuľky. Automaticky vyplnené specimen/session ID nemeňte. V `capture_check` uveďte nepriehľadný `reviewer_ref`, skutočný `reviewed_at` a až po prehliadnutí celej série potvrďte `same_specimen_confirmed`, `whole_sides_visible`, `decisive_details_visible`, `local_processing_authorized` ako true. `year_legibility` musí byť `readable`, `year_transcription` presne `2020`; pri neistote nepotvrdzujte, urobte nové snímky alebo žiadajte odborné review.

```powershell
npm.cmd run specimen:import -- --vault "$vault" --capture capture-draft.json
```

Výstup dá `intake_id` a `manifest_sha256`. Poznačte ich do súkromnej evidencie. Import najprv dekóduje celú dávku; chybný posledný obrázok neakceptuje predchádzajúce ako hotový príjem. Sériu uloží až po úspešnej kontrole do `intakes/INTAKE-...`: nezmenené originály, bezstratové pracovné PNG, kópia plánu a manifest. Pôvodný `incoming` ostáva nezmenený. Import je zamknutý proti súbehu; staršie intakes sa neprepisujú a opakovaný import rovnakých bajtov/pixelov je odmietnutý.

Pracovná kópia aplikuje EXIF orientáciu, prevedie farby do sRGB RGBA a uloží PNG bez EXIF/XMP/IPTC/ICC/komentárov. Nevykonáva orez, doostrenie, zväčšovanie, retuš či generovanie reliéfu. Je to zdokumentovaná odvodenina, nie tvrdenie o byte-identite originálu. Manifest obsahuje hash originálu, pracovnej kópie a orientovaných dekódovaných pixelov. Hash chráni integritu oproti záznamu, neosvedčuje identitu autora, skutočný čas ani pôvod mince.

### Keď Windows kontrola odmietne úložisko

Pri `windows_private_storage_unverified` **nič nekopírujte do neovereného priečinka**. Skontrolujte, že ide o nový lokálny NTFS archív mimo repozitára, cloudovej synchronizácie, UNC/sieťových diskov a junctionov. Žiadajte správcu, aby overil owner SID, chránenú DACL a ACE aktuálneho používateľa/SYSTEM; nepovoľujte Everyone/Users/Authenticated Users. Ak firemná politika blokuje helper `.ps1`, nástroj nesmie obísť ExecutionPolicy; správca musí posúdiť podpísanie helpera alebo povolený spôsob jeho spustenia. Tento projekt nemá automatický opravný príkaz pre existujúce používateľské priečinky. Nový archív možno vytvoriť pod iným novým názvom po vyriešení príčiny.

ACL nie sú šifrovanie a nebránia privilegovanému správcovi/malvéru v kontexte vlastníka. Rozhodnutie o šifrovaní, zálohách a firemnej politike robí vlastník/správca; program nemení BitLocker ani nastavenia systému. Iné synchronizačné aplikácie sa nedajú spoľahlivo automaticky vylúčiť: vlastník musí vybrať skutočne nezdieľanú lokalitu. [Microsoft Get-Acl](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl), [DirectorySecurity](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.directorysecurity?view=netframework-4.8.1).

## Merania, pôvod a práva

Otvorte súkromný `dossier.json`. Formulár má pre `mass_g`, `diameter_mm`, `thickness_mm` tri prázdne `readings`, `uncertainty`, `method`, instrument ID, rozlíšenie, nulovanie pred/po a kalibračný dokument s hashom a časovou platnosťou. Uveďte najmenej tri skutočné kladné číselné hodnoty, fyzikálnu metódu a kladnú neistotu určenú podľa meradla/odborníka. Program môže vypočítať priemer, neistotu nevymýšľa. Nominál z katalógu nie je meranie. Ak vhodné meradlo alebo kalibráciu nemáte, nechajte polia prázdne; dossier bude neúplny a blokovaný.

V `provenance` vyplňte nepriehľadný odkaz na vlastníka, skutočný dátum získania, zdroj/pôvod, stav a úpravu. Nezamieňajte proof-like/súborovú mincu za obehovú. V `rights` evidujte fotografa, právny titul metadát a obrázkov, doložený súhlas a termín uchovania. Osobné údaje držte oddelene a nepublikujte. Dokumenty patria iba do `documents/`; `document` je relatívna cesta, `sha256` hash skutočných bajtov. Napríklad hash zistíte lokálne `Get-FileHash -Algorithm SHA256 -LiteralPath ...`; do JSON patrí lowercase hash. Program súbory neotvára v externom prehliadači a ich obsah neloguje. Po lehote musí správca riešiť výmaz vrátane záloh alebo doložené predĺženie; program dôkazy automaticky nemaže.

## Dvaja odborníci a finálne rozhodnutie

`reviews` obsahuje dva prázdne formuláre. Posudzovatelia majú vypracovať prvé závery oddelene, bez výstupu CoinPrintu a bez záveru druhého odborníka. Každý zaznamená svoju skutočnú identitu prostredníctvom súkromného odkazu, nezávislosť od operátora/druhého hodnotiteľa a jej dôvod, čas, všetky povinné pozorovania, vlastný podpísaný posudok a jeho hash. Samostatne treba doložiť pôvod zdrojov; dvaja ľudia prepisujúci jeden web nie sú dve nezávislé dôkazové línie.

```powershell
npm.cmd run specimen:audit -- --vault "$vault" --intake INTAKE-SEM-SKUTOCNE-ID
```

Prvý audit bude zámerne neúplny (exit 1), no vypíše `dossier_content_sha256`. Po uzamknutí meraní, pôvodu, práv, zdrojov, konfliktov a modelového výberu uveďte tento hash aj importný `manifest_sha256` v oboch posudkoch. Posudky pripojte k reálnym súborom v `documents/`. Po zmene týchto vstupov treba nové posudky, nie iba prepísať hash v JSON. Konečný oprávnený odborník dostane obe samostatné stanoviská, vyporiada rozpory a priloží vlastné podpísané rozhodnutie s rovnakými väzbami. `sources` eviduje skutočné HTTPS URL, vydavateľa, lokátor, práva a dostupný originálny podklad s hashom; chýbajúce originály z #24 zostávajú otvorené.

Rozpory sú explicitne v `conflicts`; nesúhlas pozorovaní sa zisťuje aj automaticky a žiadny tretí/odmietavý posudok sa nesmie skryť. Pole `model_selection` obsahuje len posúdený výber existujúcich PHOTO ID a odborné potvrdenie pokrytia; poradie spoločná → národná → detaily/hrana. Nad päť snímok, chýbajúci detail alebo prekročený odhad payloadu zostáva blokátor.

**Kontrola podpisového súboru a hashu nie je overenie podpisu, oprávnenia alebo pravdivosti.** Program nemá PKI ani register oprávnených numizmatikov. Správca musí nezávisle overiť totožnosť, oprávnenie, autentické podpisy, nezávislosť, zdroje a licencie; nič z toho sa nevytvára z JSON. `documentation_complete=true` znamená len úplnosť a konzistenciu evidencie. Vždy ostáva `expert_signature_authenticity=HUMAN_VERIFICATION_REQUIRED`, `reference_approval=NOT_PERFORMED`, `model_request_status=BLOCKED`, `identity=null`, `valuation_allowed=false`, `ready_for_physical_pilot=false`.

Následné povýšenie vyžaduje samostatný recenzovaný referenčný PR a nezmenenú [dôkazovú bránu](../api/pilot-reference.js), dve skutočne nezávislé línie pre každé povinné pole, vyriešené rozpory a reálne schválenie. Automatický import tieto podmienky nenahrádza. Fyzický pilot naďalej vyžaduje všetkých 9 variantov, reálny slepý benchmark a všetkých 11 bodov [pripravenosti](../PRODUCTION_READINESS.md).
