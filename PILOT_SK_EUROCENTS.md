# NUMIS VIA – pilot SK eurocenty (návrh v1)

Stav: **PLANNED / NOT READY**. Tento dokument nie je potvrdením správnosti variantov ani licencií.

## Rozsah
Slovenské obehové mince 1, 2 a 5 eurocentov, ročníky 2019, 2020, 2021 (9 kombinácií). Iné krajiny, nominály, pamätné emisie a nejednoznačné varianty sú mimo automatického potvrdenia. OCRE sa importuje nezávisle; jeho dokončenie nie je vstupnou podmienkou tohto pilotu.

## Overené referencie – zatiaľ žiadne
Každý variant musí mať: identifikátor; nominál; krajinu; ročník; motív; rozhodujúce drobné značky (presný prepis a poloha); hmotnosť, priemer a hrúbku s toleranciou; dve skutočne nezávislé dôkazové línie; priamy odkaz na konkrétne tvrdenie; dátum overenia; licenciu metadát a zvlášť obrázkov. Doména zdroja sama osebe nepreukazuje správnosť tvrdenia. Bez zdokumentovania všetkých položiek sa nesmie označiť `verified_reference`.

## Predregistrovaný digitálny test
- Najprv uzamknúť referenčné dáta, verziu modelu, prahy a testovacie kritériá. Až potom odhaliť výsledky slepej sady.
- Cieľová sada: minimálne 10 nezávislých fotografických prípadov pre každú z 9 kombinácií (spolu aspoň 90), plus aspoň 30 negatívnych/zámenových prípadov: iná krajina, podobný ročník, nečitateľná značka, poškodenie, rozmazanie, odlesk, chýbajúci rub. Fotografie nesmú byť súčasťou tréningových alebo referenčných dát; skupinovať podľa fyzickej mince, nie podľa fotografie.
- Kritická chyba = automatické `VERIFIED` pri nesprávnom nomináli, krajine, ročníku alebo variante, alebo povolenie ocenenia pri `BLOCKED`.
- Kritérium pre *prvý obmedzený pilot*: **0 kritických chýb** v celej predregistrovanej sade, 100 % `BLOCKED` prípadov bez ocenenia; všetky nečitateľné rozhodujúce znaky musia viesť k blokovaniu. Počet automaticky potvrdených správnych prípadov a podiel blokovaní sa uvádzajú osobitne. Nula chýb v malej sade nie je dôkaz nulovej chybovosti v prevádzke.
- Pri kritickej chybe zastaviť postup, zdokumentovať príčinu, opraviť a vykonať novú slepú sadu; nepoužiť rovnakú sadu na dolaďovanie a finálne meranie.

## Produkcia a fyzický protokol
Overiť deployment a API smoke test, blokovanie ocenenia na backendovej hranici, mobilný tok líce/rub/detail a prístupnosť. Následne fyzicky zmerať a nafotiť mince na nezávislom telefóne, zaznamenať identifikátor mince, referenčný verdikt, merania, osvetlenie, kvalitu fotiek, odpoveď API, čas a výsledok. Pri prvom nesprávnom automatickom potvrdení alebo obídení blokovania ocenenia pilot ihneď zastaviť.

## Audit dôkazov
Všetky nepreukázané položky zostávajú `PENDING`. Stav `READY FOR PHYSICAL PILOT` môže vzniknúť až po zdokumentovaní všetkých predpilotných kontrol v PRODUCTION_READINESS.md. Samotné zelené CI a počet OCRE záznamov nestačia.
