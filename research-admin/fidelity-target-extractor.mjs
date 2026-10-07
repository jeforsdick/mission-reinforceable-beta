const DOMAIN_ORDER = ['proactive','teaching','reinforcement','response','crisis'];

const DOMAIN_SOURCE_FIELDS = {
  proactive: ['prevention_strategies'],
  teaching: ['teaching_strategies'],
  reinforcement: ['reinforcement_system'],
  response: ['response_strategy'],
  crisis: ['crisis_plan']
};

const OBSERVABLE_VERBS = /\b(give|provide|show|post|display|use|offer|prompt|model|teach|practice|remind|praise|reinforce|award|deliver|redirect|remain|stay|contact|call|notify|ignore|wait|follow|allow|present|review|check|signal|tell|ask|point|gesture|guide|remove|reduce|break|pause|return)\b/i;
const VAGUE_ONLY = /^(?:prompt|reinforce|redirect|support|praise|remind|teach|model|ignore|wait|use visuals?|token board|premack(?: principle)?|behavior momentum)$/i;
const PHYSICAL_INTERVENTION = /\b(physical(?:ly)?|restraint|mandt|hold|block(?:ing)?|seclusion)\b/i;

function text(value){ return String(value || '').replace(/\s+/g,' ').trim(); }

function splitPlanText(value){
  const raw=String(value || '').replace(/\r/g,'').trim();
  if(!raw) return [];
  return raw
    .replace(/[•●▪◦]/g,'\n')
    .replace(/(^|\n)\s*\d+[.)]\s*/g,'\n')
    .split(/\n+|;+/)
    .flatMap(part => part.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map(text)
    .map(item => item.replace(/^[\-*–—]\s*/,'').replace(/[.!]+$/,'').trim())
    .filter(Boolean);
}

function stripStaffSubject(value){
  let s=text(value);
  s=s.replace(/^(?:the\s+)?teacher\s+(?:is\s+to\s+|will\s+|should\s+)?/i,'');
  s=s.replace(/^(?:the\s+)?BHA\s+(?:is\s+to\s+|will\s+|should\s+)?/i,'');
  s=s.replace(/^(?:the\s+)?staff\s+(?:is\s+to\s+|are\s+to\s+|will\s+|should\s+)?/i,'');
  if(!s) return '';
  return s.charAt(0).toUpperCase()+s.slice(1);
}

function normalizeObservable(value){
  let s=stripStaffSubject(value);
  s=s.replace(/^If\s+([^,]+),\s*(?:the\s+)?(?:teacher|BHA|staff)\s+(?:is\s+to\s+|will\s+|should\s+)?/i,'If $1, ');
  s=s.replace(/^When\s+([^,]+),\s*(?:the\s+)?(?:teacher|BHA|staff)\s+(?:is\s+to\s+|will\s+|should\s+)?/i,'When $1, ');
  s=s.replace(/^After\s+([^,]+),\s*(?:the\s+)?(?:teacher|BHA|staff)\s+(?:is\s+to\s+|will\s+|should\s+)?/i,'After $1, ');
  s=s.replace(/^(?:A |The )?visual schedule is posted in the classroom$/i,'Keep the visual schedule posted in the classroom');
  s=s.replace(/^Teacher gives class as a whole/i,'Give the class');
  s=s.replace(/^BHA prompts/i,'Prompt');
  s=s.replace(/^BHA will remind/i,'Remind');
  s=s.replace(/^BHA is to remain/i,'Remain');
  s=s.replace(/^BHA is to contact/i,'Contact');
  s=s.replace(/^Staff will not/i,'Do not');
  s=s.replace(/^Gives\b/i,'Give').replace(/^Prompts\b/i,'Prompt').replace(/^Models\b/i,'Model').replace(/^Reminds\b/i,'Remind').replace(/^Redirects\b/i,'Redirect').replace(/^Contacts\b/i,'Contact').replace(/^Provides\b/i,'Provide').replace(/^Uses\b/i,'Use').replace(/^Offers\b/i,'Offer');
  return text(s);
}

function candidateFromSentence(sentence, domain){
  const original=text(sentence);
  if(!original) return null;
  if(PHYSICAL_INTERVENTION.test(original) && !/do not physically engage/i.test(original)) {
    return { description: original, needs_review:true, review_note:'Physical/safety language requires manual review; do not operationalize vague procedures automatically.', include:false };
  }
  const normalized=normalizeObservable(original);
  const lower=normalized.toLowerCase();

  const hasStaffCue=/\b(teacher|bha|staff)\b/i.test(original);
  const startsConditional=/^(if|when|after|before|during)\b/i.test(normalized);
  const observable=OBSERVABLE_VERBS.test(normalized) || hasStaffCue || startsConditional;

  if(!observable) {
    if(domain==='reinforcement' && /\bgets? a star\b/i.test(original)) {
      return { description:'Give the student a star when the plan criterion is met', needs_review:true, review_note:'Confirm the exact reinforcement criterion from the BSP.', include:true };
    }
    return null;
  }

  if(VAGUE_ONLY.test(normalized)) {
    return { description: normalized, needs_review:true, review_note:'Too vague by itself; connect this action to the plan-specific behavior, timing, or criterion before approval.', include:true };
  }
  return { description:normalized, needs_review:false, review_note:'', include:true };
}

function replacementSummary(row){
  return text(row?.replacement_behavior);
}

function teachingConnections(row, explicitTeaching){
  const replacement=replacementSummary(row);
  if(!replacement) return [];
  const sources=[
    ...splitPlanText(row?.teaching_strategies),
    ...splitPlanText(row?.reinforcement_system)
  ];
  const results=[];
  for(const source of sources){
    const s=text(source);
    if(!s) continue;
    const mentionsPrompt=/\b(prompt|model|teach|practice|remind)\w*\b/i.test(s);
    const referencesBreak=/\bbreak\b/i.test(s) && /\bask|request|prompt\b/i.test(s);
    if(referencesBreak) {
      const c=candidateFromSentence(s,'teaching');
      if(c?.include) results.push(c);
      continue;
    }
    if(mentionsPrompt && explicitTeaching.some(item=>VAGUE_ONLY.test(item.description))) {
      const c=candidateFromSentence(s,'teaching');
      if(c?.include && !VAGUE_ONLY.test(c.description)) results.push(c);
    }
  }
  if(!results.length && explicitTeaching.some(item=>VAGUE_ONLY.test(item.description))) {
    results.push({
      description:`Teach or prompt the student to use the documented replacement behavior: ${replacement}`,
      needs_review:true,
      review_note:'This target is grounded in the documented replacement behavior, but the BSP does not specify enough teaching detail here. Confirm wording before approval.'
    });
  }
  return results;
}

function rawTargets(row,domain){
  const source=Array.isArray(row?.fidelity_targets)?row.fidelity_targets:[];
  return source
    .filter(item=>item && item.domain===domain && text(item.description))
    .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0))
    .map(item=>{
      const description=normalizeObservable(item.description);
      return {
        description,
        needs_review:VAGUE_ONLY.test(description),
        review_note:VAGUE_ONLY.test(description)?'Submitted plan step is too vague to score reliably without more context.':''
      };
    });
}

function fitsDomain(sentence,domain){
  const s=text(sentence).toLowerCase();
  if(domain==='proactive') return /visual|schedule|transition warning|warning|pre[- ]?correct|choice|first.?then|antecedent|before|environment|task smaller|offer|provide/.test(s);
  if(domain==='teaching') return /prompt|model|teach|practice|rehears|request|ask for|replacement|communicat|break card|calm/.test(s);
  if(domain==='reinforcement') return /reinfor|praise|token|star|reward|prize|menu|attention|preferred|earn|award/.test(s) && !(/prompt/.test(s) && /ask for|request|replacement|break/.test(s));
  if(domain==='response') return /redirect|remain|eyesight|ignore|respond|return|contact|call|follow|wait|de[- ]?escal|calm/.test(s);
  if(domain==='crisis') return /principal|authorit|safety|emergency|crisis|leave school property|off school property|parent/.test(s);
  return false;
}

function atomicSentences(sentence,domain){
  const s=text(sentence);
  if(domain==='reinforcement'){
    const shared=s.match(/^(.*?\b(?:staff|teacher|BHA)\s+give)\s+(.+?)\s+and\s+(specific praise|verbal praise|praise)$/i);
    if(shared) return [shared[1]+' '+shared[2],shared[1]+' '+shared[3]];
  }
  if(domain==='response'){
    const conditional=s.match(/^((?:When|If|After|Before|During)\s+.+?,\s*)(?:staff|teacher|BHA)\s+(.+)$/i);
    if(conditional){
      const actions=conditional[2].split(/\s+and\s+(?=(?:attempt|remain|stay|redirect|contact|call|notify|ignore|wait|return|follow)\b)/i);
      if(actions.length>1) return actions.map(action=>conditional[1]+'staff '+action);
    }
  }
  return [s];
}

function narrativeTargets(row,domain){
  const fields=DOMAIN_SOURCE_FIELDS[domain]||[];
  const out=[];
  for(const field of fields){
    for(const sentence of splitPlanText(row?.[field])){
      if(!fitsDomain(sentence,domain)) continue;
      for(const atomic of atomicSentences(sentence,domain)){
        const candidate=candidateFromSentence(atomic,domain);
        if(candidate?.include) out.push(candidate);
      }
    }
  }
  return out;
}

function canonical(value){
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}

function similar(a,b){
  const A=canonical(a),B=canonical(b);
  if(!A||!B) return false;
  if(A===B||A.includes(B)||B.includes(A)) return true;
  const aw=new Set(A.split(' ').filter(w=>w.length>3));
  const bw=new Set(B.split(' ').filter(w=>w.length>3));
  if(!aw.size||!bw.size) return false;
  const shared=[...aw].filter(w=>bw.has(w)).length;
  return shared/Math.min(aw.size,bw.size)>=0.75;
}

function wordStems(value){
  return canonical(value).split(' ').filter(w=>w.length>2).map(w=>w.replace(/(ing|ed|es|s)$/,''));
}
function shortCoveredByRicher(shortItem,items){
  const words=wordStems(shortItem.description);
  if(words.length>5) return false;
  return items.some(other=>{
    if(other===shortItem || text(other.description).length<=text(shortItem.description).length) return false;
    const otherWords=new Set(wordStems(other.description));
    const shared=words.filter(w=>otherWords.has(w)).length;
    return shared>=Math.min(2,words.length);
  });
}
function dedupe(items){
  const out=[];
  for(const item of items){
    if(!text(item.description)) continue;
    const existing=out.find(x=>similar(x.description,item.description));
    if(existing){
      if(existing.needs_review && !item.needs_review) Object.assign(existing,item);
      continue;
    }
    out.push({...item});
  }
  return out.filter(item=>!shortCoveredByRicher(item,out));
}

export function extractFidelityTargets(row={}){
  const byDomain={};
  for(const domain of DOMAIN_ORDER){
    const raw=rawTargets(row,domain);
    const narrative=narrativeTargets(row,domain);
    let items=[...raw,...narrative];
    if(domain==='teaching') items.push(...teachingConnections(row,raw));
    if(domain==='crisis' && row.has_crisis_plan!==true) items=[];
    items=dedupe(items);

    // Do not preserve a vague shorthand when richer plan-grounded wording exists.
    if(items.some(item=>!item.needs_review)){
      items=items.filter(item=>!VAGUE_ONLY.test(item.description) || !items.some(other=>other!==item && !other.needs_review));
    }

    byDomain[domain]=items.map((item,index)=>({
      domain,
      sort_order:index+1,
      target_key:`${domain}_${String(index+1).padStart(2,'0')}`,
      description:item.description,
      needs_review:item.needs_review===true,
      review_note:item.review_note||''
    }));
  }
  return DOMAIN_ORDER.flatMap(domain=>byDomain[domain]);
}

export function extractionSummary(targets=[]){
  const rows=Array.isArray(targets)?targets:[];
  return {
    total:rows.length,
    needs_review:rows.filter(item=>item.needs_review).length,
    by_domain:Object.fromEntries(DOMAIN_ORDER.map(domain=>[domain,rows.filter(item=>item.domain===domain).length]))
  };
}
