# NUMIS VIA – checklist pripravenosti na fyzické spustenie

Projekt označíme READY FOR PHYSICAL PILOT až keď sú všetky položky nižšie splnené.

- [ ] CI na main je zelené.
- [ ] Produkčný Vercel deployment je READY bez kritických runtime chýb.
- [ ] CoinPrint API vracia aktuálnu verziu a fail-closed blokuje neisté prípady.
- [ ] Existuje sada presných variantov so stavom verified_reference a dohľadateľnou provenienciou.
- [ ] Regresná sada obsahuje zameniteľné krajiny, ročníky, mincovné značky, monogramy, opotrebované mince a falzifikáty.
- [ ] Zmeraná miera false-positive potvrdení na slepej testovacej sade.
- [ ] Žiadny BLOCKED výsledok nemôže vstúpiť do ocenenia.
- [ ] Fyzické merania (hmotnosť/priemer/hrúbka) sú overené na reálnych minciach.
- [ ] Používateľský tok foto líce → rub → prípadný detail/hrana je otestovaný na mobile.
- [ ] Je definovaný odborný review pre vzácne, drahé, konfliktné a podozrivé kusy.
- [ ] Licencie zdrojov a obrazových podkladov sú oddelené a auditovateľné.
- [ ] Pilotná séria reálnych mincí prejde bez kritického falošného potvrdenia.

READY FOR PUBLIC LAUNCH vyžaduje navyše úspešný fyzický pilot a odstránenie všetkých kritických chýb z pilotu.
