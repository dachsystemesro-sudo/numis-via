# Issue #20 – slepý obrazový benchmark v2

**NOT MEASURED / NOT READY. Skutočné slepé fotografie: 0. Overené pilotné referencie: 0/9.** Žiadne namerané rozpoznávanie fotografií sa týmto PR netvrdí. [Audit #21](https://github.com/dachsystemesro-sudo/numis-via/pull/21), jeho [matica 9 × 17 polí](https://github.com/dachsystemesro-sudo/numis-via/blob/5787020dae9a718e4c38557b8222f66e553b2ffd/docs/evidence-audit/ISSUE_19_MATRIX.md) a nezlúčený [PR #18](https://github.com/dachsystemesro-sudo/numis-via/pull/18) sú východiskom. Auditné poznámky nie sú schválené referencie ani fotografie.

## Čo mechanizmus kontroluje

Preflight je offline. Overí oddelené štítky, uzamknutie a hashe katalógu, konfigurácie modelov, projektových tréningových/referenčných inventárov, manifestu a runtime atestácie; tiež implementačný hash API aj vyhodnocovacích skriptov/lockfile a presnú verziu Node/dekodéra. Nesúlad sa nesmie vyriešiť znížením kvóra alebo prepisom výsledkov.

Každý obrázok sa musí reálne dekódovať ako jednorámcový JPEG, PNG alebo WebP. Porovnajú sa bajtový aj dekódovaný pixelový hash, MIME, atribúcia k exempláru/session/pohľadu, povinné pohľady a ich poradie. Kontrolujú sa duplicity v celej sade aj zhoda so známymi tréningovými/referenčnými hashmi. Odmietajú sa chýbajúce, poškodené, animované, príliš veľké súbory, symlinky, únik mimo adresára, súkromné EXIF/XMP/IPTC metadáta a príliš veľký API payload. Pre reálne vstupy je minimum 512 × 512 px, limit dekódovania 25 Mpx, súbor 10 MiB a odhad payloadu prípadu 4 MiB.

Prvý pohľad je líce (`obverse`), druhý rub (`reverse`), ďalšie sú `edge` alebo `detail` s `detail_of`. Rovnaké pixely pri inom kódovaní nestačia ako druhá strana. Zámerný negatívny `missing_view` je jediná výnimka: presne jeden obverse/reverse pohľad, `intentional_defect: missing_view`, zapečatený negatívny štítok a očakávanie HTTP 400 bez AI volania. Všetky ostatné prípady musia mať oba pohľady aj požadované detaily.

To **nedokazuje**, že správne označená fotografia naozaj ukazuje rub, správnu mincu, pravé razidlo alebo správny rok. Prekódovanie so zmenou pixelov, orezanie, ďalšie nafotenie rovnakého kusu a vymyslený identifikátor môžu uniknúť hashovej kontrole. Nezávislé odborné review a inventár fyzických kusov sú nevyhnutné. Formát review/atestácie a hash nepreukazujú pravdivosť tvrdenia ani totožnosť podpisujúceho.

## Ľudia a chýbajúce podklady

1. Referenčný odborník musí najprv doložiť všetkých deväť variantov a nezávislé dôkazové línie podľa #21. Preflight pre `dataset_kind: real` odmietne chýbajúcu produkčnú sadu `verified_reference`; referencie sa nikdy nevyrábajú kvôli benchmarku.
2. Správca slepej sady získa nové exempláre od zberateľov/držiteľov s právom fotografovať ich. Musia to byť iné fyzické kusy než referencie a známe tréningové kusy. Jedna fyzická minca je jeden prípad; ďalší uhol či osvetlenie nie sú ďalšia nezávislá vzorka.
3. Najmenej 90 podporovaných prípadov: aspoň 10 rôznych kusov pre KAŽDÝ z variantov 1/2/5 cent × 2019/2020/2021. Najmenej 30 negatívnych: aspoň 5 v kategóriách `similar_year`, `other_country`, `damaged`, `unreadable`, `unsupported`, `missing_view`. To je aspoň 120 samostatných fyzických kusov a pri minimálnej sade aspoň 235 rôznych obrázkov; potrebné detaily počet zvýšia. Tieto kusy a fotografie zatiaľ získané nie sú.
4. Zberateľ/fotograf poskytne skutočné líce, rub, vyžiadanú hranu a makrodetail ročníka/značiek. Použiť reálne telefóny, stabilnú mierku a neutrálne pozadie, rozličné difúzne a šikmé svetlo, prirodzené odlesky/opotrebenie a prípady s nečitateľným rozhodujúcim znakom. Žiadne generované či prevzaté webové obrázky vo finálnej reálnej sade.
5. Odborný posudzovateľ nezávislý od operátora určí krajinu, nominál, presný rok, značky, úpravu a prípustnosť vzorky bez výstupu modelu. Nejasný ground truth sa nesmie vydávať za podporovaný prípad. Podozrivý falzifikát/replika je negatívny `unsupported` vyžadujúci review, nie certifikované určenie falzifikátu z fotografie.
6. Správca modelového nasadenia doloží presný commit, modely, referenčný katalóg, verziu CoinPrint a runtime dôkaz pred odhalením výsledkov. Konfiguračný JSON sám nevie dokázať, ktorý model server skutočne použil. Existujúce API vracia verziu, nie kryptografický dôkaz nasadenia/modelov; atestácia preto vyžaduje samostatné faktické review. Chránené nasadenie sa nesmie kvôli skúške odomknúť.

Operátor nesmie byť správcom štítkov ani ich posudzovateľom. Identifikátory v dátach majú byť nepriehľadné; mená, adresy a záznamy vlastníctva zostávajú v oddelenom obmedzenom registri. Rovnaké meno prepísané na iný identifikátor nevytvára nezávislosť.

## Úložisko, práva a uchovanie

Vytvoriť samostatný šifrovaný súkromný adresár **mimo Git repozitára**, s POSIX oprávneniami 0700 a súbormi 0600. Žiadne verejné odkazy, GitHub prílohy, CI artefakty s fotografiami či očakávanými štítkami. `.gitignore` je len poistka, nie ochrana prístupu. Táto implementácia na Windows nepovoľuje vykonanie preflightu; chýba overenie ACL a POSIX bity tam nie sú dôkazom súkromia. Použiť podporované súkromné POSIX prostredie alebo najprv osobitne implementovať a otestovať kontrolu ACL.

Od držiteľa/fotografa treba explicitné právo na konkrétne zábery a ich spracovanie uvedeným AI poskytovateľom, účel, prístupy a termín uchovania/vymazania. Metadata, cudzie obrázky a vlastné používateľské fotografie majú odlišné práva. NBS/ECB všeobecné podmienky neudeľujú súhlas za používateľa. Pred exportom do sady odstrániť GPS/EXIF/XMP/IPTC, preveriť pozadie, tváre, doklady a identifikačné nápisy. Súkromný originál, oprávnený sanitizovaný export a záznam transformácie musí vedieť nezávisle dohľadať správca; `original_capture` znamená vlastný pôvodný zber, nie sľub nezmeneného súboru z telefónu.

Práva majú `basis`, nepriehľadné `consent_ref`, vlastníka, `storage: private`, `retention_until`; pred odoslaním overiť poskytovateľské uchovanie/tréning a právny titul. Príslušný správca musí po termíne zabezpečiť vymazanie vrátane záloh alebo zdokumentovať oprávnené predĺženie. Tento PR nenastavuje cloudové úložisko ani neudeľuje súhlasy. Záznamy konzol, shell tracing a verejné CI nesmú obsahovať fotografie, individuálne štítky, cesty, mená alebo tokeny.

## Súkromný zväzok v2 a poradie zmrazenia

Súbory sa pripravujú z reálnych podkladov; **v repozitári sa žiadny vyplnený reálny zväzok nevytvára**. `data/pilot/blind-manifest.json` ostáva pôvodným prázdnym `PENDING_COLLECTION` placeholderom v1. V2 je nová explicitná zmluva; starý manifest nesmie omylom prejsť ako výsledok.

| Súbor | Povinný obsah |
| --- | --- |
| `config.json` | schema_version `2.0`, dataset_kind `real`, frozen_at, commit (40 hex), coinprint_version, models `{primary,micro,verifier}`, HTTPS endpoint bez poverení/query/fragmentu, request_policy `{temperature:0,passes:4,images_only:true}`, evaluation_toolchain `{node,sharp}` a implementation_sha256 |
| `separation.json` | v2, druh sady, LOCKED/locked_at, scope `project_controlled_known_data`, complete=true, provider_training_unknown=true; training aj reference inventáre obsahujú specimen_ids, image_sha256 a pixel_sha256; odborné review |
| `labels.json` | v2, druh sady, SEALED/sealed_at, custodian, review; cases s case_id, category, expected_catalogue_id, expected_identity a odborným review; negatíva majú obe očakávané identity null a konkrétny dôvod |
| `manifest.json` | v2, druh sady, LOCKED/locked_at, odlišný custodian a operator; bindings obsahujú reference/config/labels/separation/implementation_sha256; cases bez očakávaných štítkov |
| `runtime.json` | v2, druh sady, deployment_id, endpoint, commit, models, coinprint_version, observed_at; hashe manifest/labels/config/reference/separation/implementation, review.kind `operator_runtime_attestation` a dostupný runtime dôkaz |
| `run.json` | Vytvorí až výslovne povolený kolektor. Zviaže všetky hashe vrátane runtime atestácie a inventára obrázkov, začiatok/koniec, verziu/modely a úplné súkromné odpovede. Existujúci výstup nesmie prepísať. |

Každé review má `status: approved`, nepriehľadný `reviewer`, UTC ISO čas `reviewed_at` a `evidence_sha256` skutočného oddelene dostupného podkladu. Samotný hex reťazec nie je podpis ani doložený podklad. Časy sú UTC s `Z`. Zber predchádza review štítkov, review predchádza zapečateniu a manifestu; runtime atestácia predchádza behu. Falošné časy alebo identifikátory nie sú dovolené.

Každý manifestový prípad má case_id, specimen_id, `provenance` (dataset_role `blind_test`, original_capture, captured_by, captured_at, capture_session_id), práva, privacy review, required_views, obrázky a voliteľné kladné číselné merania. Každý obrázok má súkromnú relatívnu path, mime, skutočný sha256 a pixel_sha256, view, podľa potreby detail_of, zhodný specimen_id/capture_session_id a view_review. Podporovaný štítok musí presne sedieť na jednu z deviatich krajina/nominál/rok kombinácií; `2020?` nie je presný rok.

Poradie:

1. Správca overí a sanitizuje všetky fotografie; zaznamená skutočné hashové inventáre projektu a práva. Neznámy tréningový korpus poskytovateľa sa nesmie označiť za úplne preverený. Inventár pokrýva len projektom kontrolované a známe použitia.
2. Odborník dokončí štítky; správca ich oddelí od manifestu a prevádzkového tímu. Review a zapečatenie prebehnú pred prvým odhalením výstupov.
3. Uzamknúť konfiguráciu a inventáre, spočítať SHA-256 ich presných bajtov aj aktuálneho `data/catalogue.json`. Implementation hash a verzie sa získajú exportmi `implementationHash()` / `evaluationToolchain()` zo `scripts/pilot-contract.mjs`. Hash zahŕňa aj hodnotiacu implementáciu a dependency lockfile.
4. Manifest zviaže tieto hashe. Potom sa spočíta jeho hash a doplní oddelená runtime atestácia. Tým nevzniká cyklus: atestácia nie je súčasťou manifestu, ale jej vlastný hash je povinný v behu a pri vyhodnotení.
5. Hash súboru je SHA-256 neupravených sanitizovaných bajtov. Pixelový hash je SHA-256 z UTF-8 prefixu `WIDTHxHEIGHT:rgba` + nulového bajtu + dekódovaných sRGB RGBA pixelov z pripnutého Sharp (`toColourspace('srgb').ensureAlpha().raw()`). Presný postup je v `inspectAssets`; testy kontrolujú aj alternatívne kódovanie rovnakých pixelov. Hashe pripravovať iba súkromne, nepublikovať fotografie či individuálne štítky.
6. Zaregistrovať hashový záväzok a kritériá u nezávislého správcu pred behom. **SEALED znamená záväzok presných bajtov, nie šifrovanie ani autentifikovaný časový podpis.** Samotná rovnaká CLI môže štítky pri preflighte čítať; operačné oddelenie sa musí vynútiť ACL/rolami a nezávislým správcom. Štítky sa nikdy neposielajú API a konzola vypisuje iba agregáty/chybové kódy.

## Bezpečné príkazy – teraz iba offline

Zo zdrojového projektu najprv `npm ci` a `npm run check`. `npm run pilot:preflight` nad dnešným prázdnym placeholderom správne skončí exit 1, `NOT_MEASURED`, bez požiadaviek na model. Pre súkromné zväzky používať priamo Node (bez `set -x` a bez verejných logov argumentov):

```sh
node scripts/pilot-preflight.mjs \
  --manifest "$PRIVATE_ROOT/manifest.json" --labels "$PRIVATE_ROOT/labels.json" \
  --config "$PRIVATE_ROOT/config.json" --separation "$PRIVATE_ROOT/separation.json" \
  --runtime "$PRIVATE_ROOT/runtime.json"

node scripts/evaluate-pilot.mjs \
  --manifest "$PRIVATE_ROOT/manifest.json" --labels "$PRIVATE_ROOT/labels.json" \
  --config "$PRIVATE_ROOT/config.json" --separation "$PRIVATE_ROOT/separation.json" \
  --runtime "$PRIVATE_ROOT/runtime.json" --run "$PRIVATE_ROOT/run.json"

node scripts/audit-readiness.mjs --benchmark-dir "$PRIVATE_ROOT"
```

Preflight môže byť štrukturálne platný aj pri výslovne syntetickej unit sade; `ready_for_execution` je vtedy vždy false. Evaluátor môže prejsť syntetickým pozitívnym kontraktom (`accepted=true`), ale vracia `SYNTHETIC_ONLY`, `empirical_accepted=false` a CLI exit 1. Audit pripravenosti nesmie tieto výsledky povýšiť na meranie.

Kolektor bez `--execute` vykoná iba preflight. **Skutočný beh nie je súčasťou tejto úlohy**; vyžaduje ďalšie výslovné povolenie, reálne nezávislé obrázky, práva, overené referencie a overené nasadenie. Až potom možno použiť rovnaké privátne argumenty s `node scripts/run-pilot.mjs`, `--execute` a `--output "$PRIVATE_ROOT/run.json"`. Výstup musí byť nový súkromný súbor mimo repozitára. Kolektor odmieta syntetické sady, presmerovania a neplatný preflight; všetky súbory overí pred prvým requestom a hash každého payloadu znovu preverí tesne pred odoslaním. Zmenený súbor zastaví beh. API dostáva iba images/measurements.

Hodnotenie a budúci readiness audit potrebujú stále tie isté súkromné obrázky a všetky zmrazené súbory, nie iba dodaný súhrn alebo run JSON. Upravená konfigurácia, katalóg, implementácia, štítky, inventár alebo modelová identita zneplatnia väzbu. Pri zlej či neúplnej odpovedi sa 5xx/timeout nepovažujú za úspešné abstencie.

## Kritériá a zastavenie

- Aspoň 10 podporovaných prípadov pre každý variant a aspoň 5 v každej zo šiestich negatívnych kategórií.
- Aspoň 80 % správnych potvrdení pre **každý** variant; všetko blokujúci model nemôže prejsť.
- Nula kritických chýb: nesprávne alebo negatívne VERIFIED, chybná identita, `BLOCKED` s povoleným ocenením/identitou alebo ocenenie pri chybovej HTTP odpovedi. Kontrolujú sa aj nadbytočné či duplicitné odpovede.
- Kritická chyba alebo porušená integrita znamená STOP, analýzu a opravu. Po odhalení výsledkov sa na tej istej finálnej sade nesmie ladiť ani tvrdiť nová nezávislá presnosť; treba novú oddelenú sadu.

Pripravený je mechanizmus a syntetické regresie. Chýbajú fotografie, skutočné expertne zapečatené štítky, práva, merania, súkromné úložisko s reálnymi oprávneniami a runtime dôkazy. Ani úspešné budúce obrazové meranie samo nesplní ostatné podmienky fyzického pilotu; cenový endpoint navyše stále neexistuje.
