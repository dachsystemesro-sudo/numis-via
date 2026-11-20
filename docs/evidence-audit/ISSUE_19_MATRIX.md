# Issue #19 – matica chýbajúcich referenčných dôkazov

Dátum kontroly: 2026-11-12. Základ: PR #18, commit `a0f9b1d344c21a597e1b792061d07d537d0a9034`.

**0/9 overených variantov. NOT READY FOR PHYSICAL PILOT.** Všetkých 153 buniek zostáva neoverených pre konkrétny exemplár. Pozorované všeobecné tvrdenie nie je schválená referencia.

Tento dokument sa generuje príkazom `node scripts/audit-reference-evidence.mjs --write`. `--check` overí dáta aj zhodu dokumentu. Audit nemení produkčné referencie, kvórum ani CoinPrint.

## Deväť variantov

| Variant | Emisný kontext NBS, mil. ks | Kontext dizajnu | Nominálne parametre | Značky / geometria / exemplár | Nezávisle potvrdené presné polia | Práva a expert |
| --- | --- | --- | --- | --- | --- | --- |
| SK-EUR-001-2019-PILOT | 32,020; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-001-2020-PILOT | 57,702; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-001-2021-PILOT | 14,669; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-002-2019-PILOT | 14,470; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-002-2020-PILOT | 25,122; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-002-2021-PILOT | 7,335; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-005-2019-PILOT | 4,045; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-005-2020-PILOT | 16,510; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |
| SK-EUR-005-2021-PILOT | 6,319; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |

## Zdrojové pozorovania, pôvod a práva

Zhodný dizajn na NBS a ECB nie je nezávislý výskum dvoch exemplárov. Nezistil sa pôvod umožňujúci ich počítať oddelene; ide o konzervatívne zoskupenie, nie dokázané kopírovanie. Mincovňa je osobitný vydavateľ, no samostatná línia dôkazu presného exemplára sa nepreukázala. Štandard a odkaz na jeho predpis nenahrádzajú nezávislé meranie.

Presné URL, lokátory, pozorované hodnoty a rozsah sú v [observation notes](../../data/pilot/evidence-audit/observations-2026-11-12.json). Podrobné bunky sú v [gap data](../../data/pilot/evidence-audit/gaps-2026-11-12.json).

### nbs-national

- Originál: [nbs-national](https://nbs.sk/en/banknotes-and-coins/euro-coins/circulation-coins/national-sides-of-slovak-euro-coins/); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `official-sk-design`; nezávislosť pre presný exemplár nepreukázaná. Conservatively grouped official design/issuer information; no distinct specimen-research provenance established. This is not proof of one page copying another.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `pending_application_review`. Attribution and unchanged source files; commercial accuracy checks recommended; coin reproductions refer to separate European Commission conditions.
- Podmienky: [presná stránka](https://nbs.sk/en/disclaimer_en/) – Disclaimer, paragraphs on information reuse and euro coin reproduction. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### nbs-mintage

- Originál: [nbs-mintage](https://nbs.sk/bankovky-a-mince/eurove-mince/obehove/pocet-slovenskych-obehovych-eurominci/); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `official-sk-design`; nezávislosť pre presný exemplár nepreukázaná. Conservatively grouped official design/issuer information; no distinct specimen-research provenance established. This is not proof of one page copying another.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `pending_application_review`. Attribution and unchanged source files; commercial accuracy checks recommended; coin reproductions refer to separate European Commission conditions.
- Podmienky: [presná stránka](https://nbs.sk/en/disclaimer_en/) – Disclaimer, paragraphs on information reuse and euro coin reproduction. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### ecb-sk

- Originál: [ecb-sk](https://www.ecb.europa.eu/euro/coins/html/sk.en.html); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `official-sk-design`; nezávislosť pre presný exemplár nepreukázaná. Conservatively grouped official design/issuer information; no distinct specimen-research provenance established. This is not proof of one page copying another.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `pending_application_review`. Accuracy, attribution, notice of free availability in sold documents, disclosure of modifications and linking conditions; exceptions require separate review.
- Podmienky: [presná stránka](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html) – Copyright, conditions 1–4 and named-author exception. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### ecb-common

- Originál: [ecb-common](https://www.ecb.europa.eu/euro/coins/common/html/index.en.html); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `official-euro-specification`; nezávislosť pre presný exemplár nepreukázaná. Official euro specifications/reproduction framework; a standards summary and its legal pointer are not independent specimen measurements.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `pending_application_review`. Accuracy, attribution, notice of free availability in sold documents, disclosure of modifications and linking conditions; exceptions require separate review.
- Podmienky: [presná stránka](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html) – Copyright, conditions 1–4 and named-author exception. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### mint-2020

- Originál: [mint-2020](https://www.mint.sk/index.php/emisny-plan-mincovne-2020); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `issuer-mint-set-context`; nezávislosť pre presný exemplár nepreukázaná. Mint-authored set context only. Independence from issuer material for exact specimen identity has not been established.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `unverified`. No application-specific permission verified. EC index is not itself the linked legal instrument; mint plans do not license images.
- Podmienky: neoverené; treba presný text a aplikačné posúdenie. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### mint-2021

- Originál: [mint-2021](https://www.mint.sk/emisny-plan-mincovne-2021); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `issuer-mint-set-context`; nezávislosť pre presný exemplár nepreukázaná. Mint-authored set context only. Independence from issuer material for exact specimen identity has not been established.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `unverified`. No application-specific permission verified. EC index is not itself the linked legal instrument; mint plans do not license images.
- Podmienky: neoverené; treba presný text a aplikačné posúdenie. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### ec-legislation

- Originál: [ec-legislation](https://economy-finance.ec.europa.eu/euro/euro-coins-and-notes/euro-coins/legislation-euro-coins_en); kontrola 2026-11-12; prístup `web_text_reviewed`.
- Pôvod: `official-euro-specification`; nezávislosť pre presný exemplár nepreukázaná. Official euro specifications/reproduction framework; a standards summary and its legal pointer are not independent specimen measurements.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `unverified`. No application-specific permission verified. EC index is not itself the linked legal instrument; mint plans do not license images.
- Podmienky: neoverené; treba presný text a aplikačné posúdenie. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### eurlex-specification

- Originál: [eurlex-specification](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?from=EN&uri=CELEX%3A32014R0729); kontrola 2026-11-12; prístup `blocked_challenge`.
- Pôvod: `official-euro-specification`; nezávislosť pre presný exemplár nepreukázaná. Official euro specifications/reproduction framework; a standards summary and its legal pointer are not independent specimen measurements.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `unverified`. No application-specific permission verified. EC index is not itself the linked legal instrument; mint plans do not license images.
- Podmienky: neoverené; treba presný text a aplikačné posúdenie. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

### eurlex-reproduction

- Originál: [eurlex-reproduction](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52011XC0210%2802%29); kontrola 2026-11-12; prístup `blocked_challenge`.
- Pôvod: `official-euro-specification`; nezávislosť pre presný exemplár nepreukázaná. Official euro specifications/reproduction framework; a standards summary and its legal pointer are not independent specimen measurements.
- Originálna snímka: **nezachytená**, SHA-256 = null. Direct retrieval of this exact URL returned curl exit 56, proxy CONNECT 403 and origin HTTP 000. Web extraction does not provide original response bytes; no original-page hash is claimed.
- Práva na metadáta: `unverified`. No application-specific permission verified. EC index is not itself the linked legal instrument; mint plans do not license images.
- Podmienky: neoverené; treba presný text a aplikačné posúdenie. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.

## Hash a technické obmedzenia

SHA-256 `45eb3c8229b2cdcda30e12ef0ce7f0824bd96994c923b7c9ee5734a615a90435` sa vzťahuje výhradne na naše uložené parafrázované poznámky. **Nie je to hash stránky NBS, ECB ani mincovne** a nepreukazuje pravdivosť obsahu. Originálne HTTP bajty neboli dostupné. Priamy NBS request z prostredia skončil proxy CONNECT 403 / HTTP 000; text bol čítaný cez webovú službu. EUR-Lex vrátil JavaScript/anti-robot výzvu, nie právne predpisy.

NBS: potrebná atribúcia, zachovanie zdrojových súborov a kontrola správnosti pre komerčné použitie; reprodukcie mincí majú osobitné podmienky. ECB: treba posúdiť atribúciu, presnosť, informovanie o bezplatnom pôvode pri predaji dokumentov a výnimky. Ide o zistené podmienky, nie právne schválenie produktu. Pri eurových obrázkoch zostávajú otvorené národné a spoločné strany aj pravidlá reprodukcie. V projekte nie sú zdrojové obrázky ani nové používateľské fotografie.

## Každý variant a každé pole

Každá bunka nižšie má stav **UNVERIFIED** pre presný exemplár. Identifikátory v stĺpci Kontext odkazujú na lokátory v observation notes. „0“ nezávislých presných polí sa nesmie zameniť za počet webov.

### SK-EUR-001-2019-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 1 cent | nbs-issue-1-2019 | Official denomination context is not independent specimen identification. |
| date | 2019 | nbs-issue-1-2019 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-1 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 2.3 | ecb-spec-1 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 16.25 | ecb-spec-1 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-1 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth | ecb-spec-1 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-001-2020-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 1 cent | nbs-issue-1-2020 | Official denomination context is not independent specimen identification. |
| date | 2020 | nbs-issue-1-2020 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-1 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat, mint-set-2020 | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 2.3 | ecb-spec-1 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 16.25 | ecb-spec-1 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-1 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth | ecb-spec-1 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-001-2021-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 1 cent | nbs-issue-1-2021 | Official denomination context is not independent specimen identification. |
| date | 2021 | nbs-issue-1-2021 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-1 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat, mint-set-2021 | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 2.3 | ecb-spec-1 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 16.25 | ecb-spec-1 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-1 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth | ecb-spec-1 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-002-2019-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 2 cent | nbs-issue-2-2019 | Official denomination context is not independent specimen identification. |
| date | 2019 | nbs-issue-2-2019 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-2 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 3.06 | ecb-spec-2 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 18.75 | ecb-spec-2 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-2 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth with a groove | ecb-spec-2 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-002-2020-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 2 cent | nbs-issue-2-2020 | Official denomination context is not independent specimen identification. |
| date | 2020 | nbs-issue-2-2020 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-2 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat, mint-set-2020 | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 3.06 | ecb-spec-2 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 18.75 | ecb-spec-2 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-2 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth with a groove | ecb-spec-2 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-002-2021-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 2 cent | nbs-issue-2-2021 | Official denomination context is not independent specimen identification. |
| date | 2021 | nbs-issue-2-2021 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-2 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat, mint-set-2021 | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 3.06 | ecb-spec-2 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 18.75 | ecb-spec-2 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-2 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth with a groove | ecb-spec-2 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-005-2019-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 5 cent | nbs-issue-5-2019 | Official denomination context is not independent specimen identification. |
| date | 2019 | nbs-issue-5-2019 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-5 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 3.92 | ecb-spec-5 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 21.25 | ecb-spec-5 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-5 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth | ecb-spec-5 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-005-2020-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 5 cent | nbs-issue-5-2020 | Official denomination context is not independent specimen identification. |
| date | 2020 | nbs-issue-5-2020 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-5 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat, mint-set-2020 | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 3.92 | ecb-spec-5 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 21.25 | ecb-spec-5 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-5 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth | ecb-spec-5 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

### SK-EUR-005-2021-PILOT

| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |
| --- | --- | --- | --- |
| country_code | SK | unverified / žiadny pozorovaný podklad | No independently evidenced country-code attribution to an examined specimen. |
| country_text | SLOVENSKO | unverified / žiadny pozorovaný podklad | Exact SLOVENSKO inscription has not been independently transcribed from the reference specimen. |
| denomination | 5 cent | nbs-issue-5-2021 | Official denomination context is not independent specimen identification. |
| date | 2021 | nbs-issue-5-2021 | Year exists in issuer table; photographed digits and precise variant attribution remain unverified. |
| main_motif | Kriváň | nbs-design, ecb-design | Shared official design descriptions are one lineage; exact specimen relief is unreviewed. |
| coat_of_arms | Slovenský štátny znak | ecb-design | General national-emblem description does not establish exact specimen detail. |
| mint_mark | — | unverified / žiadny pozorovaný podklad | Exact mint mark, punctuation and position lack two independent specimen evidence lines. |
| engraver_mark | — | unverified / žiadny pozorovaný podklad | Designer name must not be substituted for a readable monogram; exact mark and position are missing. |
| micro_symbols | — | unverified / žiadny pozorovaný podklad | Applicable symbols and their positions have not been established; absence is not proved. |
| geometry | — | unverified / žiadny pozorovaný podklad | Round nominal shape is not exact positional geometry; no audited macro images. |
| material | — | ecb-spec-5 | Nominal copper-covered steel is not a measured assay or independently verified specimen composition. |
| designer_name | — | nbs-design | General author attribution does not verify a specimen or its monogram. |
| finish | — | nbs-set-caveat, mint-set-2021 | Ordinary circulation versus set/proof-like status is unresolved; mintage counts include annual sets. |
| physical.mass_g | 3.92 | ecb-spec-5 | Nominal mass is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.diameter_mm | 21.25 | ecb-spec-5 | Nominal diameter is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| physical.thickness_mm | 1.67 | ecb-spec-5 | Nominal thickness is not a specimen measurement; calibrated measurement, uncertainty and reviewed limits required. |
| edge | smooth | ecb-spec-5 | Nominal edge type is not a two-source examination of the actual specimen edge. |

Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.

## Výsledok a ďalší krok

Nezávisle potvrdené presné polia: **0**; povýšenia: **0**; pripravenosť fyzického pilotu: **false**. Získané sú iba oficiálne opisné, nominálne a emisné kontexty. Hmotnosť či zloženie zo všeobecnej tabuľky nie sú výsledkom merania konkrétnej mince. Materiál copper-covered steel opisuje kompozit, nie doložené percentá zliatiny.

Pred povýšením treba legálne zachytiť originálne podklady s hashom, doložiť dve skutočne nezávislé línie na konkrétne tvrdenia, odborné posúdenie a samostatné práva na metadáta, zdrojové obrázky aj fotografie exemplárov. Issue #20 zostáva samostatnou nasledujúcou úlohou.
