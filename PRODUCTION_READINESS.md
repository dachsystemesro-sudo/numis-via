# NUMIS VIA – overiteľné míľniky pripravenosti

## READY FOR PHYSICAL PILOT (pred prvým fyzickým testovaním)

Označenie READY FOR PHYSICAL PILOT povoľujeme iba po doložení všetkých nasledujúcich kontrol. Zelený GitHub workflow sám o sebe nestačí. Každý bod vyžaduje dátum, výsledok a odkaz na dôkaz; zaškrtnutie nie je trvalé, ak sa podmienka zmení.

- [ ] CI na aktuálnom commite main úspešne prešlo.
- [ ] Produkčný Vercel deployment je READY a kľúčové API endpointy prešli runtime smoke testami.
- [ ] CoinPrint API má potvrdenú aktuálnu verziu a blokuje neisté výsledky (fail-closed).
- [ ] Existuje zdokumentovaná sada presných variantov verified_reference s auditovateľnou provenienciou; staging záznamy sa za overené nepovažujú.
- [ ] Automatické regresné testy zahŕňajú zameniteľné krajiny, ročníky, značky, monogramy, poškodené mince a podozrenia na falzifikáty.
- [ ] Na nezávislej slepej digitálnej testovacej sade je zmeraná miera falošných potvrdení a stanovené kritérium prijatia.
- [ ] Je testom preukázané, že BLOCKED výsledok nemôže vstúpiť do oceňovania.
- [ ] Mobilný tok fotografovania líce → rub → prípadný detail/hrana prešiel technickým testom; prípadné limity sú zdokumentované.
- [ ] Je určený odborný postup review pre drahé, vzácne, konfliktné a podozrivé kusy.
- [ ] Licencie metadát a obrazových podkladov sú oddelené a auditovateľné.
- [ ] Je pripravený fyzický pilotný protokol: sada mincí, slepé očakávané výsledky, merania, zapisovanie chýb a pravidlá zastavenia.

## PHYSICAL PILOT (až po splnení predchádzajúcich bodov)

- [ ] Na skutočných minciach sú overené merania hmotnosti, priemeru a podľa potreby hrúbky.
- [ ] Používateľský tok je overený na skutočnom mobilnom telefóne s reálnymi fotografiami.
- [ ] Slepá séria reálnych mincí prešla bez kritického falošného potvrdenia; výsledky a počet prípadov sú zdokumentované.
- [ ] Kritické chyby nájdené počas pilotu sú opravené a opätovne otestované.

## READY FOR PUBLIC LAUNCH

Vyžaduje úspešný fyzický pilot, bezpečné spracovanie súkromných údajov, prevádzkové kontroly, jasné obchodné podmienky a potvrdené licenčné oprávnenia. Verejné spustenie sa nesmie automaticky odvodiť od úspešného CI alebo rastu katalógu.

## Záznam overení

| Kontrola | Dátum | Dôkaz / run / commit | Výsledok |
| --- | --- | --- | --- |
| CI na main | 2026-11-11 | [run 42901360841](https://github.com/dachsystemesro-sudo/numis-via/actions/runs/42901360841), commit 7a39790fd6b6f7ad3ee28259b754d263ebdd62aa | PASS: 63 testov a informatívny audit; platí iba pre uvedený commit |
| Vercel runtime | 2026-11-11 | [deployment FCzc43SsGesypsVRJHhMi6wd74aR](https://vercel.com/dachsystemesro-1672/numis-via/FCzc43SsGesypsVRJHhMi6wd74aR) | Deployment READY pre 7a39790; HTTP smoke test nepotvrdený, sieťová politika blokuje prístup |
| verified_reference sada | neoverené | — | čaká |
| Fyzický pilot | nevykonaný | — | čaká |

Podrobný rozsah overenia, nálezy PR #11 a limity sú v [REVIEW_2026-11-11.md](REVIEW_2026-11-11.md). Predpilotné políčka ostávajú otvorené; historický úspech CI nie je potvrdením aktuálnej pracovnej vetvy ani celkovej pripravenosti.

Aktuálny integračný návrh a zostávajúce blokátory k 2026-11-12: [INTEGRATION_2026-11-12.md](INTEGRATION_2026-11-12.md). Stav zostáva NOT READY FOR PHYSICAL PILOT.
