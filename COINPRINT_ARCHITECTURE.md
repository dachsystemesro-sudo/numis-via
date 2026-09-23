# CoinPrint verzia trinásť – fail-closed CoinPrint 13.6

Identita sa uzamkne iba vtedy, keď dva nezávislé primárne priechody súhlasia
na nomináli, texte alebo krajine, letopočte, hlavnom motíve a geometrii a tretí
oponentský priechod nedokáže kandidáta vyvrátiť.

Ocenenie používa výhradne `valuation_allowed`. Stav `BLOCKED` nikdy nesmie
pokračovať do cenového modulu.

## Ďalšie produkčné kroky

- pripojiť licencovaný katalóg s variantmi a kontrolovanými referenciami;
- trénovať samostatné modely pre text, značky, geometriu a hranu;
- pridať hmotnosť, priemer, hrúbku a analýzu kovu;
- vytvoriť testovaciu sadu s opotrebovanými mincami, falzifikátmi a zámerne
  zameniteľnými ročníkmi;
- merať najmä mieru falošného potvrdenia, nie iba priemernú úspešnosť;
- vzácne a drahé mince vždy poslať odborníkovi.

Žiadny obrazový systém nie je bez omylu na ľubovoľnej fotografii. Bezpečnosť
CoinPrintu spočíva v tom, že pri nedostatku dôkazov výsledok odmietne.

## Otvorené katalógy

Hromadný import povoľuje iba zdroje s potvrdenou otvorenou licenciou a
komerčným použitím. Každý záznam uchováva zdrojový identifikátor, pôvodnú URL,
licenciu a čas importu. Obrázky sa neposudzujú podľa licencie metadát; každý
obrázok musí mať vlastné povolenie na komerčné použitie. Záznam bez presného
variantu môže pomôcť určiť rodinu mince, ale nikdy neodomkne ocenenie.


## Mikroidentifikátory ako tvrdé brány

Od verzie 13.6 sa štátny znak, mincovná značka, značka autora/rytca,
mikrosymboly a hrana automaticky stávajú kritickými znakmi vždy, keď ich
analýza na fotografii zistí alebo ich definuje blízky katalógový kandidát.
Taký znak už nemožno ignorovať pri uzamknutí identity.

Pravidlo je fail-closed: chýbajúce nezávislé potvrdenie alebo rozpor v
kritickom mikroidentifikátore zablokuje stav VERIFIED aj ocenenie.


## Špecializovaný mikropriechod 13.7

Tretí primárny priechod analyzuje fotografiu od nuly a sústreďuje sa na
letopočet číslicu po číslici, názov krajiny písmeno po písmene, mincovné
značky, monogram autora, mikrosymboly, interpunkciu a ich polohu. Nečitateľný
znak musí zostať null; model ho nesmie doplniť podľa očakávaného typu mince.
Štvrtý priechod zostáva oponentský a pokúša sa výsledok vyvrátiť.
