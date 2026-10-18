const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const stamp=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const targetNames={"sam-prevent":"Prevent · specific first step","sam-teach":"Teach · communication prompt","sam-reinforce":"Reinforce · prompt response","sam-respond":"Respond · calm return"};
const url="https://vyiwwwmcoahwkgiictmc.supabase.co";
const key="sb_publishable_Mp2ASOgrx0Yx8Bp-Fz3AAg_V5Gl0I4W";
let client,all=[],chosen={};
const status=t=>$("status").textContent=t;
function paint(){
 const people=[...new Set(all.map(r=>r.observer_id))];
 $("selectors").innerHTML=people.map(id=>{
 const attempts=all.filter(r=>r.observer_id===id).sort((a,b)=>b.attempt-a.attempt);
 const selected=chosen[id]??attempts[0]?.id;
 return '<label>'+esc(attempts[0]?.observer_name??"Observer")+
 '<select data-observer="'+esc(id)+'">'+attempts.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?"selected":"")+'>Attempt '+esc(a.attempt)+' · '+esc(new Date(a.submitted_at).toLocaleString())+'</option>').join("")+'</select></label>';
 }).join("");
 $("selectors").querySelectorAll("select").forEach(el=>el.addEventListener("change",()=>{chosen[el.dataset.observer]=el.value;paint()}));
 const records=people.map(id=>all.find(r=>r.id===(chosen[id]??all.find(q=>q.observer_id===id)?.id))).filter(Boolean);
 $("results").hidden=!records.length;
 if(!records.length)return;
 const per=records.map(r=>{const yes=(r.interval_scores||[]).filter(v=>v==="occurred").length;const no=(r.interval_scores||[]).filter(v=>v==="did_not_occur").length;return {name:r.observer_name,yes,no,observed:yes+no}});
 const pairs=[];for(let a=0;a<records.length;a++)for(let b=a+1;b<records.length;b++){
 let agree=0,total=0;for(let i=0;i<20;i++){const x=records[a].interval_scores?.[i],y=records[b].interval_scores?.[i];if(!["occurred","did_not_occur"].includes(x)||!["occurred","did_not_occur"].includes(y))continue;total++;if(x===y)agree++;}
 pairs.push({a:records[a].observer_name,b:records[b].observer_name,agree,total});
 }
 const disputed=Array.from({length:20},(_,i)=>{const v=records.map(r=>r.interval_scores?.[i]).filter(x=>x==="occurred"||x==="did_not_occur");return v.length>=2&&new Set(v).size>1}).filter(Boolean).length;
 $("metrics").innerHTML='<div class="metric"><strong>'+records.length+'</strong>Observers submitted</div><div class="metric"><strong>'+disputed+'</strong>Disputed intervals</div>'+per.map(p=>'<div class="metric"><strong>'+p.yes+' / '+p.observed+'</strong>'+esc(p.name)+' · occurred / scorable</div>').join("")+pairs.map(p=>'<div class="metric"><strong>'+(p.total?Math.round(100*p.agree/p.total)+'%':'—')+'</strong>'+esc(p.a)+' vs '+esc(p.b)+' · '+p.agree+'/'+p.total+' agreements</div>').join("");
 const rows=Array.from({length:20},(_,i)=>{
 const values=records.map(r=>r.interval_scores?.[i]??null);
 const scorable=values.filter(x=>x==="occurred"||x==="did_not_occur");
 const mismatch=scorable.length>=2&&new Set(scorable).size>1;
 const cls=mismatch?' class="disagreement"':scorable.length<2?' class="unscorable"':'';
 return '<tr'+cls+'><td>'+stamp(i*15)+'–'+stamp(Math.min(292,(i+1)*15))+'</td>'+values.map(x=>'<td><span class="mark '+(x==="occurred"?"yes":x==="did_not_occur"?"no":"na")+'">'+(x==="occurred"?"Occurred":x==="did_not_occur"?"No":"Not observed")+'</span></td>').join("")+'</tr>';
 }).join("");
 $("intervals").innerHTML='<table class="compare"><thead><tr><th>Video time</th>'+records.map(r=>'<th>'+esc(r.observer_name)+'<br><small>Attempt '+esc(r.attempt)+'</small></th>').join("")+'</tr></thead><tbody>'+rows+'</tbody></table>';
 $("fidelity").innerHTML=Object.entries(targetNames).map(([id,title])=>'<h3>'+esc(title)+'</h3><div class="fidelity-grid">'+records.map(r=>{
 const events=(r.fidelity_opportunities||[]).filter(e=>e.target_id===id).sort((a,b)=>Number(a.elapsed_seconds)-Number(b.elapsed_seconds));
 return '<div class="person"><h3>'+esc(r.observer_name)+'</h3>'+(events.length?events.map(e=>'<div class="event"><b>+'+stamp(Number(e.elapsed_seconds)||0)+'</b>'+esc(e.implementation==="implemented"?"Implemented":"Not implemented")+' · Outcome: '+esc(e.implementation==="implemented"?(e.desired_outcome??"Not rated"):"N/A")+'</div>').join(""):'<div class="event">No opportunity recorded</div>')+'</div>';
 }).join("")+'</div>').join("");
}
async function refresh(){
 status("Loading saved Sam calibration attempts…");
 const {data,error}=await client.rpc("research_admin_sam_calibration_submissions");
 if(error){status("Unable to load: "+error.message);return;}
 all=(Array.isArray(data)?data:[]).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at));
 status(all.length?all.length+" saved attempts · "+new Set(all.map(x=>x.observer_id)).size+" observers":"No Sam calibration submissions yet");
 paint();
}
async function start(){
 if(!window.supabase){status("Authentication library unavailable. Reload the page.");return;}
 client=window.supabase.createClient(url,key);
 const {data:{session}}=await client.auth.getSession();
 if(!session){status("Sign in to Research Admin first, then return to this page.");return;}
 const {data:profile,error}=await client.from("profiles").select("role,active").eq("id",session.user.id).maybeSingle();
 if(error||profile?.role!=="research_admin"||profile?.active!==true){status("Research Admin authorization required.");return;}
 $("refresh").addEventListener("click",refresh);
 await refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();