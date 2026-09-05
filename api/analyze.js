const norm=v=>{let n=Number(v);if(!Number.isFinite(n))return 0;if(n>=0&&n<=1)n*=100;return Math.max(0,Math.min(100,n))};
const nobj=o=>({...o,confidence:norm(o?.confidence)});
function val(v){return String(v??'').trim()}

function sideRole(obs){
  let s={
    first:{one:0,two:0,euro:0,map:0,ring:0},
    second:{one:0,two:0,euro:0,map:0,ring:0}
  };

  for(const o of obs){
    let side=o.side==='second'?'second':'first',
        f=(o.feature+' '+o.value).toLowerCase(),
        c=norm(o.confidence);

    if(/(?:^|\s)(?:1|one)(?:\s|$)|digit.?1|číslic.?1|numeral.?1/.test(f))
      s[side].one=Math.max(s[side].one,c);

    if(/(?:^|\s)(?:2|two)(?:\s|$)|digit.?2|číslic.?2|numeral.?2/.test(f))
      s[side].two=Math.max(s[side].two,c);

    if(/euro/.test(f))
      s[side].euro=Math.max(s[side].euro,c);

    if(/map|európ|europe/.test(f))
      s[side].map=Math.max(s[side].map,c);

    if(/ring|disc|prsten|stred/.test(f))
      s[side].ring=Math.max(s[side].ring,c);
  }

  let score=(x,d)=>Math.min(
    100,
    ((d===2?x.two:x.one)>=80?40:0)+
    (x.euro>=75?25:0)+
    (x.map>=70?20:0)+
    ((((d===2?x.two:x.one)>=70&&x.euro>=60)||
      ((d===2?x.two:x.one)>=70&&x.map>=60))?15:0)
  );

  let cand=[];

  for(const side of ['first','second'])
    for(const d of [1,2])
      cand.push({side,d,score:score(s[side],d)});

  cand.sort((a,b)=>b.score-a.score);

  let best=cand[0];

  if(best.score>=80)
    return {
      common:best.side,
      national:best.side==='first'?'second':'first',
      score:best.score,
      denomination:best.d
    };

  return {
    common:null,
    national:null,
    score:best.score,
    denomination:null
  };
}

function yearFrom(obs,national){
  if(!national)return null;

  let ys=obs
    .filter(o=>
      o.side===national &&
      /year|rok/.test((o.feature||'').toLowerCase()) &&
      /^\d{4}$/.test(val(o.value))
    )
    .sort((a,b)=>b.confidence-a.confidence);

  return ys[0]&&ys[0].confidence>=95?ys[0]:null;
}

export default async function handler(req,res){

  if(req.method!=='POST')
    return res.status(405).json({error:'Method not allowed'});

  let images=req.body?.images;

  if(!Array.isArray(images)||images.length!==2)
    return res.status(400).json({
      error:'Potrebné sú presne dve fotografie.'
    });

  let prompt=`You are the visual evidence layer of NUMIS VIA. Analyze TWO photos of the same coin together. Image 1=first side, image 2=second side. Return strict JSON only: {"observations":[{"side":"first|second","feature":"...","value":"...","confidence":0-100}],"issue_candidates":[{"label":"...","country":"Neurčené or concrete country","denomination":"...","year":"...","confidence":0-100,"reason":"...","discriminating_evidence":["..."]}],"next_needed":"..."}. Rules: report only visible evidence. Relief is not text. Color is not chemical composition. Never invent unreadable text/year. Never infer a concrete country merely because it is possible. If no country-specific motif/text/monogram combination is visibly discriminating, country MUST be Neurčené. A euro common side is structurally indicated by large denomination numeral + EURO + Europe map. Issue year belongs to the national side, not the euro common side; if a supposed year appears on a side structurally matching the common side, treat it as conflict/OCR error. 12 stars alone do not determine side role. Max 3 issue candidates. Do not confuse 1 euro with 2 euro: report the dominant denomination digit exactly as visible; use EURO and Europe-map evidence only as support. Confidence may be 0..100.`;

  let body={
    model:'openai/gpt-5.4-nano',
    messages:[{
      role:'user',
      content:[
        {type:'text',text:prompt},
        {type:'image_url',image_url:{url:images[0]}},
        {type:'image_url',image_url:{url:images[1]}}
      ]
    }],
    response_format:{type:'json_object'},
    temperature:0.1
  };

  let rr,txt;

  for(let i=0;i<3;i++){
    rr=await fetch(
      'https://ai-gateway.vercel.sh/v1/chat/completions',
      {
        method:'POST',
        headers:{
          Authorization:`Bearer ${process.env.AI_GATEWAY_API_KEY}`,
          'content-type':'application/json'
        },
        body:JSON.stringify(body)
      }
    );

    if(rr.status!==429)break;

    await new Promise(r=>
      setTimeout(r,900*Math.pow(2,i))
    );
  }

  if(!rr?.ok)
    return res.status(rr?.status||500).json({
      error:rr?.status===429
        ?'AI služba je dočasne vyťažená. Skús analýzu o chvíľu znova.'
        :'AI analýza zlyhala.'
    });

  let raw=await rr.json();

  try{
    txt=raw.choices[0].message.content;

    let ai=JSON.parse(txt);

    let observations=(ai.observations||[]).map(nobj);

    let roles=sideRole(observations);

    let family=roles.score>=80
      ?{
        label:`${roles.denomination} € — eurová obehová minca`,
        confidence:roles.score,
        reason:`Strana ${roles.common==='first'?'1':'2'} zodpovedá spoločnej eurovej strane podľa kombinácie nominálu, EURO a mapy Európy.`
      }
      :{
        label:'Rodina zatiaľ neurčená',
        confidence:roles.score,
        reason:'Vizuálne znaky ešte nestačia na bezpečné potvrdenie rodiny.'
      };

    let issues=(ai.issue_candidates||[])
      .map(nobj)
      .filter(x=>{
        if(!x.country||x.country==='Neurčené')
          return true;

        return Array.isArray(x.discriminating_evidence) &&
          x.discriminating_evidence.length>0 &&
          x.confidence>=80;
      });

    if(!issues.length&&roles.score>=80)
      issues=[{
        label:`${roles.denomination} € — eurová minca, krajina neurčená`,
        country:'Neurčené',
        denomination:`${roles.denomination} €`,
        year:'Neurčené',
        confidence:roles.score,
        reason:'Rodina je podopretá spoločnou stranou; národná strana zatiaľ nemá dostatočne diskriminačný znak.'
      }];

    let y=yearFrom(observations,roles.national);

    let confirmed={
      Krajina:{
        value:'Neurčené',
        confidence:0,
        why:'Bez diskriminačného znaku národnej strany.'
      },

      Nominál:{
        value:roles.score>=80
          ?`${roles.denomination} €`
          :'Neurčené',
        confidence:roles.score>=80?roles.score:0,
        side:roles.common||'',
        why:roles.score>=80
          ?'Potvrdené štruktúrou spoločnej eurovej strany.'
          :'Nedostatok dôkazov.'
      },

      Rok:{
        value:y?y.value:'Neurčené',
        confidence:y?y.confidence:0,
        side:y?roles.national:'',
        why:y
          ?'Čitateľný iba na strane klasifikovanej ako národná.'
          :'Rok sa nepotvrdzuje zo spoločnej eurovej strany.'
      },

      'Základný typ':{
        value:roles.score>=80
          ?'eurová obehová minca'
          :'Neurčené',
        confidence:roles.score>=80?roles.score:0,
        side:roles.common||'',
        why:roles.score>=80
          ?'Deterministicky potvrdená rodina mince.'
          :'Nedostatok dôkazov.'
      }
    };

    return res.status(200).json({
      observations,
      family,
      roles,
      issue_candidates:issues,
      confirmed,
      next_needed:ai.next_needed||
        'Ostrejší detail národnej strany.'
    });

  }catch(e){
    return res.status(500).json({
      error:'AI vrátila neplatný formát.'
    });
  }
}
