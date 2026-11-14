import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const AUDIT_FIELDS=['country_code','country_text','denomination','date','main_motif','coat_of_arms','mint_mark','engraver_mark','micro_symbols','geometry','material','designer_name','finish','physical.mass_g','physical.diameter_mm','physical.thickness_mm','edge'];
const TARGETS=[1,2,5].flatMap(n=>[2019,2020,2021].map(y=>`SK-EUR-${String(n).padStart(3,'0')}-${y}-PILOT`));
const EXTRA_URLS={
  'mint-2020':'https://www.mint.sk/index.php/emisny-plan-mincovne-2020',
  'mint-2021':'https://www.mint.sk/emisny-plan-mincovne-2021',
  'ec-legislation':'https://economy-finance.ec.europa.eu/euro/euro-coins-and-notes/euro-coins/legislation-euro-coins_en',
  'eurlex-specification':'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?from=EN&uri=CELEX%3A32014R0729',
  'eurlex-reproduction':'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52011XC0210%2802%29'
};
const RIGHTS={metadata:'pending_application_review',source_images:'not_used_clearance_pending',user_photographs:'not_collected'};
const BLOCKERS=['independent_specimen_lineage_missing','raw_source_snapshots_missing','country_year_mark_geometry_lookalikes_unresolved','circulation_vs_set_finish_unresolved','expert_and_rights_review_missing'];
const text=v=>typeof v==='string'&&v.trim().length>0;
const at=(r,p)=>p.split('.').reduce((v,k)=>v?.[k],r)??null;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const day=v=>text(v)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;

// This is an audit of gaps, never an alternate source of production references.
// A general design, nominal standard or population count is not specimen proof.
export function contextLineages(ids,notes){
  return [...new Set(ids.map(id=>notes.observations.find(o=>o.id===id)).filter(Boolean).map(o=>notes.sources.find(s=>s.id===o.source_id)?.lineage_group).filter(Boolean))].sort();
}

export function validateEvidenceAudit(audit,{pilot,registry,notes,notesRaw}){
  const errors=[];
  if(audit?.schema_version!=='1.0'||audit?.issue!==19||audit?.base_pr!==18||!/^[a-f0-9]{40}$/.test(audit?.base_sha??'')||!day(audit?.checked_at))errors.push('audit_metadata');
  if(audit?.no_promotion!==true||audit?.production_loaded!==false||audit?.ready_for_physical_pilot!==false)errors.push('promotion_forbidden');
  if(pilot?.production_loaded!==false||pilot?.records?.some(r=>r.verification_state!=='needs_reference_review'))errors.push('pilot_not_pending');
  if(notes?.schema_version!=='1.0'||notes?.checked_at!==audit?.checked_at||notes?.original_source_bytes_retained!==false)errors.push('notes_metadata');
  if(audit?.observation_notes?.path!=='data/pilot/evidence-audit/observations-2026-11-12.json'||!text(audit?.observation_notes?.hash_scope)||!notesRaw||audit?.observation_notes?.sha256!==hash(notesRaw))errors.push('audit_notes_hash');
  const sources=Array.isArray(notes?.sources)?notes.sources:[];
  const observations=Array.isArray(notes?.observations)?notes.observations:[];
  const sourceIDs=new Set(),observationIDs=new Set();
  for(const s of sources){
    if(!text(s?.id)||sourceIDs.has(s.id))errors.push('duplicate_source');sourceIDs.add(s?.id);
    const registered=registry?.sources?.find(r=>r.id===s?.id);
    const urls=registered?.urls??(EXTRA_URLS[s?.id]?[EXTRA_URLS[s.id]]:[]);
    if(!urls.includes(s?.url))errors.push('source_url:'+s?.id);
    const group=registered?.independence_group??(s?.id?.startsWith('mint-')?'issuer-mint-set-context':'official-euro-specification');
    if(s?.lineage_group!==group||s?.independence_status!=='not_established'||!text(s?.lineage_basis))errors.push('lineage_not_established:'+s?.id);
    if(s?.checked_at!==audit?.checked_at||!['web_text_reviewed','blocked_challenge'].includes(s?.access)||!text(s?.access_note))errors.push('source_access:'+s?.id);
    if(s?.direct_http?.checked_at!==audit?.checked_at||s.direct_http.exit_code!==56||s.direct_http.http_status!=='000'||s.direct_http.proxy_connect_status!==403)errors.push('direct_access_record:'+s?.id);
    if(s?.production_evidence!==false)errors.push('descriptive_source_promoted:'+s?.id);
    if(s?.source_snapshot?.status!=='not_captured'||s?.source_snapshot?.sha256!==null||!text(s?.source_snapshot?.reason))errors.push('invented_source_snapshot:'+s?.id);
    if(!s?.terms||!['pending_application_review','unverified'].includes(s.terms.metadata_status)||s.terms.source_images_status!==RIGHTS.source_images||s.terms.user_photographs_status!==RIGHTS.user_photographs||!text(s.terms.observed_conditions))errors.push('source_rights:'+s?.id);
    if(s?.terms?.url!==null&&!/^https:\/\//.test(s?.terms?.url??''))errors.push('terms_url:'+s?.id);
    const expectedTerms=s?.id?.startsWith('nbs-')?'https://nbs.sk/en/disclaimer_en/':s?.id?.startsWith('ecb-')?'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html':null;
    if(s?.terms?.url!==expectedTerms)errors.push('unreviewed_terms_url:'+s?.id);
  }
  if(sources.length!==9||[...(registry?.sources??[]).map(s=>s.id),...Object.keys(EXTRA_URLS)].some(id=>!sourceIDs.has(id)))errors.push('source_inventory');
  for(const o of observations){
    if(!text(o?.id)||observationIDs.has(o.id))errors.push('duplicate_observation');observationIDs.add(o?.id);
    const source=sources.find(s=>s.id===o?.source_id);
    if(!source||source.access!=='web_text_reviewed'||o?.source_url!==source.url)errors.push('observation_source:'+o?.id);
    if(!['general_design','nominal_specification','issue_population','set_context','legal_pointer'].includes(o?.scope)||!text(o?.locator)||!text(o?.limitations)||!o?.values||typeof o.values!=='object')errors.push('observation_scope:'+o?.id);
    if(!Array.isArray(o?.fields)||o.fields.some(f=>!AUDIT_FIELDS.includes(f)||!Object.hasOwn(o.values,f)))errors.push('observation_fields:'+o?.id);
    if(!o?.applies_to||Object.keys(o.applies_to).some(k=>!['date','denomination'].includes(k)))errors.push('observation_applicability:'+o?.id);
    if(o?.applies_to&&Object.entries(o.applies_to).some(([key,value])=>Object.hasOwn(o?.values??{},key)&&o.values[key]!==value))errors.push('observation_value_mismatch:'+o?.id);
  }
  const rows=Array.isArray(audit?.variants)?audit.variants:[];
  const rowIDs=rows.map(r=>r?.catalogue_id);
  if(rows.length!==9||new Set(rowIDs).size!==9||TARGETS.some(id=>!rowIDs.includes(id)))errors.push('nine_exact_variants_required');
  for(const v of rows){
    const candidate=pilot?.records?.find(r=>r.catalogue_id===v?.catalogue_id);
    if(!candidate||v?.verification_state!=='needs_reference_review'||v?.assessment!=='unverified'||!Array.isArray(v?.independently_corroborated_fields)||v.independently_corroborated_fields.length)errors.push('variant_promoted:'+v?.catalogue_id);
    if(!same(v?.rights,RIGHTS)||v?.expert_review?.status!=='pending'||v.expert_review.reviewed_by!==null||v.expert_review.reviewed_at!==null)errors.push('invented_approval:'+v?.catalogue_id);
    if(!Array.isArray(v?.unresolved_blockers)||BLOCKERS.some(b=>!v.unresolved_blockers.includes(b)))errors.push('missing_blocker:'+v?.catalogue_id);
    if(!v?.fields||Object.keys(v.fields).length!==AUDIT_FIELDS.length||AUDIT_FIELDS.some(f=>!Object.hasOwn(v.fields,f)))errors.push('field_coverage:'+v?.catalogue_id);
    for(const field of AUDIT_FIELDS){
      const cell=v?.fields?.[field];
      if(!cell||cell.exact_variant_status!=='unverified'||!same(cell.asserted_value,at(candidate,field))||!text(cell.gap)||!Array.isArray(cell.observations)){
        errors.push('invalid_cell:'+v?.catalogue_id+':'+field);continue;
      }
      if(new Set(cell.observations).size!==cell.observations.length)errors.push('duplicate_cell_observation:'+v.catalogue_id+':'+field);
      for(const id of cell.observations){
        const o=observations.find(o=>o.id===id);
        if(!o||!o.fields.includes(field)||Object.entries(o.applies_to).some(([key,value])=>candidate?.[key]!==value))errors.push('wrong_cell_observation:'+v.catalogue_id+':'+field);
      }
    }
  }
  return {valid:errors.length===0,errors:[...new Set(errors)],variants:rows.length,fields_per_variant:AUDIT_FIELDS.length,independently_corroborated_exact_fields:0,production_promotions:0,ready_for_physical_pilot:false};
}

const escape=v=>String(v??'—').replaceAll('|','\\|').replaceAll('\n',' ');
export function renderEvidenceMatrix(audit,notes){
  const lines=[
    '# Issue #19 – matica chýbajúcich referenčných dôkazov',
    '',`Dátum kontroly: ${audit.checked_at}. Základ: PR #18, commit \`${audit.base_sha}\`.`,
    '', '**0/9 overených variantov. NOT READY FOR PHYSICAL PILOT.** Všetkých 153 buniek zostáva neoverených pre konkrétny exemplár. Pozorované všeobecné tvrdenie nie je schválená referencia.',
    '', 'Tento dokument sa generuje príkazom `node scripts/audit-reference-evidence.mjs --write`. `--check` overí dáta aj zhodu dokumentu. Audit nemení produkčné referencie, kvórum ani CoinPrint.',
    '', '## Deväť variantov',
    '', '| Variant | Emisný kontext NBS, mil. ks | Kontext dizajnu | Nominálne parametre | Značky / geometria / exemplár | Nezávisle potvrdené presné polia | Práva a expert |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];
  for(const v of audit.variants){
    const year=v.fields.date.observations.map(id=>notes.observations.find(o=>o.id===id)).find(o=>o?.values?.quantity_millions_as_displayed);
    lines.push(`| ${v.catalogue_id} | ${escape(year?.values?.quantity_millions_as_displayed)}; iba populácia vrátane súborov | NBS + ECB = 1 konzervatívna línia | ECB; iba nominál | UNVERIFIED | 0 | metadata pending; source images nepoužité; user photos nezískané; expert pending |`);
  }
  lines.push('', '## Zdrojové pozorovania, pôvod a práva', '', 'Zhodný dizajn na NBS a ECB nie je nezávislý výskum dvoch exemplárov. Nezistil sa pôvod umožňujúci ich počítať oddelene; ide o konzervatívne zoskupenie, nie dokázané kopírovanie. Mincovňa je osobitný vydavateľ, no samostatná línia dôkazu presného exemplára sa nepreukázala. Štandard a odkaz na jeho predpis nenahrádzajú nezávislé meranie.', '', 'Presné URL, lokátory, pozorované hodnoty a rozsah sú v [observation notes](../../data/pilot/evidence-audit/observations-2026-11-12.json). Podrobné bunky sú v [gap data](../../data/pilot/evidence-audit/gaps-2026-11-12.json).');
  for(const s of notes.sources){
    lines.push('', `### ${s.id}`, '', `- Originál: [${s.id}](${s.url}); kontrola ${s.checked_at}; prístup \`${s.access}\`.`, `- Pôvod: \`${s.lineage_group}\`; nezávislosť pre presný exemplár nepreukázaná. ${s.lineage_basis}`, `- Originálna snímka: **nezachytená**, SHA-256 = null. ${s.source_snapshot.reason}`, `- Práva na metadáta: \`${s.terms.metadata_status}\`. ${s.terms.observed_conditions}`, `- Podmienky: ${s.terms.url?`[presná stránka](${s.terms.url}) – ${s.terms.locator}`:'neoverené; treba presný text a aplikačné posúdenie'}. Zdrojové obrázky sa nepreberajú do projektu; práva používateľských fotografií sa tým nezískavajú.`);
  }
  lines.push('', '## Hash a technické obmedzenia', '', `SHA-256 \`${audit.observation_notes.sha256}\` sa vzťahuje výhradne na naše uložené parafrázované poznámky. **Nie je to hash stránky NBS, ECB ani mincovne** a nepreukazuje pravdivosť obsahu. Originálne HTTP bajty neboli dostupné. Priamy NBS request z prostredia skončil proxy CONNECT 403 / HTTP 000; text bol čítaný cez webovú službu. EUR-Lex vrátil JavaScript/anti-robot výzvu, nie právne predpisy.`, '', 'NBS: potrebná atribúcia, zachovanie zdrojových súborov a kontrola správnosti pre komerčné použitie; reprodukcie mincí majú osobitné podmienky. ECB: treba posúdiť atribúciu, presnosť, informovanie o bezplatnom pôvode pri predaji dokumentov a výnimky. Ide o zistené podmienky, nie právne schválenie produktu. Pri eurových obrázkoch zostávajú otvorené národné a spoločné strany aj pravidlá reprodukcie. V projekte nie sú zdrojové obrázky ani nové používateľské fotografie.', '', '## Každý variant a každé pole', '', 'Každá bunka nižšie má stav **UNVERIFIED** pre presný exemplár. Identifikátory v stĺpci Kontext odkazujú na lokátory v observation notes. „0“ nezávislých presných polí sa nesmie zameniť za počet webov.');
  for(const v of audit.variants){
    lines.push('', `### ${v.catalogue_id}`, '', '| Pole | Navrhnutá hodnota (nie schválenie) | Kontext | Chýbajúci dôkaz |', '| --- | --- | --- | --- |');
    for(const field of AUDIT_FIELDS){const c=v.fields[field];lines.push(`| ${field} | ${escape(c.asserted_value)} | ${c.observations.map(escape).join(', ')||'unverified / žiadny pozorovaný podklad'} | ${escape(c.gap)} |`);}
    lines.push('', 'Odborné review: nezískané. Treba identifikovaný nezávislý exemplár, makrofotografie s právami, presný prepis a polohy znakov, kalibrované merania s neistotou, rozlíšenie obežnej a súborovej úpravy a nezávislé potvrdenie každého rozhodujúceho poľa. Zámeny krajiny, roku, značky, úpravy a poškodenia zostávajú blokátormi.');
  }
  lines.push('', '## Výsledok a ďalší krok', '', 'Nezávisle potvrdené presné polia: **0**; povýšenia: **0**; pripravenosť fyzického pilotu: **false**. Získané sú iba oficiálne opisné, nominálne a emisné kontexty. Hmotnosť či zloženie zo všeobecnej tabuľky nie sú výsledkom merania konkrétnej mince. Materiál copper-covered steel opisuje kompozit, nie doložené percentá zliatiny.', '', 'Pred povýšením treba legálne zachytiť originálne podklady s hashom, doložiť dve skutočne nezávislé línie na konkrétne tvrdenia, odborné posúdenie a samostatné práva na metadáta, zdrojové obrázky aj fotografie exemplárov. Issue #20 zostáva samostatnou nasledujúcou úlohou.', '');
  return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const root=new URL('../',import.meta.url);
  const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
  const audit=read('data/pilot/evidence-audit/gaps-2026-11-12.json');
  const notesRaw=fs.readFileSync(new URL(audit.observation_notes.path,root));
  const notes=JSON.parse(notesRaw);
  const report=validateEvidenceAudit(audit,{pilot:read('data/pilot/sk-eurocents.json'),registry:read('data/pilot/sources.json'),notes,notesRaw});
  if(report.valid){
    const output=new URL('docs/evidence-audit/ISSUE_19_MATRIX.md',root),expected=renderEvidenceMatrix(audit,notes);
    if(process.argv.includes('--write'))fs.writeFileSync(output,expected);
    else if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==expected){report.valid=false;report.errors.push('matrix_out_of_date');}
  }
  console.log(JSON.stringify(report,null,2));
  if(!report.valid)process.exitCode=1;
}
