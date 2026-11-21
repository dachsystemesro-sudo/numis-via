import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {native,buildNative} from './collection-storage.mjs';
import {initCollection,openCollection,addPhotos,reviseCoin,saveIndex,collectionIndex,readCoin} from './private-collection.mjs';
const flags={identity:null,valuation_allowed:false};
export async function runAssistant(args){
 if(process.platform!=='win32')throw Error('windows_ui_required');
 const {values}=parseArgs({args,options:{root:{type:'string'},'init-only':{type:'boolean'}}});
 const root=values.root??path.join(process.env.LOCALAPPDATA,'NUMIS-VIA-PrivateCollection');
 buildNative();if(!fs.existsSync(root))initCollection(root);else openCollection(root);
 if(values['init-only']){const result=saveIndex(root);console.log(JSON.stringify({created_or_verified:true,counts:result.index.counts,...flags}));return;}
 while(true){
  const index=collectionIndex(root),n=index.counts,summary='Mince: '+n.archived+' | Predbezne: '+n.provisional_identity+' | Na reviziu pasu: '+n.ready_for_pass_review+' | Potvrdene: '+n.confirmed_identity+' | Rozpracovane: '+n.incomplete;
  const coins=index.coins.map(c=>{const {card}=readCoin(root,c.coin_id,{verifyAssets:false});return {...c,notes:card.notes,identity_proposal:card.identity_proposal};});
  const action=native('collection-menu',null,{input:JSON.stringify({summary,coins}),dialog:true});
  if(action.action==='exit')return;
  try{
   if(action.action==='add'||action.action==='photos'){
    const files=native('select-photos',null,{dialog:true});
    const result=await addPhotos(root,files,{coin_id:action.action==='photos'?action.coin_id:null});
    console.log(JSON.stringify(result));saveIndex(root);
   }else if(action.action==='proposal'){
    const proposal=Object.fromEntries(['country','denomination','year'].filter(k=>action[k]?.trim()).map(k=>[k,action[k].trim()]));
    reviseCoin(root,action.coin_id,{title:action.title,notes:action.notes,identity_proposal:Object.keys(proposal).length?proposal:null});saveIndex(root);
   }else if(action.action==='index'){
    const view=saveIndex(root);spawnSync(path.join(process.env.SystemRoot,'explorer.exe'),[path.join(root,view.html_file)],{windowsHide:false});
   }else throw Error('ui_action_invalid');
  }catch(error){
   const code=/^[a-z_]+$/.test(error.message)?error.message:'collection_action_failed';
   console.log(JSON.stringify({valid:false,error:code,automatic_cleanup:false,...flags}));
   // Selection cancellation is a normal return to the dashboard. Any other
   // unexpected/storage/integrity failure stops rather than weakening checks.
   if(code!=='selection_cancelled')throw error;
  }
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await runAssistant(process.argv.slice(2));}catch(e){console.log(JSON.stringify({valid:false,error:/^[a-z_]+$/.test(e.message)?e.message:'collection_assistant_failed',automatic_cleanup:false,...flags}));process.exitCode=1;}}
