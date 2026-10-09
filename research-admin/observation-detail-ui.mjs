// Research Admin read-only full observation report: HTML escaping is required for stored values.
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pct = value => value == null ? '—' : Number(value).toFixed(2).replace(/\\.?0+$/, '') + '%';
const clock = value => { const n=Math.max(0,Math.floor(Number(value)||0)); return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'); };
const stamp = value => { const d=new Date(value);return !value||Number.isNaN(d.getTime())?'—':d.toLocaleString('en-US',{timeZone:'America/Denver',dateStyle:'medium',timeStyle:'short'}); };
const dateLabel = value => {const d=new Date(value+'T12:00:00Z');return Number.isNaN(d.getTime())?value:d.toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}); };
const timeLabel = value => {if(!value)return '—';const [h,m]=value.split(':').map(Number);return (h%12||12)+':'+String(m).padStart(2,'0')+(h<12?' AM':' PM');};
const words = value => String(value??'').replaceAll('_',' ').replace(/\\b\\w/g,ch=>ch.toUpperCase());
const intervalLabel = v => v==='occurred'?'Occurred':v==='did_not_occur'?'Did not occur':v==='not_observed'?'Not observable':'Missing';
const intervalClass = v => v==='occurred'?'occurred':v==='did_not_occur'?'absent':v==='not_observed'?'unobservable':'missing';
const countIntervals = r => {
  const a=Array.isArray(r?.interval_scores)?r.interval_scores:[];
  const totals={occurred:0,absent:0,unobservable:0,missing:0};
  for(const v of a){if(v==='occurred')totals.occurred++;else if(v==='did_not_occur')totals.absent++;else if(v==='not_observed')totals.unobservable++;else totals.missing++;}
  totals.missing+=Math.max(0,(Number(r?.interval_count)||a.length)-a.length);
  totals.observable=totals.occurred+totals.absent;
  return totals;
};

export {esc,pct,clock,stamp,dateLabel,timeLabel,words,intervalLabel,intervalClass,countIntervals};
