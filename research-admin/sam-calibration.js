const root=document.getElementById("sam-calibration-dashboard");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function render(){
 const client=window.__mrResearchAdminClient;
 if(!client||!root)return;
 root.textContent="Loading calibration submissions…";
 const {data,error}=await client.rpc("research_admin_sam_calibration_submissions");
 if(error){root.textContent="Could not load: "+error.message;return;}
 const rows=Array.isArray(data)?data:[];
 if(!rows.length){root.innerHTML="<p>No Sam calibration submissions yet. Observers can submit from Practice Observation after viewing the 4:52 video.</p>";return;}
 const latest=new Map();for(const a of rows)if(!latest.has(a.observer_id))latest.set(a.observer_id,a);
 const chosen=[...latest.values()];
 const intervalRows=Array.from({length:20},(_,i)=>{
   const cols=chosen.map(s=>s.interval_scores?.[i]||"—");
   const observed=cols.filter(s=>s==="occurred"||s==="did_not_occur");
   const discrepancy=observed.length>1&&new Set(observed).size>1;
   const start=i*15,end=Math.min(292,(i+1)*15);
   const stamp=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
   return "<tr"+(discrepancy?' style="background:rgba(255,200,80,.2)"':"")+"><td>"+stamp(start)+"–"+stamp(end)+"</td>"+cols.map(s=>"<td>"+esc(s==="occurred"?"Occurred":s==="did_not_occur"?"No occurrence":s==="not_observed"?"Not observed":s)+"</td>").join("")+"</tr>";
 }).join("");
 root.innerHTML='<p>Saved practice submissions: '+rows.length+' · Latest attempt per observer: '+chosen.length+'. Yellow intervals indicate disagreement; practice data never enters dissertation outcomes.</p>'+
 '<button id="sam-refresh" type="button">Refresh submissions</button>'+
 '<div style="overflow-x:auto"><table><thead><tr><th>Interval</th>'+chosen.map(s=>"<th>"+esc(s.observer_name)+" (attempt "+esc(s.attempt)+")</th>").join("")+"</tr></thead><tbody>"+intervalRows+"</tbody></table></div>"+
 '<h3>Fidelity opportunities</h3>'+chosen.map(s=>'<details><summary>'+esc(s.observer_name)+' · attempt '+esc(s.attempt)+' · '+(s.fidelity_opportunities||[]).length+' opportunities</summary><ul>'+(s.fidelity_opportunities||[]).map(o=>'<li>'+esc(o.target_id)+' · '+esc(o.elapsed_seconds)+' sec · '+esc(o.implementation)+' · outcome '+esc(o.desired_outcome)+'</li>').join("")+'</ul></details>').join("");
 root.querySelector("#sam-refresh")?.addEventListener("click",render);
}
window.addEventListener("mr-research-admin-ready",render);
setTimeout(render,1200);
