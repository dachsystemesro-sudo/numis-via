import fs from 'node:fs';
import path from 'node:path';

// Bounded, read-only discovery. Never traverse links or dependency/backup trees.
export function discoverProjects(roots,{isCandidate,maxDepth=2,maxDirs=300}={}){
  const found=[],seen=new Set(),queue=roots.filter(Boolean).map(p=>[path.resolve(p),0]);let visited=0;
  while(queue.length&&visited++<maxDirs){
    const [dir,depth]=queue.shift();
    try{
      if(fs.lstatSync(dir).isSymbolicLink())continue;
      const key=fs.realpathSync.native(dir).toLowerCase();if(seen.has(key))continue;seen.add(key);
      if(isCandidate(dir)){found.push(dir);continue;}
      if(depth>=maxDepth)continue;
      for(const entry of fs.readdirSync(dir,{withFileTypes:true}))if(entry.isDirectory()&&!entry.isSymbolicLink()&&!/^(\.|node_modules$|code-backup-)/i.test(entry.name))queue.push([path.join(dir,entry.name),depth+1]);
    }catch{/* Inaccessible or changing folders are never repaired. */}
  }
  Object.defineProperty(found,'truncated',{value:queue.length>0});return found;
}
export function diagnosticBlockReason(diagnostic,{targetExists=false}={}){
  if(targetExists)return 'new_empty_vault_required';
  if(diagnostic?.windows_access!==true||diagnostic.platform!=='win32')return 'windows_required';
  if(diagnostic?.probe?.valid!==true)return diagnostic?.probe?.reason??'read_only_probe_unavailable';
  if(diagnostic.probe.language_mode!=='FullLanguage')return 'language_mode_blocked';
  if(diagnostic.probe.helper_exists!==true)return 'helper_missing';
  if(diagnostic.check?.helper_started!==true)return diagnostic.check?.reason??'helper_start_unverified';
  if(diagnostic.check.valid!==false)return 'private_target_preflight_unverified';
  // This exact expected missing-leaf error is reached AFTER NTFS, sync and
  // parent/reparse checks. A structured drive/ACL error is not sufficient.
  if(!/^parents_line_\d+_objectnotfound_itemnotfoundexception$/.test(diagnostic.check.reason??''))return diagnostic.check.reason??'private_target_preflight_unverified';
  return null;
}
export function remediationFor(code,probe={}){
  if(code.includes('script_security_block')){
    if(probe.effective_policy==='Restricted')return 'ExecutionPolicy je Restricted: systém odmieta súbory .ps1. Pomocník politiku nemení. Vyžaduje sa vaše osobitné schválenie a posúdenie správcom pre povolený spôsob spustenia. Bez toho sa príjem zastavil.';
    if(probe.effective_policy==='AllSigned')return 'Politika AllSigned vyžaduje dôveryhodný podpis helpera. Oprávnený správca musí posúdiť podpis a dôveru vydavateľa; tento pomocník nepodpisuje súbory ani nemení politiku.';
    if(probe.effective_policy==='RemoteSigned'&&['zone_3','zone_4','present'].includes(probe.zone_identifier))return 'RemoteSigned a internetová značka blokujú tento helper. Potrebné je osobitne schválené riešenie podpisu alebo iného povoleného postupu. Pomocník značku neodstraňuje, súbor neodblokuje a nepoužije Bypass.';
    return 'Windows bezpečnostne odmietol spustenie helpera. Príčina nie je dostatočne preukázaná samotným kódom chyby. Správca musí posúdiť uvedenú politiku, podpis a obmedzenia; nič sa automaticky nepovoľuje.';
  }
  if(code.includes('language_mode'))return 'PowerShell nemá FullLanguage potrebný na bezpečné vytvorenie nového súkromného archívu. Obmedzenie musí posúdiť správca. Pomocník ho neobchádza.';
  if(code.includes('helper_missing'))return 'V zvolenom projekte chýba scripts/private-intake-storage.ps1. Vyberte úplný projekt z PR #25 alebo #26. Helper sa automaticky neprepisuje ani neodblokuje.';
  if(/powershell_not_found|system_root|access_denied/.test(code))return 'Windows PowerShell 5.1 nie je dostupný alebo sa nedá bezpečne spustiť. Správca musí overiť jeho systémovú inštaláciu a prístup. Žiadne nastavenie Windows sa nezmenilo.';
  if(/project_|fix_|code_|bundle_/.test(code))return 'Projekt alebo balík nezodpovedá podporovaným zdrojom, je neúplný alebo má lokálne zmeny. Súbory sa nesmú nasilu prepísať. Vyberte pôvodný úplný projekt; neznáme úpravy vyžadujú kontrolu.';
  if(code.includes('dependency'))return 'Vyberte existujúci projekt NUMIS VIA, v ktorom už úspešne prebehlo npm.cmd ci so Sharp 0.35.5. Pomocník neinštaluje ani nemaže závislosti.';
  if(/duplicate/.test(code))return 'Dve fotografie majú rovnaké bajty alebo rovnaké dekódované pixely. Vyberte šesť rôznych snímok; chýbajúci pohľad treba pravdivo doplniť fotografovaním. Originály ostali zachované.';
  if(/photo|source_|six/.test(code))return 'Výber fotografií neprešiel kontrolou. Treba presne šesť miestnych JPG/JPEG/PNG/WebP bez odkazov/offline zástupcov, každú do 10 MiB a aspoň 512 × 512 px. Poškodený alebo zmenený súbor sa neprijme. Originály neupravujte.';
  if(/selection/.test(code))return 'Výber bol zrušený alebo sa nedá otvoriť dialóg. Nič netreba zadávať do PowerShellu. Spustite pomocníka znova bežným účtom a dokončite výber.';
  if(/drive_|path_|parents_|acl_|owner_|rules_|vault|private_|storage|localappdata/.test(code))return 'Súkromné úložisko nie je overené. Použitý môže byť iba nový miestny NTFS archív mimo synchronizácie a odkazov. Existujúce ACL nemeníme. Správca musí posúdiť presný kód; prípadné nové čiastočné súbory zostávajú zachované a nie sú prijatým importom.';
  return 'Príčina zostáva neoverená. Zachovajte tento sanitizovaný výpis pre technickú kontrolu. Nemeňte ExecutionPolicy, Defender ani oprávnenia a neposielajte fotografie alebo source-map.json na GitHub.';
}
